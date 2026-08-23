export type NidaResult={
  fullName:string;nid:string;ageGroup:string|null;gender?:string;district?:string;sector?:string;cell?:string;village?:string;placeOfIssue?:string;dateOfBirth?:string;
  surname?:string;postNames?:string;fatherName?:string;motherName?:string;placeOfBirth?:string;nationality?:string;civilStatus?:string;country?:string;province?:string;upi?:string;fosaid?:string;nidaServiceAvailable?:boolean;photo?:string|null;raw:any
};
function ageGroup(dobStr?:string){if(!dobStr)return null;const m=dobStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return null;const dob=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));const age=Math.floor((Date.now()-dob.getTime())/31557600000);return age<5?"White":age<18?"Red":age<=60?"Adult":"Senior"}
function cleanEnv(v?:string){return (v||"").trim().replace(/^['"]|['"]$/g,"")}
export async function verifyNida(nid:string):Promise<NidaResult>{
 const url=cleanEnv(process.env.NIDA_API_URL)||"https://devhie.moh.gov.rw:5000/api/v1/citizens/getCitizen";
 const u=cleanEnv(process.env.NIDA_USERNAME||process.env.NIDA_USER||process.env.USERNAME);
 const p=cleanEnv(process.env.NIDA_PASSWORD||process.env.NIDA_PASS||process.env.PASSWORD);
 const fosaid=cleanEnv(process.env.NIDA_FOSAID)||"0023";
 if(!u||!p||u==="CHANGE_ME"||p==="CHANGE_ME")throw new Error("NIDA credentials are not configured. Set NIDA_USERNAME and NIDA_PASSWORD in .env and restart Vite.");
 const normalized=nid.replace(/\s/g,"");if(!/^\d{16}$/.test(normalized))throw new Error("Enter a valid 16-digit National ID");
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
 try{
  const auth=Buffer.from(`${u}:${p}`).toString("base64");
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json","Authorization":`Basic ${auth}`},body:JSON.stringify({documentType:"NID",documentNumber:normalized,fosaid}),signal:controller.signal});
  const text=await r.text();let data:any={};try{data=text?JSON.parse(text):{}}catch{data={message:text}}
  if(r.status===401||r.status===403)throw new Error(`NIDA authentication rejected (${r.status}). Check NIDA_USERNAME/NIDA_PASSWORD, NIDA_FOSAID and API access, then restart the app.`);
  if(!r.ok)throw new Error(data?.message||data?.error||`NIDA service returned HTTP ${r.status}`);
  if(data?.status!=="ok"||!data?.data)throw new Error(data?.message||"Citizen not found in NIDA database");
  const c=data.data;
  const fullName=`${c.postNames||""} ${c.surName||""}`.trim();
  return {fullName,nid:c.nid||c.documentNumber||normalized,ageGroup:ageGroup(c.dateOfBirth),gender:c.sex||"",district:c.domicileDistrict||"",sector:c.domicileSector||"",cell:c.domicileCell||"",village:c.domicileVillage||"",placeOfIssue:c.placeOfIssue||"",dateOfBirth:c.dateOfBirth||"",surname:c.surName||"",postNames:c.postNames||"",fatherName:c.fatherName||"",motherName:c.motherName||"",placeOfBirth:c.placeOfBirth||"",nationality:c.nationality||"",civilStatus:c.civilStatus||c.maritalStatus||"",country:c.domicileCountry||"Rwanda",province:c.domicileProvince||"",upi:c.upi||"",fosaid:c.fosaid||fosaid,nidaServiceAvailable:c.nidaServiceAvailable===true,photo:c.photo||null,raw:c};
 }catch(e:any){if(e?.name==="AbortError")throw new Error("NIDA request timed out. Check network/VPN access to the HIE service.");throw e}finally{clearTimeout(timer)}
}
