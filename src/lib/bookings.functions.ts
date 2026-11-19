import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { rows, uuid, assertRoles, audit, requireFeature } from "./db-utils.server";
import { queryRows, withTransaction } from "./mysql.server";
import { brandedEmail, sendMail } from "./mailer.server";

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash at reception — staff verification" },
  { value: "bank_transfer", label: "Bank transfer — manual confirmation" },
  { value: "mobile_money_manual", label: "Mobile Money transfer — manual confirmation" },
  { value: "vip", label: "VIP — staff approval only" },
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
    if (!p || p.listing_type !== "rent") throw new Error("Only active rental properties can be booked");

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
    const rate = Number(apt?.monthly_price || p.price || 0);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("A booking rate has not been configured. Please contact NOVAWORKS for a quote.");
    // Published rental prices are MONTHLY. Use an explicit 30-day prorating convention.
    const nightlyRate = Number((rate / 30).toFixed(2));
    const amount = Number((rate * nights / 30).toFixed(2));
    const method = String(data.payment_method || "cash");
    if (!PAYMENT_METHODS.some(m => m.value === method)) throw new Error("This payment method is not enabled. Use manual confirmation.");
    const email = String(context.user.email || "").trim().toLowerCase();

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
        data.check_in, data.check_out, nights, nightlyRate, amount, p.currency || "RWF",
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
            <tr><td style="padding:8px 0;color:#777">Amount</td><td style="padding:8px 0;text-align:right;font-weight:600">${p.currency} ${amount.toLocaleString()}</td></tr>
          </table>
          <p>You will receive another email when Reception approves or declines the booking.</p>
        `),
      );
    } catch {}

    return { id, amount, nights };
  });

export const startBookingPayment = createServerFn({method:"POST"})
  .middleware([requireMysqlAuth])
  .validator((d:{booking_id:string;redirect_url:string})=>d)
  .handler(async()=>{throw new Error("Online payment processing is disabled pending provider agreements. Select manual payment.");});

export const verifyBookingPayment = createServerFn({method:"POST"})
  .middleware([requireMysqlAuth])
  .validator((d:{tx_ref:string})=>d)
  .handler(async()=>{throw new Error("Gateway verification is disabled. Only staff-confirmed manual payments are accepted.");});

/** Staff must verify money received outside NOVAWORKS before recording it here. */
export const recordManualBookingPayment=createServerFn({method:"POST"})
  .middleware([requireMysqlAuth])
  .validator((d:{booking_id:string;reference:string;evidence_note:string;channel:"cash"|"bank_transfer"|"mobile_money_manual";amount:number;currency:string})=>d)
  .handler(async({data,context})=>{
    await assertRoles(context.userId,["it","admin","receptionist"]);
    const reference=String(data.reference||"").trim().slice(0,160);
    const note=String(data.evidence_note||"").trim().slice(0,1000);
    if(reference.length<4||note.length<10)throw new Error("Payment reference and verification evidence (10+ characters) are required");
    if(!["cash","bank_transfer","mobile_money_manual"].includes(data.channel))throw new Error("Invalid manual channel");
    await withTransaction(async conn=>{
      const [found]:any=await conn.execute("SELECT * FROM bookings WHERE id=? FOR UPDATE",[data.booking_id]);
      const b=found[0];
      if(!b||b.status!=="pending"||b.payment_status!=="pending")throw new Error("Pending, unpaid booking required");
      if(b.payment_method!==data.channel)throw new Error("Payment channel does not match booking");
      if(b.currency!==data.currency||Math.round(Number(b.amount)*100)!==Math.round(Number(data.amount)*100))throw new Error("Verified amount or currency does not match booking");
      await conn.execute(`INSERT INTO booking_manual_payments(id,booking_id,channel,reference,amount,currency,verified_by,evidence_note)
         VALUES(?,?,?,?,?,?,?,?)`,[uuid(),b.id,data.channel,reference,Number(b.amount),b.currency,context.userId,note]);
      await conn.execute("UPDATE bookings SET payment_status='paid',payment_reference=? WHERE id=?",[reference,b.id]);
      await conn.execute(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,new_values)
        VALUES(?,'MANUAL_PAYMENT_VERIFIED','booking',?,?)`,
        [context.userId,b.id,JSON.stringify({reference,channel:data.channel,amount:Number(b.amount),currency:b.currency,evidence_note:note})]);
    });
    return {ok:true};
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
    let b:any, apt:any, tenancyId:string="", confirmer:any;
    await withTransaction(async(conn)=>{
      const [found]:any=await conn.execute(`SELECT b.*,p.title property_title,p.address property_address,p.city property_city,p.district property_district,p.country property_country,
        p.owner_id,p.commission_percent FROM bookings b JOIN properties p ON p.id=b.property_id WHERE b.id=? FOR UPDATE`,[data.booking_id]);
      b=found[0];
      if(!b||b.status!=="pending")throw new Error("Pending booking not found");
      const vip=b.payment_method==="vip";
      let manual:any=null;
      if(!vip){
        if(b.payment_status!=="paid")throw new Error("Reception must verify actual manual payment before confirming the stay");
        const [payments]:any=await conn.execute("SELECT * FROM booking_manual_payments WHERE booking_id=? FOR UPDATE",[b.id]);
        manual=payments[0];
        if(!manual||manual.channel!==b.payment_method||manual.currency!==b.currency||
           Math.round(Number(manual.amount)*100)!==Math.round(Number(b.amount)*100))
           throw new Error("Matching verified manual payment receipt required");
      }
      let apartmentId=data.apartment_id||b.apartment_id;
      if(!apartmentId&&data.apartment_no){
        const [byCode]:any=await conn.execute("SELECT id FROM apartments WHERE property_id=? AND code=? AND status='available' LIMIT 1",[b.property_id,data.apartment_no]);
        apartmentId=byCode[0]?.id;
      }
      if(!apartmentId)throw new Error("Select an available apartment");
      const [units]:any=await conn.execute("SELECT * FROM apartments WHERE id=? AND property_id=? FOR UPDATE",[apartmentId,b.property_id]);
      apt=units[0];
      if(!apt)throw new Error("Apartment not found");
      if(b.booking_type==="extension"){
        if(apartmentId!==b.apartment_id)throw new Error("Stay extensions must use the existing apartment");
      }else if(apt.status!=="available")throw new Error("Apartment is currently unavailable");
      const [overlap]:any=await conn.execute(`SELECT id FROM tenancies WHERE apartment_id=? AND status IN('reserved','active','extension_requested')
        AND start_date<? AND end_date>? ${b.booking_type==="extension"?"AND id<>?":""} LIMIT 1 FOR UPDATE`,
        b.booking_type==="extension"?[apartmentId,b.check_out,b.check_in,b.tenancy_id]:[apartmentId,b.check_out,b.check_in]);
      if(overlap.length)throw new Error("Apartment is already reserved for those dates");
      const [customers]:any=await conn.execute("SELECT id FROM customers WHERE user_id=? OR LOWER(email)=LOWER(?) LIMIT 1 FOR UPDATE",[b.user_id,b.email]);
      let customerId=customers[0]?.id;
      if(!customerId){
        const [verified]:any=await conn.execute("SELECT email_verified_at FROM users WHERE id=?",[b.user_id]);
        if(!verified[0]?.email_verified_at)throw new Error("Customer must verify their email");
        customerId=uuid();
        await conn.execute(`INSERT INTO customers(id,user_id,full_name,email,phone,email_verified_at,qr_token,created_by)
          VALUES(?,?,?,?,?,UTC_TIMESTAMP(),?,?)`,[customerId,b.user_id,b.full_name,b.email,b.phone||"",uuid().replaceAll("-",""),context.userId]);
      }
      tenancyId=b.booking_type==="extension"?b.tenancy_id:uuid();
      if(b.booking_type==="extension"){
        const [current]:any=await conn.execute("SELECT id,end_date FROM tenancies WHERE id=? AND customer_id=? FOR UPDATE",[b.tenancy_id,customerId]);
        if(!current[0]||String(new Date(current[0].end_date).toISOString().slice(0,10))!==String(new Date(b.check_in).toISOString().slice(0,10)))
          throw new Error("Stay was changed; request a new extension quote");
        await conn.execute("UPDATE tenancies SET end_date=?,status='active',rent_amount=rent_amount+? WHERE id=?",[b.check_out,Number(b.amount),b.tenancy_id]);
      }else{
        await conn.execute(`INSERT INTO tenancies(id,customer_id,property_id,apartment_id,start_date,end_date,status,rent_amount,currency,commission_percent,created_by)
          VALUES(?,?,?,?,?,?,IF(? > UTC_DATE(),'reserved','active'),?,?,?,?)`,
          [tenancyId,customerId,b.property_id,apartmentId,b.check_in,b.check_out,b.check_in,Number(b.amount),b.currency,Number(b.commission_percent??20),context.userId]);
        await conn.execute("UPDATE apartments SET status=IF(? > UTC_DATE(),'reserved','occupied') WHERE id=?",[b.check_in,apartmentId]);
      }
      await conn.execute(`UPDATE bookings SET status='confirmed',payment_status=IF(payment_method='vip','waived',payment_status),
        confirmed_by=?,confirmed_at=UTC_TIMESTAMP(),stay_start=?,stay_end=?,apartment_id=? WHERE id=?`,
        [context.userId,b.check_in,b.check_out,apartmentId,b.id]);
      if(!vip){
        await conn.execute(`INSERT INTO payments(id,tenancy_id,customer_id,amount,currency,payment_method,reference,status,paid_at,confirmed_by)
          VALUES(?,?,?,?,?,?,?,'confirmed',UTC_TIMESTAMP(),?)`,
          [uuid(),tenancyId,customerId,Number(b.amount),b.currency,b.payment_method,manual.reference,manual.verified_by]);
      }
      if(b.owner_id&&!vip){
        await conn.execute(`INSERT INTO owner_ledger(id,owner_id,property_id,tenancy_id,entry_type,description,amount,currency,direction,created_by)
          VALUES(?,?,?,?,'rent_income',?,?,?,'credit',?)`,
          [uuid(),b.owner_id,b.property_id,tenancyId,`Manual booking payment — ${b.full_name}`,Number(b.amount),b.currency,context.userId]);
        await conn.execute(`INSERT INTO owner_ledger(id,owner_id,property_id,tenancy_id,entry_type,description,amount,currency,direction,created_by)
          VALUES(?,?,?,?,'commission',?,?,?,'debit',?)`,
          [uuid(),b.owner_id,b.property_id,tenancyId,`NOVAWORKS commission (${b.commission_percent}%)`,
          Number(b.amount)*Number(b.commission_percent??20)/100,b.currency,context.userId]);
      }
      await conn.execute(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,new_values)
        VALUES(?,'BOOKING_CONFIRMED','booking',?,?)`,
        [context.userId,b.id,JSON.stringify({tenancy_id:tenancyId,apartment_id:apartmentId,manual_payment:!vip})]);
    });
    confirmer=(await rows<any>(`SELECT id,full_name,phone,COALESCE(business_email,email) email FROM users WHERE id=?`,[context.userId]))[0]||
      {id:context.userId,full_name:context.user.full_name,email:context.user.email,phone:context.user.phone};

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
