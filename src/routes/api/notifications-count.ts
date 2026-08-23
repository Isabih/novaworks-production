import { createFileRoute } from "@tanstack/react-router";
import { bearer, getSessionUser } from "@/lib/auth.server";
import { rows } from "@/lib/db-utils.server";

export const Route = createFileRoute("/api/notifications-count")({
  server: { handlers: { GET: async ({ request }) => {
    const session = await getSessionUser(bearer(request));
    if (!session) return Response.json({ count: 0 }, { status: 401 });
    const receptionistOnly = session.roles?.includes("receptionist") && !session.roles?.some((r: string) => ["it", "admin"].includes(r));
    const sql = receptionistOnly
      ? `SELECT COUNT(*) count FROM staff_notifications WHERE user_id=? AND read_at IS NULL AND type IN('booking_request','booking_update','mail')`
      : `SELECT COUNT(*) count FROM staff_notifications WHERE user_id=? AND read_at IS NULL`;
    const [row] = await rows<any>(sql, [session.id]);
    return Response.json({ count: Number(row?.count || 0) });
  } } },
});
