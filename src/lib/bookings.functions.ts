import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { rows, uuid, assertRoles, audit, requireFeature } from "./db-utils.server";
import { queryRows, withTransaction } from "./mysql.server";
import { brandedEmail, sendMail } from "./mailer.server";

export const PAYMENT_METHODS = [
  { value: "momo", label: "MTN MoMo" },
  { value: "airtel", label: "Airtel Money" },
  { value: "card", label: "Visa / Mastercard" },
  { value: "cash", label: "Cash at reception" },
  { value: "vip", label: "VIP — reception approval" },
] as const;

function nest(b: any) {
  return {
    ...b,
    properties: {
      title: b.property_title,
      slug: b.property_slug,
      city: b.property_city,
      address: b.property_address,
    },
  };
}

async function bookingStaff() {
  return rows<any>(`
    SELECT DISTINCT u.id,u.full_name,u.phone,COALESCE(u.business_email,u.email) email
    FROM users u
    JOIN user_roles ur ON ur.user_id=u.id
    WHERE u.active=1 AND ur.role IN('it','admin','receptionist')
  `);
}

async function notifyBookingStaff(type: string, title: string, message: string, bookingId: string) {
  for (const st of await bookingStaff()) {
    await queryRows<any>(
      `INSERT INTO staff_notifications(id,user_id,type,title,message,reference_id) VALUES(?,?,?,?,?,?)`,
      [uuid(), st.id, type, title, message, bookingId],
    );
  }
}

async function ensureBookingThread(b: any, createdBy: string) {
  let t = (await rows<any>(`SELECT id FROM communication_threads WHERE booking_id=? LIMIT 1`, [b.id]))[0];
  if (!t && b.email) {
    // One external email address keeps one open conversation history.
    t = (await rows<any>(`SELECT id FROM communication_threads WHERE LOWER(external_email)=LOWER(?) AND status='open' ORDER BY last_message_at DESC LIMIT 1`, [b.email]))[0];
    if (t) {
      await queryRows<any>(`UPDATE communication_threads SET booking_id=COALESCE(booking_id,?),kind='booking',last_message_at=UTC_TIMESTAMP() WHERE id=?`, [b.id, t.id]);
    }
  }
  if (!t) {
    const id = uuid();
    await queryRows<any>(
      `INSERT INTO communication_threads(id,subject,kind,booking_id,external_email,status,created_by,last_message_at)
       VALUES(?,?,'booking',?,?,'open',?,UTC_TIMESTAMP())`,
      [id, `Booking — ${b.property_title}`, b.id, b.email, createdBy],
    );
    t = { id };
  }
  return t;
}

async function addBookingMessage(b: any, actor: any, body: string, viaEmail = true) {
  const thread = await ensureBookingThread(b, actor.id || actor.userId || b.user_id);
  await queryRows<any>(
    `INSERT INTO communication_messages(id,thread_id,sender_user_id,sender_email,sender_name,direction,body,sent_via_email)
     VALUES(?,?,?,?,?,'outbound',?,?)`,
    [uuid(), thread.id, actor.id || actor.userId || null, actor.email || null, actor.full_name || "NOVAWORKS", body, viaEmail ? 1 : 0],
  );
  await queryRows<any>(`UPDATE communication_threads SET last_message_at=UTC_TIMESTAMP() WHERE id=?`, [thread.id]);
}

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: any) => d)
  .handler(async ({ data, context }) => {
    if (!context.roles.includes("customer")) throw new Error("Customer account required");
    const account = (await rows<any>(`SELECT email_verified_at FROM users WHERE id=? LIMIT 1`, [context.userId]))[0];
    if (!account?.email_verified_at) throw new Error("Verify your email before booking");
    await requireFeature("bookings");

    let extensionTenancy:any=null;
    if(data.booking_type==="extension"){
      extensionTenancy=(await rows<any>(`SELECT t.*,c.full_name,c.email,c.phone FROM tenancies t JOIN customers c ON c.id=t.customer_id WHERE t.id=? AND c.user_id=? AND t.status IN('active','extension_requested') LIMIT 1`,[data.tenancy_id,context.userId]))[0];
      if(!extensionTenancy)throw new Error("Active stay not found for extension");
      data.property_id=extensionTenancy.property_id;data.apartment_id=extensionTenancy.apartment_id;data.check_in=String(extensionTenancy.end_date).slice(0,10);
    }
    const p = (await rows<any>(`SELECT * FROM properties WHERE id=? AND status='active'`, [data.property_id]))[0];
    if (!p) throw new Error("Property is not available");

    let apt: any = null;
    if (data.apartment_id) {
      apt = extensionTenancy
        ? (await rows<any>(`SELECT * FROM apartments WHERE id=? AND property_id=?`, [data.apartment_id,p.id]))[0]
        : (await rows<any>(`SELECT * FROM available_apartments WHERE id=? AND property_id=?`, [data.apartment_id, p.id]))[0];
      if (!apt) throw new Error(extensionTenancy?"Current apartment not found":"Apartment is no longer available");
    }

    const start = new Date(data.check_in);
    const end = new Date(data.check_out);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new Error("Choose valid stay dates");
    const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const rate = Number(data.nightly_rate ?? apt?.monthly_price ?? p.price ?? 0);
    const amount = Number(data.amount ?? rate * nights);
    const method = String(data.payment_method || "momo");
    const email = String(data.email || context.user.email || "").trim().toLowerCase();

    if (method === "vip") {
      const vip = (await rows<any>(
        `SELECT id FROM luxury_access_requests
         WHERE LOWER(email)=LOWER(?) AND status='approved'
           AND email_verified_at IS NOT NULL
           AND (token_expires_at IS NULL OR token_expires_at>UTC_TIMESTAMP())
         LIMIT 1`,
        [email],
      ))[0];
      if (!vip) throw new Error("VIP booking requires approved Luxury Access for this email");
    }

    const id = uuid();
    await queryRows<any>(
      `INSERT INTO bookings(id,user_id,property_id,apartment_id,tenancy_id,full_name,email,phone,check_in,check_out,nights,nightly_rate,amount,currency,payment_method,payment_status,status,booking_type,notes)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending',?,?)`,
      [
        id, context.userId, p.id, data.apartment_id || null, extensionTenancy?.id||null,
        data.full_name || context.user.full_name, email, data.phone || context.user.phone || "",
        data.check_in, data.check_out, nights, rate, amount, data.currency || p.currency || "RWF",
        method, method === "vip" ? "waived" : "pending", extensionTenancy?"extension":"new_stay", data.notes || null,
      ],
    );

    const b = {
      id, property_title: p.title, email,
      full_name: data.full_name || context.user.full_name,
      check_in: data.check_in, check_out: data.check_out,
      payment_method: method,
    };
    const thread = await ensureBookingThread(b, context.userId);
    await queryRows<any>(
      `INSERT INTO communication_messages(id,thread_id,sender_user_id,sender_email,sender_name,direction,body,sent_via_email)
       VALUES(?,?,?,?,?,'internal',?,0)`,
      [uuid(), thread.id, context.userId, email, b.full_name, `${extensionTenancy?"Stay extension":"Booking"} requested for ${data.check_in} → ${data.check_out}. Payment method: ${method.toUpperCase()}${apt?.code ? `. Requested apartment: ${apt.code}` : ""}${data.notes ? `\nNotes: ${data.notes}` : ""}`],
    );

    await notifyBookingStaff("booking_request", "New booking request", `${p.title} · ${b.full_name} · ${method.toUpperCase()}${apt?.code ? ` · ${apt.code}` : ""}`, id);

    try {
      await sendMail(
        email,
        `${extensionTenancy?"Stay extension request":"Booking request received"} — ${p.title}`,
        brandedEmail(extensionTenancy?"Stay extension request received":"Booking request received", `
          <p>Hello ${b.full_name},</p>
          <p>We received your booking request. Reception will review apartment availability and payment status before confirmation.</p>
          <table style="width:100%;border-collapse:collapse;margin:18px 0">
            <tr><td style="padding:8px 0;color:#777">Property</td><td style="padding:8px 0;text-align:right;font-weight:600">${p.title}</td></tr>
            ${apt?.code ? `<tr><td style="padding:8px 0;color:#777">Requested apartment</td><td style="padding:8px 0;text-align:right">${apt.code}</td></tr>` : ""}
            <tr><td style="padding:8px 0;color:#777">Stay</td><td style="padding:8px 0;text-align:right">${data.check_in} → ${data.check_out}</td></tr>
            <tr><td style="padding:8px 0;color:#777">Payment</td><td style="padding:8px 0;text-align:right">${method.toUpperCase()}</td></tr>
            <tr><td style="padding:8px 0;color:#777">Amount</td><td style="padding:8px 0;text-align:right;font-weight:600">${data.currency || p.currency} ${amount.toLocaleString()}</td></tr>
          </table>
          <p>You will receive another email when Reception approves or declines the booking.</p>
        `),
      );
    } catch {}

    return { id, amount, nights };
  });

export const startBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: { booking_id: string; redirect_url: string }) => d)
  .handler(async ({ data, context }) => {
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) throw new Error("Online payment is not configured. Choose Cash at reception or VIP if approved.");
    const b = (await rows<any>(`SELECT * FROM bookings WHERE id=? AND user_id=?`, [data.booking_id, context.userId]))[0];
    if (!b) throw new Error("Booking not found");
    if (b.payment_status === "paid") throw new Error("Already paid");
    if (["cash", "vip"].includes(b.payment_method)) throw new Error("This booking does not use an online payment gateway");

    const tx_ref = `nw-${b.id}-${Date.now()}`;
    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        tx_ref,
        amount: Number(b.amount),
        currency: b.currency || "RWF",
        redirect_url: data.redirect_url,
        payment_options: b.payment_method === "card" ? "card" : "mobilemoneyrwanda,card",
        customer: { email: b.email, phonenumber: b.phone, name: b.full_name },
        customizations: { title: "NOVAWORKS", description: `Booking ${b.check_in} → ${b.check_out}` },
        meta: { booking_id: b.id },
      }),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok || j?.status !== "success" || !j?.data?.link) throw new Error(j?.message || `Payment gateway error ${res.status}`);
    await queryRows<any>(`UPDATE bookings SET payment_reference=? WHERE id=?`, [tx_ref, b.id]);
    return { link: j.data.link, tx_ref };
  });

export const verifyBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: { tx_ref: string }) => d)
  .handler(async ({ data }) => {
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) throw new Error("Online payment is not configured");
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(data.tx_ref)}`, { headers: { Authorization: `Bearer ${secret}` } });
    const j: any = await res.json().catch(() => ({}));
    const ok = res.ok && j?.status === "success" && j?.data?.status === "successful";
    const b = (await rows<any>(`SELECT * FROM bookings WHERE payment_reference=?`, [data.tx_ref]))[0];
    if (!b) throw new Error("Booking not found");
    await queryRows<any>(`UPDATE bookings SET payment_status=?,gateway_tx_id=? WHERE id=?`, [ok ? "paid" : "failed", ok ? String(j.data.id || "") : null, b.id]);
    if (ok) {
      await notifyBookingStaff("booking_update", "Booking payment received", `${b.full_name} · ${b.currency} ${Number(b.amount).toLocaleString()} · awaiting Reception confirmation`, b.id);
      try { await sendMail(b.email, "Payment received — NOVAWORKS", `<p>Hello ${b.full_name},</p><p>We received <b>${b.currency} ${Number(b.amount).toLocaleString()}</b>. Reception will now confirm your apartment and stay.</p>`); } catch {}
    }
    return { paid: ok };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireMysqlAuth])
  .handler(async ({ context }) => {
    const bs = await rows<any>(`
      SELECT b.*,p.title property_title,p.slug property_slug,p.city property_city,p.address property_address,a.code apartment_code
      FROM bookings b JOIN properties p ON p.id=b.property_id
      LEFT JOIN apartments a ON a.id=b.apartment_id
      WHERE b.user_id=? ORDER BY b.created_at DESC`, [context.userId]);
    return bs.map(nest);
  });

export const listAllBookings = createServerFn({ method: "GET" })
  .middleware([requireMysqlAuth])
  .handler(async ({ context }) => {
    await assertRoles(context.userId, ["receptionist", "admin", "it"]);
    const bs = await rows<any>(`
      SELECT b.*,p.title property_title,p.slug property_slug,p.city property_city,p.address property_address,p.district property_district,
             a.code apartment_code,u.full_name confirmed_by_name,COALESCE(u.business_email,u.email) confirmed_by_email,u.phone confirmed_by_phone
      FROM bookings b JOIN properties p ON p.id=b.property_id
      LEFT JOIN apartments a ON a.id=b.apartment_id
      LEFT JOIN users u ON u.id=b.confirmed_by
      ORDER BY CASE WHEN b.status='pending' THEN 0 ELSE 1 END,b.created_at DESC LIMIT 400`);
    return bs.map(nest);
  });

export const confirmBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: { booking_id: string; apartment_no?: string | null; apartment_id?: string | null; message?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertRoles(context.userId, ["receptionist", "admin", "it"]);
    const b = (await rows<any>(`
      SELECT b.*,p.title property_title,p.address property_address,p.city property_city,p.district property_district,p.country property_country,
             p.owner_id,p.commission_percent
      FROM bookings b JOIN properties p ON p.id=b.property_id WHERE b.id=?`, [data.booking_id]))[0];
    if (!b) throw new Error("Booking not found");
    if (b.status === "confirmed") throw new Error("Already confirmed");
    if (!["cash", "vip"].includes(b.payment_method) && b.payment_status !== "paid") throw new Error("Online payment has not been completed");

    let apartmentId = data.apartment_id || b.apartment_id;
    if (!apartmentId && data.apartment_no) apartmentId = (await rows<any>(`SELECT id FROM available_apartments WHERE property_id=? AND code=?`, [b.property_id, data.apartment_no]))[0]?.id;
    if (!apartmentId) throw new Error("Select an available apartment");
    const apt = b.booking_type==="extension"
      ? (await rows<any>(`SELECT * FROM apartments WHERE id=? AND property_id=?`,[apartmentId,b.property_id]))[0]
      : (await rows<any>(`SELECT * FROM available_apartments WHERE id=? AND property_id=?`, [apartmentId, b.property_id]))[0];
    if (!apt) throw new Error(b.booking_type==="extension"?"Current apartment was not found":"Apartment is no longer available");

    const confirmer = (await rows<any>(`SELECT id,full_name,phone,COALESCE(business_email,email) email FROM users WHERE id=?`, [context.userId]))[0] || { id: context.userId, full_name: context.user.full_name, email: context.user.email, phone: context.user.phone };

    let customer = (await rows<any>(`SELECT * FROM customers WHERE user_id=? OR LOWER(email)=LOWER(?) LIMIT 1`, [b.user_id, b.email]))[0];
    if (!customer) {
      const verified = (await rows<any>(`SELECT email_verified_at FROM users WHERE id=? LIMIT 1`, [b.user_id]))[0];
      const vip = (await rows<any>(`SELECT email_verified_at FROM luxury_access_requests WHERE LOWER(email)=LOWER(?) AND status='approved' ORDER BY updated_at DESC LIMIT 1`, [b.email]))[0];
      if (!verified?.email_verified_at && !vip?.email_verified_at) throw new Error("Customer email must be verified before confirmation");
      const cid = uuid(), qr = uuid().replaceAll("-", "");
      await queryRows<any>(`INSERT INTO customers(id,user_id,full_name,email,phone,email_verified_at,qr_token,created_by) VALUES(?,?,?,?,?,UTC_TIMESTAMP(),?,?)`, [cid, b.user_id || null, b.full_name, b.email, b.phone || "", qr, context.userId]);
      customer = (await rows<any>(`SELECT * FROM customers WHERE id=?`, [cid]))[0];
    }

    const tenancyId = b.booking_type==="extension" ? b.tenancy_id : uuid();
    await withTransaction(async (conn) => {
      if(b.booking_type==="extension"){
        const [lock]:any=await conn.execute(`SELECT id,end_date FROM tenancies WHERE id=? AND customer_id=? FOR UPDATE`,[b.tenancy_id,customer.id]);
        if(!lock[0])throw new Error("Active stay not found for extension");
        await conn.execute(`UPDATE tenancies SET end_date=?,status='active',rent_amount=rent_amount+? WHERE id=?`,[b.check_out,Number(b.amount),b.tenancy_id]);
      }else{
        const [lock]: any = await conn.execute(`SELECT status FROM apartments WHERE id=? FOR UPDATE`, [apartmentId]);
        if (!lock[0] || lock[0].status !== "available") throw new Error("Apartment is no longer available");
        await conn.execute(`INSERT INTO tenancies(id,customer_id,property_id,apartment_id,start_date,end_date,status,rent_amount,currency,commission_percent,created_by) VALUES(?,?,?,?,?,?,'active',?,?,?,?)`, [tenancyId, customer.id, b.property_id, apartmentId, b.check_in, b.check_out, Number(b.amount), b.currency, Number(b.commission_percent || 20), context.userId]);
        await conn.execute(`UPDATE apartments SET status='occupied' WHERE id=?`, [apartmentId]);
      }
      await conn.execute(`UPDATE bookings SET status='confirmed',payment_status=CASE WHEN payment_method='vip' THEN 'waived' WHEN payment_method='cash' THEN 'paid' ELSE payment_status END,confirmed_by=?,confirmed_at=UTC_TIMESTAMP(),stay_start=?,stay_end=?,apartment_id=? WHERE id=?`, [context.userId, b.check_in, b.check_out, apartmentId, b.id]);
      if (b.owner_id) {
        await conn.execute(`INSERT INTO owner_ledger(id,owner_id,property_id,tenancy_id,entry_type,description,amount,currency,direction,created_by) VALUES(?,?,?,?, 'rent_income',?,?,?,'credit',?)`, [uuid(), b.owner_id, b.property_id, tenancyId, `${b.booking_type==="extension"?"Stay extension":"Booking"} payment — ${b.full_name}`, Number(b.amount), b.currency, context.userId]);
        await conn.execute(`INSERT INTO owner_ledger(id,owner_id,property_id,tenancy_id,entry_type,description,amount,currency,direction,created_by) VALUES(?,?,?,?, 'commission',?,?,?,'debit',?)`, [uuid(), b.owner_id, b.property_id, tenancyId, `NOVAWORKS commission (${b.commission_percent}%)`, Number(b.amount) * Number(b.commission_percent || 20) / 100, b.currency, context.userId]);
      }
    });

    const staffMessage = data.message?.trim() || "Your booking has been approved. We look forward to welcoming you.";
    await addBookingMessage(b, confirmer, `${b.booking_type==="extension"?"Stay extension confirmed":"Booking confirmed"}. Apartment ${apt.code}. ${staffMessage}`, true);
    await notifyBookingStaff("booking_update", b.booking_type==="extension"?"Stay extension confirmed":"Booking confirmed", `${b.property_title} · ${b.full_name} · ${apt.code} · confirmed by ${confirmer.full_name}`, b.id);

    try {
      await sendMail(b.email, `${b.booking_type==="extension"?"Your stay extension is confirmed":"Your stay is confirmed"} — ${b.property_title}`, brandedEmail(b.booking_type==="extension"?"Your stay extension is confirmed":"Your booking is confirmed", `
        <p>Hello ${b.full_name},</p>
        <p>${staffMessage}</p>
        <table style="width:100%;border-collapse:collapse;margin:18px 0">
          <tr><td style="padding:8px 0;color:#777">Property</td><td style="padding:8px 0;text-align:right;font-weight:600">${b.property_title}</td></tr>
          <tr><td style="padding:8px 0;color:#777">Location</td><td style="padding:8px 0;text-align:right">${[b.property_address,b.property_district,b.property_city,b.property_country].filter(Boolean).join(", ")}</td></tr>
          <tr><td style="padding:8px 0;color:#777">Apartment</td><td style="padding:8px 0;text-align:right;font-weight:600">${apt.code}</td></tr>
          <tr><td style="padding:8px 0;color:#777">Stay</td><td style="padding:8px 0;text-align:right">${b.check_in} → ${b.check_out}</td></tr>
          <tr><td style="padding:8px 0;color:#777">Payment method</td><td style="padding:8px 0;text-align:right">${String(b.payment_method).toUpperCase()}</td></tr>
          <tr><td style="padding:8px 0;color:#777">Amount</td><td style="padding:8px 0;text-align:right">${b.payment_method === "vip" ? "VIP / waived" : `${b.currency} ${Number(b.amount).toLocaleString()}`}</td></tr>
        </table>
        <div style="padding:14px;background:#f7f4ec;border-radius:10px">
          <b>Your NOVAWORKS contact</b><br/>
          ${confirmer.full_name || "NOVAWORKS Reception"}
          ${confirmer.email ? `<br/>Email: <a href="mailto:${confirmer.email}">${confirmer.email}</a>` : ""}
          ${confirmer.phone ? `<br/>Phone: <a href="tel:${String(confirmer.phone).replace(/\s/g, "")}">${confirmer.phone}</a>` : ""}
        </div>
        <p style="margin-top:18px">${b.booking_type==="extension"?"Your additional days are now active.":"Enjoy your stay."}</p>
      `));
    } catch {}

    if (b.owner_id) {
      const owner=(await rows<any>(`SELECT full_name,COALESCE(business_email,email) email,email_notifications_enabled FROM users WHERE id=?`,[b.owner_id]))[0];
      if(owner?.email && owner.email_notifications_enabled!==0){try{await sendMail(owner.email,`Client confirmed — ${b.property_title}`,brandedEmail("Your property has a confirmed client",`<p>Hello ${owner.full_name||"Property owner"},</p><p>A client has been confirmed for <b>${b.property_title}</b>.</p><p>Client: ${b.full_name}<br/>Apartment: ${apt.code}<br/>Stay: ${b.check_in} → ${b.check_out}<br/>Amount: ${b.currency} ${Number(b.amount).toLocaleString()}</p>`))}catch{}}
    }

    await audit(context.userId, b.booking_type==="extension"?"STAY_EXTENSION_PAYMENT_CONFIRMED":"BOOKING_CONFIRMED", "booking", b.id, null, { tenancy_id: tenancyId, apartment_id: apartmentId });
    return { ok: true, stay_start: b.check_in, stay_end: b.check_out, apartment_code: apt.code };
  });

export const rejectBooking = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: { booking_id: string; reason?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertRoles(context.userId, ["receptionist", "admin", "it"]);
    const b = (await rows<any>(`SELECT b.*,p.title property_title FROM bookings b JOIN properties p ON p.id=b.property_id WHERE b.id=?`, [data.booking_id]))[0];
    if (!b) throw new Error("Booking not found");
    const actor = (await rows<any>(`SELECT id,full_name,phone,COALESCE(business_email,email) email FROM users WHERE id=?`, [context.userId]))[0] || context.user;
    const reason = data.reason?.trim() || "The requested booking could not be confirmed. Please reply if you would like us to help with another apartment or date.";
    await queryRows<any>(`UPDATE bookings SET status='cancelled',confirmed_by=?,confirmed_at=UTC_TIMESTAMP() WHERE id=?`, [context.userId, data.booking_id]);
    await addBookingMessage(b, actor, `Booking declined. ${reason}`, true);
    await notifyBookingStaff("booking_update", "Booking declined", `${b.property_title} · ${b.full_name} · handled by ${actor.full_name || "Reception"}`, b.id);
    try {
      await sendMail(b.email, `Booking update — ${b.property_title}`, brandedEmail("Booking not confirmed", `<p>Hello ${b.full_name},</p><p>${reason.replace(/\n/g, "<br/>")}</p><p>You can reply directly to this email and our team will assist you.</p>`));
    } catch {}
    await audit(context.userId, "BOOKING_DECLINED", "booking", b.id, null, { reason });
    return { ok: true };
  });

export const replyToBooking = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: { booking_id: string; message: string }) => d)
  .handler(async ({ data, context }) => {
    await assertRoles(context.userId, ["receptionist", "admin", "it"]);
    if (!data.message?.trim()) throw new Error("Write a reply");
    const b = (await rows<any>(`SELECT b.*,p.title property_title FROM bookings b JOIN properties p ON p.id=b.property_id WHERE b.id=?`, [data.booking_id]))[0];
    if (!b) throw new Error("Booking not found");
    const actor = (await rows<any>(`SELECT id,full_name,phone,COALESCE(business_email,email) email FROM users WHERE id=?`, [context.userId]))[0] || context.user;
    await addBookingMessage(b, actor, data.message.trim(), true);
    await sendMail(b.email, `NOVAWORKS booking update — ${b.property_title}`, brandedEmail("Booking update", `<p>Hello ${b.full_name},</p><p>${data.message.trim().replace(/\n/g, "<br/>")}</p><p><b>Property:</b> ${b.property_title}<br/><b>Dates:</b> ${b.check_in} → ${b.check_out}</p><p>You can reply to this email to continue the conversation.</p>`));
    return { ok: true };
  });
