import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { audit } from "./db-utils.server";
import { queryRows, withTransaction } from "./mysql.server";

export interface PropertyTypeRow {
  key: string;
  label: string;
  plural: string;
  description: string;
  image?: string;
  enabled: boolean;
  show_on_home: boolean;
}

const DEFAULT: PropertyTypeRow[] = [
  { key: "apartment", label: "Apartment", plural: "Apartments", description: "Modern apartments for rent and sale", enabled: true, show_on_home: true },
  { key: "luxury-apartment", label: "Luxury Apartment", plural: "Luxury Apartments", description: "Premium residences with elevated finishes and services", enabled: true, show_on_home: true },
  { key: "villa", label: "Villa", plural: "Villas", description: "Private villas and executive homes", enabled: true, show_on_home: true },
  { key: "building", label: "Building", plural: "Buildings", description: "Residential and mixed-use buildings", enabled: true, show_on_home: true },
  { key: "office", label: "Office", plural: "Offices", description: "Professional office and commercial workspaces", enabled: true, show_on_home: false },
  { key: "land", label: "Land / Plot", plural: "Land / Plots", description: "Development land and investment plots", enabled: true, show_on_home: false },
  { key: "studio", label: "Studio", plural: "Studios", description: "Efficient, modern studio residences", enabled: true, show_on_home: false },
  { key: "commercial", label: "Commercial", plural: "Commercial Spaces", description: "Retail and commercial investment spaces", enabled: true, show_on_home: false },
];

async function ensureTable() {
  await queryRows<any>(`
    CREATE TABLE IF NOT EXISTS property_types (
      type_key VARCHAR(80) PRIMARY KEY,
      label VARCHAR(120) NOT NULL,
      plural VARCHAR(140) NOT NULL,
      description VARCHAR(500) NOT NULL DEFAULT '',
      image_url TEXT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      show_on_home TINYINT(1) NOT NULL DEFAULT 0,
      position INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  const countRows = await queryRows<any[]>(`SELECT COUNT(*) AS c FROM property_types`);
  if (Number(countRows[0]?.c || 0) === 0) {
    for (let i = 0; i < DEFAULT.length; i++) {
      const r = DEFAULT[i];
      await queryRows<any>(`INSERT INTO property_types(type_key,label,plural,description,image_url,enabled,show_on_home,position) VALUES(?,?,?,?,?,?,?,?)`, [r.key, r.label, r.plural, r.description, r.image ?? null, r.enabled ? 1 : 0, r.show_on_home ? 1 : 0, i]);
    }
  }
}

export async function getPropertyCategoriesDb(): Promise<PropertyTypeRow[]> {
  try {
    await ensureTable();
    const rs = await queryRows<any[]>(`SELECT type_key,label,plural,description,image_url,enabled,show_on_home FROM property_types ORDER BY position ASC,label ASC`);
    return rs.map((r) => ({ key: String(r.type_key), label: String(r.label), plural: String(r.plural), description: String(r.description || ""), image: r.image_url || undefined, enabled: Boolean(r.enabled), show_on_home: Boolean(r.show_on_home) }));
  } catch (error) {
    console.error("[property-types] falling back to defaults", error);
    return DEFAULT;
  }
}

export const getPropertyCategories = createServerFn({ method: "GET" })
  .middleware([requireMysqlAuth])
  .handler(async ({ context }) => {
    if (!context.roles.some((r: string) => ["it", "admin"].includes(r))) throw new Error("Not allowed");
    return getPropertyCategoriesDb();
  });

export const getPublicPropertyCategories = createServerFn({ method: "GET" })
  .handler(async () => (await getPropertyCategoriesDb()).filter((r) => r.enabled));

export const updatePropertyCategories = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: { categories: PropertyTypeRow[] } | PropertyTypeRow[]) => d)
  .handler(async ({ data, context }) => {
    if (!context.roles.some((r: string) => ["it", "admin"].includes(r))) throw new Error("Not allowed");
    await ensureTable();
    const raw = Array.isArray(data) ? data : data.categories;
    const categories = raw.map((r, i) => ({
      key: String(r.key || "").trim().toLowerCase(),
      label: String(r.label || "").trim(),
      plural: String(r.plural || "").trim(),
      description: String(r.description || "").trim(),
      image: String(r.image || "").trim() || undefined,
      enabled: Boolean(r.enabled),
      show_on_home: Boolean(r.enabled && r.show_on_home),
      position: i,
    }));
    await withTransaction(async (conn) => {
      await conn.execute(`DELETE FROM property_types`);
      for (const r of categories) {
        await conn.execute(`INSERT INTO property_types(type_key,label,plural,description,image_url,enabled,show_on_home,position) VALUES(?,?,?,?,?,?,?,?)`, [r.key, r.label, r.plural, r.description, r.image ?? null, r.enabled ? 1 : 0, r.show_on_home ? 1 : 0, r.position]);
      }
    });
    await audit(context.userId, "PROPERTY_CATEGORIES_UPDATED", "property_types", null, null, { count: categories.length });
    return { ok: true, categories: categories.map(({ position, ...r }) => r) };
  });
