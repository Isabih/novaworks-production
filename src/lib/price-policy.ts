export function hasPublicPrice(p: {price?: number|null;show_price?: boolean|number|null}) {
  return p.show_price === true || p.show_price === 1
    ? p.price != null && Number.isFinite(Number(p.price)) && Number(p.price) > 0
    : false;
}
export function publicPrice<T extends {price?:number|null;show_price?:boolean|number|null}>(p:T):T {
  return {...p,price:hasPublicPrice(p)?Number(p.price):null};
}
export function optionalPrice(value:unknown):number|null {
  if(value===null || value===undefined || String(value).trim()==="")return null;
  const n=Number(value);
  if(!Number.isFinite(n)||n<0)throw new Error("Price must be a non-negative number");
  return n;
}
export function priceVisibility(value:unknown):0|1 {
  return value===true||value===1||value==="1"?1:0;
}
