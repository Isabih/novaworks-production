import { createFileRoute } from "@tanstack/react-router";
import type { RowDataPacket } from "mysql2";
import { bearer, getSessionUser } from "@/lib/auth.server";
import { queryRows } from "@/lib/mysql.server";

interface FeatureFlagRow extends RowDataPacket {
  feature_key: string;
  enabled: number | boolean;
}

export const Route = createFileRoute("/api/features")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await getSessionUser(bearer(request));
          if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
          const rows = await queryRows<FeatureFlagRow[]>(`SELECT feature_key, enabled FROM feature_flags ORDER BY feature_key ASC`);
          return Response.json(Object.fromEntries(rows.map((row) => [row.feature_key, Boolean(row.enabled)])));
        } catch (error) {
          console.error("[features API]", error);
          return Response.json({ error: error instanceof Error ? error.message : "Unable to load feature flags" }, { status: 500 });
        }
      },
    },
  },
});
