export type MailOptions = { replyTo?: string; kind?: string };

export function brandedEmail(title: string, bodyHtml: string, footerHtml = "") {
  const site = process.env.SITE_URL || "https://novaworks.rw";
  const phone = process.env.NOVAWORKS_PHONE || "+250 793 300 080";
  const contact = process.env.RESEND_REPLY_TO || process.env.NOVAWORKS_CONTACT_EMAIL || "info@novaworks.rw";
  return `<!doctype html><html><body style="margin:0;background:#f4f2ed;font-family:Arial,Helvetica,sans-serif;color:#161616">
  <div style="padding:28px 12px"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e7e2d7;border-radius:16px;overflow:hidden">
    <div style="background:#0d0d0d;padding:24px 30px;border-bottom:3px solid #e8ae4d">
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:.08em">NOVAWORKS</div>
      <div style="color:#d6b270;font-size:10px;letter-spacing:.22em;margin-top:5px;text-transform:uppercase">Digital Real Estate Platform</div>
    </div>
    <div style="padding:30px"><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:28px;font-weight:500">${title}</h1>${bodyHtml}</div>
    <div style="padding:20px 30px;background:#faf9f6;border-top:1px solid #ece7dc;color:#666;font-size:13px;line-height:1.7">
      ${footerHtml || `<b>NOVAWORKS</b><br/>Email: <a href="mailto:${contact}" style="color:#805b1e">${contact}</a><br/>Phone: <a href="tel:${phone.replace(/\s/g,'')}" style="color:#805b1e">${phone}</a><br/><a href="${site}" style="color:#805b1e">${site}</a>`}
    </div>
  </div></div></body></html>`;
}

export async function sendMail(to: string | string[], subject: string, html: string, options: MailOptions = {}) {
  const key = process.env.RESEND_API_KEY;
  const recipients = Array.isArray(to) ? to : [to];
  if (!key) {
    console.warn(`[mail disabled] ${subject} -> ${recipients.join(", ")}`);
    return { id: "dev-mail-disabled" };
  }
  const configuredFrom = (process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || "no-reply@novaworks.rw").trim();
  const from = configuredFrom.includes("<") ? configuredFrom : `${process.env.RESEND_FROM_NAME || "NOVAWORKS"} <${configuredFrom}>`;
  if (!/<html[\s>]/i.test(html)) html = brandedEmail(subject, html);
  const replyTo = options.replyTo || process.env.RESEND_REPLY_TO || "info@novaworks.rw";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: recipients, subject, html, reply_to: replyTo }),
  });
  const payload:any = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(payload?.message || `Email delivery failed (${res.status})`);
  return payload;
}
