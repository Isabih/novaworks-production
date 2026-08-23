import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { rows, uuid } from "./db-utils.server";
import { queryRows } from "./mysql.server";
import { sendMail, brandedEmail } from "./mailer.server";

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function clean() {
  await queryRows<any>(`DELETE FROM communication_messages WHERE created_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 7 DAY)`);
  await queryRows<any>(`DELETE t FROM communication_threads t LEFT JOIN communication_messages m ON m.thread_id=t.id WHERE m.id IS NULL AND t.created_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 7 DAY)`);
}

export const listCommunicationThreads = createServerFn({ method: "GET" })
  .middleware([requireMysqlAuth])
  .handler(async ({ context }) => {
    await clean();
    const staff = context.roles.some((r: string) => ["it", "admin", "receptionist"].includes(r));
    return rows<any>(
      staff
        ? `SELECT t.*,b.full_name booking_name,b.property_id,
             (SELECT body FROM communication_messages m WHERE m.thread_id=t.id ORDER BY m.created_at DESC LIMIT 1) last_body
           FROM communication_threads t
           LEFT JOIN bookings b ON b.id=t.booking_id
           ORDER BY (t.unread_count>0) DESC,t.last_message_at DESC LIMIT 200`
        : `SELECT t.*,
             (SELECT body FROM communication_messages m WHERE m.thread_id=t.id ORDER BY m.created_at DESC LIMIT 1) last_body
           FROM communication_threads t
           WHERE t.created_by=?
           ORDER BY t.last_message_at DESC LIMIT 100`,
      staff ? [] : [context.userId],
    );
  });

export const getCommunicationMessages = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: { thread_id: string }) => d)
  .handler(async ({ data, context }) => {
    await clean();
    const staff = context.roles.some((r: string) => ["it", "admin", "receptionist"].includes(r));
    const t = (
      await rows<any>(
        staff ? `SELECT * FROM communication_threads WHERE id=?` : `SELECT * FROM communication_threads WHERE id=? AND created_by=?`,
        staff ? [data.thread_id] : [data.thread_id, context.userId],
      )
    )[0];
    if (!t) throw new Error("Conversation not found");
    if (staff) await queryRows<any>(`UPDATE communication_threads SET unread_count=0,last_read_at=UTC_TIMESTAMP() WHERE id=?`,[data.thread_id]);
    return rows<any>(`SELECT * FROM communication_messages WHERE thread_id=? ORDER BY created_at ASC`, [data.thread_id]);
  });

export const createCommunication = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: { email: string; subject: string; message: string }) => d)
  .handler(async ({ data, context }) => {
    if (!context.roles.some((r: string) => ["it", "admin", "receptionist"].includes(r))) throw new Error("Staff only");
    const email = data.email.trim().toLowerCase();
    const subject = data.subject.trim() || "NOVAWORKS message";
    const message = data.message.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Valid recipient email required");
    if (!message) throw new Error("Write a message");

    const delivery: any = await sendMail(
      email,
      subject,
      brandedEmail(subject, `<p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>`),
    );

    let existing=(await rows<any>(`SELECT id FROM communication_threads WHERE LOWER(external_email)=LOWER(?) AND status='open' ORDER BY last_message_at DESC LIMIT 1`,[email]))[0];
    const id = existing?.id || uuid();
    if(!existing) await queryRows<any>(`INSERT INTO communication_threads(id,subject,kind,external_email,status,created_by,last_message_at) VALUES(?,?,'email',?,'open',?,UTC_TIMESTAMP())`,[id,subject,email,context.userId]);
    else await queryRows<any>(`UPDATE communication_threads SET subject=?,last_message_at=UTC_TIMESTAMP() WHERE id=?`,[subject,id]);
    await queryRows<any>(
      `INSERT INTO communication_messages(
         id,thread_id,sender_user_id,sender_email,sender_name,direction,body,sent_via_email,provider_email_id,to_json
       ) VALUES(?,?,?,?,?,'outbound',?,1,?,?)`,
      [uuid(), id, context.userId, context.user.email, context.user.full_name, message, delivery?.id || null, JSON.stringify([email])],
    );
    return { id };
  });

export const sendCommunicationMessage = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: { thread_id: string; message: string }) => d)
  .handler(async ({ data, context }) => {
    const message = data.message.trim();
    if (!message) throw new Error("Write a message");

    const staff = context.roles.some((r: string) => ["it", "admin", "receptionist"].includes(r));
    const t = (
      await rows<any>(
        staff ? `SELECT * FROM communication_threads WHERE id=?` : `SELECT * FROM communication_threads WHERE id=? AND created_by=?`,
        staff ? [data.thread_id] : [data.thread_id, context.userId],
      )
    )[0];
    if (!t) throw new Error("Conversation not found");

    let delivery: any = null;
    const shouldEmail = Boolean(staff && t.external_email);
    if (shouldEmail) {
      delivery = await sendMail(
        t.external_email,
        `Re: ${t.subject}`,
        brandedEmail(t.subject, `<p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>`),
      );
    }

    await queryRows<any>(
      `INSERT INTO communication_messages(
         id,thread_id,sender_user_id,sender_email,sender_name,direction,body,sent_via_email,provider_email_id,to_json
       ) VALUES(?,?,?,?,?,?,?,?,?,?)`,
      [
        uuid(),
        t.id,
        context.userId,
        context.user.email,
        context.user.full_name,
        staff ? "outbound" : "internal",
        message,
        shouldEmail ? 1 : 0,
        delivery?.id || null,
        shouldEmail ? JSON.stringify([t.external_email]) : null,
      ],
    );
    await queryRows<any>(`UPDATE communication_threads SET last_message_at=UTC_TIMESTAMP() WHERE id=?`, [t.id]);
    return { ok: true };
  });
