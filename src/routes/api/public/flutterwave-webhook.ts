import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/flutterwave-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ queryRows }, { sendMail }] = await Promise.all([
          import("@/lib/mysql.server"),
          import("@/lib/mailer.server"),
        ]);

        const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;
        const got = request.headers.get("verif-hash");
        if (!expected || got !== expected) return new Response("Invalid signature", { status: 401 });

        const payload: any = await request.json().catch(() => null);
        const tx = payload?.data;
        const ref = tx?.tx_ref;
        if (!ref) return new Response("ok");

        const [booking] = await queryRows<any[]>(
          `SELECT * FROM bookings WHERE payment_reference=? LIMIT 1`,
          [ref],
        );
        if (!booking) return new Response("ok");

        if (tx?.status !== "successful") {
          await queryRows<any>(`UPDATE bookings SET payment_status='failed' WHERE id=?`, [booking.id]);
          return new Response("ok");
        }

        if (booking.payment_status !== "paid") {
          await queryRows<any>(
            `UPDATE bookings SET payment_status='paid',gateway_tx_id=? WHERE id=?`,
            [String(tx?.id || ""), booking.id],
          );
          try {
            await sendMail(
              booking.email,
              "Payment received — NOVAWORKS",
              `<p>Hello ${booking.full_name},</p><p>Your payment of <b>${booking.currency} ${Number(booking.amount).toLocaleString()}</b> was received. Reception will confirm your stay.</p>`,
            );
          } catch {}
        }

        return new Response("ok");
      },
    },
  },
});
