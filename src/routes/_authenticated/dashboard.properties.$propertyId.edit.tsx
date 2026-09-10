import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect,useState } from "react";
import { Building2, Save, Upload, Trash2, ArrowUp, ArrowDown, Star, LayoutDashboard, Loader2 } from "lucide-react";
import { DashboardShell,Panel } from "@/components/dashboard/DashboardShell";
import { useAuth,dashboardPathFor } from "@/lib/use-auth";
import { fetchPropertyForEdit,updateProperty,IMAGE_SECTIONS,uploadPropertyFile } from "@/lib/properties-db";
import { uploadPropertyMedia } from "@/lib/r2-upload";
import { fetchPropertyCategories } from "@/lib/property-types-public";
import { listStaffForAssignment } from "@/lib/customers.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route=createFileRoute("/_authenticated/dashboard/properties/$propertyId/edit")({
 head:()=>({meta:[{title:"Edit Property — NOVAWORKS"}]}),component:EditProperty
});
type Image={id?:string;url:string;path?:string|null;section:string;alt_text?:string};
const NAV=[{to:"/dashboard/properties",label:"All Properties",icon:Building2,group:"Content"}];
function EditProperty(){
 const {propertyId}=Route.useParams();
 const {user,roles,primaryRole}=useAuth();
 const navigate=useNavigate();
 const authorized=roles.includes("it")||roles.includes("admin");
 const role=roles.includes("it")?"it":"admin";
 const [form,setForm]=useState<any>(null);
 const [images,setImages]=useState<Image[]>([]);
 const [types,setTypes]=useState<any[]>([]);
 const [staff,setStaff]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [progress,setProgress]=useState<number|null>(null);
 const [videoFile,setVideoFile]=useState<File|null>(null);
 const [blueprint,setBlueprint]=useState<File|null>(null);
 const loadStaff=useServerFn(listStaffForAssignment);
 useEffect(()=>{if(roles.length&&!authorized)navigate({to:dashboardPathFor((primaryRole as any)||"customer")})},[roles,authorized]);
 useEffect(()=>{
  if(!authorized)return;
  Promise.all([fetchPropertyForEdit(propertyId),fetchPropertyCategories().catch(()=>[]),loadStaff().catch(()=>[])])
   .then(([p,t,s])=>{
    setForm({...p,price:p.price??"",show_price:!!p.show_price,amenities:(p.amenities||[]).join(","),
      owner_id:p.owner_id||"",agent_id:p.agent_id||"",lat:p.lat??"",lng:p.lng??"",area_sqm:p.area_sqm??""});
    setImages(p.property_images||[]);setTypes(t as any[]);setStaff(s as any[]);
   }).catch(e=>setError(e.message)).finally(()=>setLoading(false));
 },[propertyId,authorized]);
 const set=(k:string,v:any)=>setForm((f:any)=>({...f,[k]:v}));
 const update=(k:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>set(k,e.target.type==="checkbox"?(e.target as HTMLInputElement).checked:e.target.value);
 const move=(i:number,delta:number)=>setImages(prev=>{const n=[...prev],j=i+delta;if(j<0||j>=n.length)return prev;[n[i],n[j]]=[n[j],n[i]];return n});
 const upload=async(files:FileList|null)=>{
  if(!files||!user)return;
  setSaving(true);
  try{
   const next:Image[]=[];
   for(const file of Array.from(files)){
    const r=await uploadPropertyMedia(user.id,file,"images",setProgress);
    next.push({url:r.url,path:r.path,section:"other",alt_text:""});
   }
   setImages(prev=>[...prev,...next]);toast.success("Images uploaded. Save changes to publish them.");
  }catch(e:any){toast.error(e.message||"Upload failed")}
  finally{setSaving(false);setProgress(null)}
 };
 const save=async()=>{
  if(!form||saving)return;
  if(!form.title?.trim())return toast.error("Title is required");
  setSaving(true);
  try{
   let video=form.video_url||null,plan=form.blueprint_url||null;
   if(videoFile&&user)video=(await uploadPropertyMedia(user.id,videoFile,"video",setProgress)).url;
   if(blueprint&&user)plan=(await uploadPropertyFile(user.id,blueprint,"blueprints")).url;
   await updateProperty({
    ...form,id:propertyId,price:form.price===""?null:Number(form.price),
    show_price:form.show_price,owner_id:form.owner_id||null,agent_id:form.agent_id||null,
    area_sqm:form.area_sqm===""?null:Number(form.area_sqm),
    lat:form.lat===""?null:Number(form.lat),lng:form.lng===""?null:Number(form.lng),
    amenities:form.amenities.split(",").map((x:string)=>x.trim()).filter(Boolean),
    video_url:video,blueprint_url:plan,images
   });
   toast.success("Property updated");navigate({to:"/dashboard/properties"});
  }catch(e:any){toast.error(e.message||"Save failed")}
  finally{setSaving(false);setProgress(null)}
 };
 if(!authorized)return null;
 return <DashboardShell title="Edit Property" subtitle="Update details and media without recreating the listing" role={role}
  nav={[...NAV,{to:dashboardPathFor(role),label:"Back to dashboard",icon:LayoutDashboard,group:"Overview"}]}
  actions={[{label:saving?"Saving…":"Save changes",icon:saving?Loader2:Save,onClick:save,variant:"primary"}]}>
  {error&&<div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-700">{error}</div>}
  {loading?<p>Loading property…</p>:form&&<div className="grid lg:grid-cols-3 gap-6">
   <div className="lg:col-span-2 space-y-6">
    <Panel title="Property details" subtitle="Only the fields you change are updated">
     <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Title" full><input className="input-luxe" value={form.title} onChange={update("title")}/></Field>
      <Field label="Description" full><textarea rows={5} className="input-luxe" value={form.description||""} onChange={update("description")}/></Field>
      <Field label="Property type"><select className="input-luxe" value={form.property_type} onChange={update("property_type")}>{types.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select></Field>
      <Field label="Listing type"><select className="input-luxe" value={form.listing_type} onChange={update("listing_type")}><option value="sale">For sale</option><option value="rent">For rent</option></select></Field>
      <Field label="Structure"><select className="input-luxe" value={form.structure_mode} onChange={update("structure_mode")}><option value="standalone">Standalone</option><option value="building">Building / complex</option><option value="mixed">Mixed-use</option></select></Field>
      <Field label="Status"><select className="input-luxe" value={form.status} onChange={update("status")}>{["draft","active","sold","rented","maintenance","archived"].map(s=><option key={s} value={s}>{s}</option>)}</select></Field>
      <Field label="Price (optional)"><input type="number" min="0" step="0.01" className="input-luxe" value={form.price} onChange={update("price")}/></Field>
      <Field label="Currency"><select className="input-luxe" value={form.currency} onChange={update("currency")}><option>USD</option><option>RWF</option><option>EUR</option></select></Field>
      <Field label="Public price visibility" full><select className="input-luxe" value={form.show_price?"yes":"no"} onChange={e=>set("show_price",e.target.value==="yes")}><option value="no">Hide price · Price on request</option><option value="yes">Display price publicly</option></select></Field>
      <Field label="Bedrooms"><input type="number" min="0" className="input-luxe" value={form.bedrooms??""} onChange={update("bedrooms")}/></Field>
      <Field label="Bathrooms"><input type="number" min="0" className="input-luxe" value={form.bathrooms??""} onChange={update("bathrooms")}/></Field>
      <Field label="Area (m²)"><input type="number" min="0" step="0.01" className="input-luxe" value={form.area_sqm} onChange={update("area_sqm")}/></Field>
      <Field label="Available from"><input type="date" className="input-luxe" value={form.available_from?String(form.available_from).slice(0,10):""} onChange={update("available_from")}/></Field>
      <Field label="Amenities (comma separated)" full><input className="input-luxe" value={form.amenities} onChange={update("amenities")}/></Field>
      <Field label="Luxury listing"><label className="flex items-center gap-2"><input type="checkbox" checked={!!form.is_luxury} onChange={update("is_luxury")}/>Requires luxury access</label></Field>
      <Field label="Featured"><label className="flex items-center gap-2"><input type="checkbox" checked={!!form.featured} onChange={update("featured")}/>Feature on website</label></Field>
     </div>
    </Panel>
    <Panel title="Location & assignment">
     <div className="grid sm:grid-cols-2 gap-4">
      {["address","city","district","lat","lng"].map(k=><Field key={k} label={k.replace("_"," ")}><input className="input-luxe" value={form[k]??""} onChange={update(k)}/></Field>)}
      <Field label="Owner"><select className="input-luxe" value={form.owner_id} onChange={update("owner_id")}><option value="">Unassigned</option>{staff.filter(x=>x.role==="owner").map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Agent"><select className="input-luxe" value={form.agent_id} onChange={update("agent_id")}><option value="">NOVAWORKS Agent</option>{staff.filter(x=>x.role==="agent").map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
     </div>
    </Panel>
    <Panel title="Video, 3D tour & floor plan">
     <div className="space-y-4">
      <Field label="Video URL"><input className="input-luxe" value={form.video_url||""} onChange={update("video_url")}/></Field>
      <Field label="Replace video with file"><input type="file" accept="video/mp4,video/webm" onChange={e=>setVideoFile(e.target.files?.[0]||null)}/></Field>
      <Field label="3D tour URL"><input className="input-luxe" value={form.tour_3d_url||""} onChange={update("tour_3d_url")}/></Field>
      <Field label="Blueprint URL"><input className="input-luxe" value={form.blueprint_url||""} onChange={update("blueprint_url")}/></Field>
      <Field label="Replace blueprint"><input type="file" accept="application/pdf" onChange={e=>setBlueprint(e.target.files?.[0]||null)}/></Field>
     </div>
    </Panel>
   </div>
   <div className="space-y-6">
    <Panel title="Property gallery" subtitle="Reorder, replace, remove or select a cover. Changes publish when saved.">
     <label className="block cursor-pointer rounded-xl border-2 border-dashed border-noir/20 p-5 text-center hover:border-gold">
      <Upload className="mx-auto h-6 w-6"/><span className="mt-2 block text-sm">Add images</span>
      <input className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>upload(e.target.files)}/>
     </label>
     {progress!==null&&<p className="mt-2 text-xs">Uploading: {progress}%</p>}
     <div className="mt-4 space-y-3">{images.map((img,i)=><div key={img.id||img.url} className="rounded-xl border border-border p-2">
      <img src={img.url} alt={img.alt_text||"Property image"} className="w-full h-36 object-contain rounded-lg bg-noir/5"/>
      <div className="mt-2 flex items-center justify-between gap-1">
       <button type="button" title="Set cover" onClick={()=>setImages(prev=>[prev[i],...prev.filter((_,j)=>j!==i)])} className="rounded p-1.5 hover:bg-gold/20"><Star className="h-4 w-4"/></button>
       <button type="button" title="Move up" disabled={i===0} onClick={()=>move(i,-1)} className="rounded p-1.5"><ArrowUp className="h-4 w-4"/></button>
       <button type="button" title="Move down" disabled={i===images.length-1} onClick={()=>move(i,1)} className="rounded p-1.5"><ArrowDown className="h-4 w-4"/></button>
       <button type="button" title="Remove image" onClick={()=>setImages(prev=>prev.filter((_,j)=>j!==i))} className="rounded p-1.5 text-rose-600"><Trash2 className="h-4 w-4"/></button>
      </div>
      {i===0&&<div className="text-xs text-gold font-semibold">COVER IMAGE</div>}
      <select className="input-luxe mt-2" value={img.section||"other"} onChange={e=>setImages(prev=>prev.map((x,j)=>j===i?{...x,section:e.target.value}:x))}>{IMAGE_SECTIONS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>
      <input className="input-luxe mt-2" placeholder="Image description" value={img.alt_text||""} onChange={e=>setImages(prev=>prev.map((x,j)=>j===i?{...x,alt_text:e.target.value}:x))}/>
      <label className="mt-2 block text-xs text-noir/60">Replace this image<input type="file" accept="image/*" className="mt-1 block w-full text-xs" onChange={async e=>{const file=e.target.files?.[0];if(!file||!user)return;try{const r=await uploadPropertyMedia(user.id,file,"images",setProgress);setImages(prev=>prev.map((x,j)=>j===i?{url:r.url,path:r.path,section:x.section,alt_text:x.alt_text}:x))}catch(err:any){toast.error(err.message)}finally{setProgress(null)}}}/></label>
     </div>)}</div>
    </Panel>
   </div>
  </div>}
 </DashboardShell>;
}
function Field({label,children,full}:{label:string;children:React.ReactNode;full?:boolean}){
 return <label className={`block ${full?"sm:col-span-2":""}`}><span className="mb-1.5 block text-xs font-medium text-noir/60">{label}</span>{children}</label>;
}
