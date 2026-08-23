import { createFileRoute } from "@tanstack/react-router";
import crypto from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { withTransaction } from "@/lib/mysql.server";
import { uuid } from "@/lib/db-utils.server";

type ResendReceivedEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    message_id?: string;
    attachments?: unknown[];
  };
};

type ReceivedEmail = {
  id?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string[];
  subject?: string;
  text?: string;
  html?: string;
  message_id?: string;
  attachments?: unknown[];
};

function parseMailbox(value: string) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  return {
    name: (match?.[1] || "").replace(/^"|"$/g, "").trim() || null,
    email: (match?.[2] || raw).trim().toLowerCase(),
  };
}

function htmlToText(html: string) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeSubject(subject: string) {
  let value = String(subject || "Incoming email").trim() || "Incoming email";
  while (/^\s*(re|fw|fwd):\s*/i.test(value)) value = value.replace(/^\s*(re|fw|fwd):\s*/i, "").trim();
  return value || "Incoming email";
}

function configuredInboundDomain() {
  const configured = (process.env.RESEND_INBOUND_ADDRESS || process.env.RESEND_REPLY_TO || "").trim().toLowerCase();
  const at = configured.lastIndexOf("@");
  return at >= 0 ? configured.slice(at + 1) : configured;
}

function recipientIsAllowed(recipients: string[]) {
  if (!recipients.length) return true;
  const configured = (process.env.RESEND_INBOUND_ADDRESS || process.env.RESEND_REPLY_TO || "").trim().toLowerCase();
  if (!configured) return true;
  const domain = configuredInboundDomain();
  return recipients.some((value) => {
    const email = parseMailbox(String(value)).email;
    return email === configured || (domain && email.endsWith(`@${domain}`));
  });
}

function verifyResendWebhook(payload: string, headers: Headers) {
  const secret = (process.env.RESEND_WEBHOOK_SECRET || "").trim();
  if (!secret) throw new Error("RESEND_WEBHOOK_SECRET is not configured");

  const id = headers.get("svix-id") || "";
  const timestamp = headers.get("svix-timestamp") || "";
  const signatureHeader = headers.get("svix-signature") || "";
  if (!id || !timestamp || !signatureHeader) return false;

  const unix = Number(timestamp);
  if (!Number.isFinite(unix)) return false;
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - unix);
  if (ageSeconds > 5 * 60) return false;

  const encodedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(encodedSecret, "base64");
  } catch {
    return false;
  }

  const signed = `${id}.${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", key).update(signed).digest("base64");
  const candidates = signatureHeader
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.startsWith("v1,") ? part.slice(3) : part.includes(",") ? part.split(",").slice(1).join(",") : part);

  return candidates.some((candidate) => {
    try {
      const a = Buffer.from(candidate);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

async function retrieveReceivedEmail(emailId: string): Promise<ReceivedEmail> {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) throw new Error("RESEND_API_KEY is not configured");

  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as any)?.message || `Could not retrieve received email (${response.status})`);
  }
  return payload as ReceivedEmail;
}

async function notifyStaff(conn: PoolConnection, title: string, message: string, threadId: string) {
  const [staff] = await conn.execute<RowDataPacket[]>(`
    SELECT DISTINCT u.id
    FROM users u
    JOIN user_roles r ON r.user_id = u.id
    WHERE u.active = 1
      AND r.role IN ('it','admin','receptionist')
  `);

  for (const member of staff as any[]) {
    await conn.execute(
      `INSERT INTO staff_notifications(id,user_id,type,title,message,reference_id)
       VALUES(?,?,?,?,?,?)`,
      [uuid(), member.id, "mail", title, message, threadId],
    );
  }
}

export const Route = createFileRoute("/api/mail/inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();

        try {
          if (!verifyResendWebhook(rawBody, request.headers)) {
            console.warn("[Resend inbound] Invalid webhook signature");
            return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
          }

          const event = JSON.parse(rawBody) as ResendReceivedEvent;
          if (event.type !== "email.received") {
            return Response.json({ ok: true, ignored: true });
          }

          const emailId = String(event.data?.email_id || "").trim();
          if (!emailId) return Response.json({ error: "Missing email_id" }, { status: 400 });

          const recipients = Array.isArray(event.data?.to) ? event.data!.to!.map(String) : [];
          if (!recipientIsAllowed(recipients)) {
            return Response.json({ ok: true, ignored: true, reason: "different recipient" });
          }

          const received = await retrieveReceivedEmail(emailId);
          const sender = parseMailbox(Array.isArray(received.from) ? received.from[0] : received.from || event.data?.from || "");
          if (!sender.email || !sender.email.includes("@")) {
            return Response.json({ error: "Missing sender" }, { status: 400 });
          }

          const subject = normalizeSubject(received.subject || event.data?.subject || "Incoming email");
          const body = String(received.text || "").trim() || htmlToText(String(received.html || "")) || "(Email received without a message body)";
          const providerMessageId = String(received.message_id || event.data?.message_id || "").trim() || null;
          const finalRecipients = Array.isArray(received.to) && received.to.length ? received.to.map(String) : recipients;

          const result = await withTransaction(async (conn) => {
            const [duplicate] = await conn.execute<RowDataPacket[]>(
              `SELECT id,thread_id FROM communication_messages WHERE provider_email_id=? LIMIT 1`,
              [emailId],
            );
            if ((duplicate as any[]).length) {
              return { duplicate: true, threadId: (duplicate as any[])[0].thread_id };
            }

            const [openThreads] = await conn.execute<RowDataPacket[]>(
              `SELECT id
               FROM communication_threads
               WHERE LOWER(external_email)=LOWER(?)
                 AND status='open'
               ORDER BY last_message_at DESC
               LIMIT 1`,
              [sender.email],
            );

            let threadId = (openThreads as any[])[0]?.id as string | undefined;
            if (!threadId) {
              threadId = uuid();
              await conn.execute(
                `INSERT INTO communication_threads(id,subject,kind,external_email,status,last_message_at,created_at)
                 VALUES(?,?,'email',?,'open',UTC_TIMESTAMP(),UTC_TIMESTAMP())`,
                [threadId, subject, sender.email],
              );
            }

            await conn.execute(
              `INSERT INTO communication_messages(
                 id,thread_id,sender_email,sender_name,direction,body,sent_via_email,
                 provider_email_id,provider_message_id,to_json,cc_json,attachments_json,created_at
               ) VALUES(?,?,?,?, 'inbound',?,0,?,?,?,?,?,UTC_TIMESTAMP())`,
              [
                uuid(),
                threadId,
                sender.email,
                sender.name || sender.email,
                body,
                emailId,
                providerMessageId,
                JSON.stringify(finalRecipients || []),
                JSON.stringify(received.cc || event.data?.cc || []),
                JSON.stringify(received.attachments || event.data?.attachments || []),
              ],
            );

            await conn.execute(`UPDATE communication_threads SET last_message_at=UTC_TIMESTAMP(),unread_count=unread_count+1 WHERE id=?`, [threadId]);
            await notifyStaff(conn, "New email", `${sender.name || sender.email} · ${subject}`, threadId);
            return { duplicate: false, threadId };
          });

          console.log(`[Resend inbound] ${result.duplicate ? "Replay ignored" : "Stored"} email ${emailId} in thread ${result.threadId}`);
          return Response.json({ ok: true, duplicate: result.duplicate, thread_id: result.threadId });
        } catch (error: any) {
          console.error("[Resend inbound] Error", error);
          const message = error?.message || "Inbound email processing failed";
          const configurationError = /not configured/i.test(message);
          return Response.json({ error: message }, { status: configurationError ? 500 : 502 });
        }
      },
    },
  },
});
