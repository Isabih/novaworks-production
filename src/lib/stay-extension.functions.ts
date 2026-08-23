import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { rows, uuid, audit, assertRoles } from "./db-utils.server";
import { withTransaction } from "./mysql.server";
import { sendMail } from "./mailer.server";

export const requestStayExtension = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: { tenancy_id: string; requested_end_date: string; reason?: string }) => d)
  .handler(async ({ data, context }) => {
    if (!context.roles.includes("customer")) throw new Error("Customer access required");
    const c = (await rows<any>(
      `SELECT c.id,c.full_name,c.email,t.end_date,t.property_id,t.apartment_id,p.title property_title,a.code apartment_code,p.owner_id FROM customers c JOIN tenancies t ON t.customer_id=c.id JOIN properties p ON p.id=t.property_id JOIN apartments a ON a.id=t.apartment_id
       WHERE c.user_id=? AND t.id=? AND t.status IN('active','extension_requested')`,
      [context.userId, data.tenancy_id],
    ))[0];
    if (!c) throw new Error("Active stay not found");
    if (new Date(data.requested_end_date) <= new Date(c.end_date)) throw new Error("New end date must be after the current end date");
    const pending = (await rows<any>(`SELECT id FROM stay_extension_requests WHERE tenancy_id=? AND status='pending' LIMIT 1`, [data.tenancy_id]))[0];
    if (pending) throw new Error("An extension request is already pending");
    await rows<any>(
      `INSERT INTO stay_extension_requests(id,tenancy_id,customer_id,requested_end_date,reason,status) VALUES(?,?,?,?,?,'pending')`,
      [uuid(), data.tenancy_id, c.id, data.requested_end_date, data.reason || null],
    );
    await rows<any>(`UPDATE tenancies SET status='extension_requested' WHERE id=?`, [data.tenancy_id]);
    const staff=await rows<any>(`SELECT DISTINCT u.id,u.email FROM users u JOIN user_roles ur ON ur.user_id=u.id WHERE ur.role IN('it','admin','receptionist') AND u.active=1`);
    for(const u of staff){await rows<any>(`INSERT INTO staff_notifications(id,user_id,type,title,message,reference_id) VALUES(?,?,?,?,?,?)`,[uuid(),u.id,'stay_extension','Stay extension request',`${c.property_title} · ${c.apartment_code} · ${c.full_name} · new end ${data.requested_end_date}`,data.tenancy_id]);}
    await audit(context.userId, "STAY_EXTENSION_REQUESTED", "tenancy", data.tenancy_id, null, { requested_end_date: data.requested_end_date });
    return { ok: true };
  });

export const listPendingStayExtensions = createServerFn({ method: "GET" })
  .middleware([requireMysqlAuth])
  .handler(async ({ context }) => {
    await assertRoles(context.userId, ["it", "admin", "receptionist"]);
    return rows<any>(
      `SELECT er.id,er.tenancy_id,er.requested_end_date,er.reason,er.created_at,
              c.id customer_id,c.full_name,c.email,c.phone,t.end_date current_end_date,
              p.title property_title,a.code apartment_code
       FROM stay_extension_requests er
       JOIN tenancies t ON t.id=er.tenancy_id
       JOIN customers c ON c.id=er.customer_id
       JOIN properties p ON p.id=t.property_id
       JOIN apartments a ON a.id=t.apartment_id
       WHERE er.status='pending'
       ORDER BY er.created_at ASC`,
    );
  });

export const decideStayExtension = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: { id: string; decision: "approved" | "denied" }) => d)
  .handler(async ({ data, context }) => {
    await assertRoles(context.userId, ["it", "admin", "receptionist"]);
    const er = (await rows<any>(
      `SELECT er.*,c.full_name,c.email,t.end_date,p.title property_title,p.owner_id,a.code apartment_code
       FROM stay_extension_requests er
       JOIN tenancies t ON t.id=er.tenancy_id JOIN customers c ON c.id=er.customer_id
       JOIN properties p ON p.id=t.property_id JOIN apartments a ON a.id=t.apartment_id
       WHERE er.id=? AND er.status='pending'`, [data.id],
    ))[0];
    if (!er) throw new Error("Pending extension request not found");
    await withTransaction(async (conn) => {
      await conn.execute(`UPDATE stay_extension_requests SET status=?,decided_by=?,decided_at=UTC_TIMESTAMP() WHERE id=?`, [data.decision, context.userId, data.id]);
      if (data.decision === "approved") {
        await conn.execute(`UPDATE tenancies SET end_date=?,status='active' WHERE id=?`, [er.requested_end_date, er.tenancy_id]);
        await conn.execute(`UPDATE apartments SET status='occupied' WHERE id=(SELECT apartment_id FROM tenancies WHERE id=?)`, [er.tenancy_id]);
      } else {
        await conn.execute(`UPDATE tenancies SET status='active' WHERE id=?`, [er.tenancy_id]);
      }
    });
    try {
      await sendMail(er.email, `Stay extension ${data.decision} — NOVAWORKS`,
        `<p>Hello ${er.full_name},</p><p>Your stay extension for <b>${er.property_title} · ${er.apartment_code}</b> has been <b>${data.decision}</b>.</p>${data.decision === "approved" ? `<p>New checkout date: <b>${er.requested_end_date}</b>.</p>` : ""}<p>You may reply to this email if you need help.</p>`);
    } catch {}
    if(data.decision==="approved"&&er.owner_id){const owner=(await rows<any>(`SELECT full_name,COALESCE(business_email,email) email,email_notifications_enabled FROM users WHERE id=?`,[er.owner_id]))[0];if(owner?.email&&owner.email_notifications_enabled!==0){try{await sendMail(owner.email,`Stay extended — ${er.property_title}`,`<p>Hello ${owner.full_name||"Owner"},</p><p>The stay at <b>${er.property_title} · ${er.apartment_code}</b> has been extended to <b>${er.requested_end_date}</b>.</p><p>Customer: ${er.full_name}</p>`)}catch{}}}
    const staff=await rows<any>(`SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id WHERE ur.role IN('it','admin') AND u.active=1`);for(const u of staff)await rows<any>(`INSERT INTO staff_notifications(id,user_id,type,title,message,reference_id) VALUES(?,?,?,?,?,?)`,[uuid(),u.id,'stay_extension',`Stay extension ${data.decision}`,`${er.property_title} · ${er.apartment_code} · ${er.full_name}`,er.tenancy_id]);
    await audit(context.userId, "STAY_EXTENSION_DECIDED", "stay_extension_request", data.id, er, { decision: data.decision, requested_end_date: er.requested_end_date });
    return { ok: true };
  });
