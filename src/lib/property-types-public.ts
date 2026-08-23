import type { PropertyTypeRow } from "./property-types.functions";
export async function fetchPropertyCategories():Promise<PropertyTypeRow[]>{const r=await fetch('/api/public/property-categories');if(!r.ok)return[];return r.json()}
