import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/customer/access")({
  server: { handlers: { GET: async ({ request }) => {
    const { bearer, getSessionUser } = await import("@/lib/auth.server");
    const user = await getSessionUser(bearer(request));
    if (!user) return Response.json({ error:"Unauthorized" }, { status:401 });
    if (!user.roles?.includes("customer")) return Response.json({ activated:true, reason:"staff" });
    const { queryRows } = await import("@/lib/mysql.server");
    const booked = await queryRows<any[]>(`SELECT id FROM bookings WHERE user_id=? AND status='confirmed' AND payment_status IN('paid','waived') LIMIT 1`, [user.id]);
    const stay = await queryRows<any[]>(`SELECT t.id FROM tenancies t JOIN customers c ON c.id=t.customer_id WHERE c.user_id=? AND t.status IN('active','reserved','extension_requested') LIMIT 1`, [user.id]);
    return Response.json({ activated:Boolean(booked[0]||stay[0]), bookingConfirmed:Boolean(booked[0]), stayActive:Boolean(stay[0]) });
  } } }
});
