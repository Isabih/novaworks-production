import { createFileRoute } from "@tanstack/react-router";

const FALLBACK_HOME = {
  hero_slides: [{
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1920&q=82",
    eyebrow: "NOVAWORKS",
    title: "Exceptional Property. Exceptional Service.",
    subtitle: "Premium property management, rentals and sales in Rwanda.",
    cta: "Explore Properties",
    href: "/properties",
  }],
  category_images: {},
  hero_story_video_url: "",
  hero_video_bg_url: null,
  auth_hero_image_url: null,
  auth_hero_video_url: null,
  featured_property_ids: [],
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
}

export const Route = createFileRoute("/api/public/property-categories")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getPropertyCategoriesDb } = await import("@/lib/property-types.functions");
        const categories = await getPropertyCategoriesDb();
        const url = new URL(request.url);

        // This endpoint is already proven to be registered in the running app.
        // Reuse it for homepage data instead of relying on a newly-added route
        // that may not yet be present in a stale generated route tree.
        if (url.searchParams.get("bundle") !== "home") {
          return Response.json(categories);
        }

        try {
          const { queryRows } = await import("@/lib/mysql.server");
          const settingsRows = await queryRows<any[]>("SELECT * FROM app_settings WHERE id=1");
          const s = settingsRows[0];
          const home = s ? {
            hero_slides: parseJson(s.hero_slides, FALLBACK_HOME.hero_slides),
            category_images: parseJson(s.category_images, {}),
            hero_story_video_url: s.hero_story_video_url || "",
            hero_video_bg_url: s.hero_video_bg_url ?? null,
            auth_hero_image_url: s.auth_hero_image_url ?? null,
            auth_hero_video_url: s.auth_hero_video_url ?? null,
            featured_property_ids: parseJson<string[]>(s.featured_property_ids, []),
          } : FALLBACK_HOME;

          let featured: any[] = [];
          const ids = home.featured_property_ids || [];
          if (ids.length) {
            const q = ids.map(() => "?").join(",");
            featured = await queryRows<any[]>(
              `SELECT p.*, (SELECT url FROM property_images i WHERE i.property_id=p.id ORDER BY i.is_cover DESC,i.position ASC LIMIT 1) image FROM properties p WHERE p.id IN (${q}) AND p.status='active'`,
              ids,
            );
          } else {
            const cols = await queryRows<any[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='properties' AND COLUMN_NAME='featured'");
            const filter = cols.length ? "AND p.featured=1" : "";
            featured = await queryRows<any[]>(
              `SELECT p.*, (SELECT url FROM property_images i WHERE i.property_id=p.id ORDER BY i.is_cover DESC,i.position ASC LIMIT 1) image FROM properties p WHERE p.status='active' ${filter} ORDER BY p.updated_at DESC LIMIT 8`,
            );
          }
          featured = featured.map((p) => ({ ...p, price: Number(p.price), cover: p.image ?? null }));

          let pod: any = null;
          const podRows = await queryRows<any[]>("SELECT p.* FROM property_of_the_day d JOIN properties p ON p.id=d.property_id WHERE d.id=1");
          const p = podRows[0];
          if (p) {
            const coverRows = await queryRows<any[]>("SELECT url FROM property_images WHERE property_id=? ORDER BY is_cover DESC,position LIMIT 1", [p.id]);
            pod = {
              id: p.id, slug: p.slug, title: p.title, description: p.description,
              city: p.city, district: p.district, bedrooms: p.bedrooms,
              bathrooms: p.bathrooms, area_sqm: p.area_sqm,
              price: Number(p.price) || 0, currency: p.currency,
              listing_type: p.listing_type,
              amenities: parseJson(p.amenities_json, []),
              cover: coverRows[0]?.url || null,
            };
          }

          return Response.json({ categories, home, featured, pod });
        } catch (error) {
          console.error("[property-categories?bundle=home]", error);
          return Response.json({ categories, home: FALLBACK_HOME, featured: [], pod: null });
        }
      },
    },
  },
});
