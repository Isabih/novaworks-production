import { createFileRoute } from "@tanstack/react-router";
import type { PropertyTypeRow } from "@/lib/property-types.types";

async function requireEditor(request: Request) {
  const { bearer, getSessionUser } = await import("@/lib/auth.server");
  const user = await getSessionUser(bearer(request));
  if (!user) return null;
  if (!user.roles?.some((r: string) => r === "it" || r === "admin")) return null;
  return user;
}

export const Route = createFileRoute("/api/property-types")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireEditor(request);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const { getPropertyCategoriesDb } = await import("@/lib/property-types.functions");
        return Response.json(await getPropertyCategoriesDb());
      },
      POST: async ({ request }) => {
        const user = await requireEditor(request);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const body = await request.json().catch(() => null) as { categories?: PropertyTypeRow[] } | null;
        if (!body || !Array.isArray(body.categories)) return Response.json({ error: "Invalid property types payload" }, { status: 400 });
        const categories = body.categories.map((r, i) => ({
          key: String(r.key || "").trim().toLowerCase(), label: String(r.label || "").trim(),
          plural: String(r.plural || "").trim(), description: String(r.description || "").trim(),
          image: String(r.image || "").trim() || undefined, enabled: Boolean(r.enabled),
          show_on_home: Boolean(r.enabled && r.show_on_home), position: i,
        }));
        if (categories.some((r) => !r.key || !r.label || !r.plural)) return Response.json({ error: "Each property type needs key, name and plural" }, { status: 400 });
        if (new Set(categories.map((r) => r.key)).size !== categories.length) return Response.json({ error: "Property type keys must be unique" }, { status: 400 });

        const { withTransaction } = await import("@/lib/mysql.server");
        const { audit } = await import("@/lib/db-utils.server");
        await withTransaction(async (conn) => {
          await conn.execute(`CREATE TABLE IF NOT EXISTS property_types (
            type_key VARCHAR(80) PRIMARY KEY, label VARCHAR(120) NOT NULL, plural VARCHAR(140) NOT NULL,
            description VARCHAR(500) NOT NULL DEFAULT '', image_url TEXT NULL, enabled TINYINT(1) NOT NULL DEFAULT 1,
            show_on_home TINYINT(1) NOT NULL DEFAULT 0, position INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB`);
          await conn.execute("DELETE FROM property_types");
          for (const r of categories) await conn.execute(
            "INSERT INTO property_types(type_key,label,plural,description,image_url,enabled,show_on_home,position) VALUES(?,?,?,?,?,?,?,?)",
            [r.key, r.label, r.plural, r.description, r.image ?? null, r.enabled ? 1 : 0, r.show_on_home ? 1 : 0, r.position],
          );
        });
        await audit(user.id, "PROPERTY_CATEGORIES_UPDATED", "property_types", null, null, { count: categories.length });
        return Response.json({ ok: true, categories: categories.map(({ position, ...r }) => r) });
      },
    },
  },
});
