import {rows} from "./db-utils.server";
export type PublicStats={properties:number;available_units:number;customers:number;locations:number};
export async function getPublicStats():Promise<PublicStats>{
 const [r]=await rows<any>(`SELECT
 (SELECT COUNT(*) FROM properties WHERE status IN('active','sold','rented','maintenance')) properties,
 (SELECT COUNT(*) FROM apartments a JOIN properties p ON p.id=a.property_id WHERE p.status='active' AND a.status='available' AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.apartment_id=a.id AND b.status IN('pending','confirmed')) AND NOT EXISTS(SELECT 1 FROM tenancies t WHERE t.apartment_id=a.id AND t.status IN('reserved','active','extension_requested') AND t.end_date>=CURRENT_DATE())) available_units,
 (SELECT COUNT(*) FROM customers) customers,
 (SELECT COUNT(DISTINCT NULLIF(TRIM(district),'')) FROM properties WHERE status IN('active','sold','rented','maintenance')) locations`);
 return {properties:Number(r?.properties||0),available_units:Number(r?.available_units||0),customers:Number(r?.customers||0),locations:Number(r?.locations||0)};
}
