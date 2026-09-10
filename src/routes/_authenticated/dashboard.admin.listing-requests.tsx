import {createFileRoute,Link} from "@tanstack/react-router";
import {useEffect,useState} from "react";
import {ClipboardList,RefreshCw,Mail,Phone,Clock3,CheckCircle2,XCircle,Eye,Loader2} from "lucide-react";
import {DashboardShell,Panel} from "@/components/dashboard/DashboardShell";
import {RoleGate} from "@/components/dashboard/RoleGate";
import {useAuth} from "@/lib/use-auth";
import {shellForStaff} from "@/components/dashboard/nav-config";
import {toast} from "sonner";
export const Route=createFileRoute("/_authenticated/dashboard/admin/listing-requests")({
 head:()=>({meta:[{title:"Property Listing Requests — NOVAWORKS"}]}),
 component:()=> <RoleGate allow={["it","admin"]}><ListingQueue/></RoleGate>
});
function ListingQueue(){
 const {roles}=useAuth();const shell=shellForStaff(roles);
 const [items,setItems]=useState<any[]>([]),[selected,setSelected]=useState<any|null>(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const [note,setNote]=useState(""),[filter,setFilter]=useState("all");
 const auth=()=>({Authorization:`Bearer ${localStorage.getItem("novaworks_session")||""}`});
 const load=async()=>{
  setLoading(true);
  try{const r=await fetch("/api/listing-requests/manage",{headers:auth()});const d=await r.json();if(!r.ok)throw new Error(d.error);setItems(d);if(selected)setSelected(d.find((x:any)=>x.id===selected.id)||null)}
  catch(e:any){setError(e.message||"Unable to load requests")}finally{setLoading(false)}
 };
 useEffect(()=>{load()},[]);
 const action=async(kind:string)=>{
  if(!selected||saving)return;
  if(["approved","rejected"].includes(kind)&&!confirm(`Confirm ${kind==="approved"?"approval":"rejection"} of ${selected.reference}?`))return;
  setSaving(true);setError("");
  try{
   const r=await fetch("/api/listing-requests/manage",{method:"POST",headers:{...auth(),"Content-Type":"application/json"},body:JSON.stringify({id:selected.id,action:kind,note})});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   toast.success(kind==="retry_email"?"Email retry queued":"Review saved");
   await load();
  }catch(e:any){toast.error(e.message||"Review failed")}finally{setSaving(false)}
 };
 const filtered=items.filter(x=>filter==="all"||x.status===filter);
 const due=(x:any)=>!x.applicant_contacted_at&&["pending","in_review"].includes(x.status)&&new Date(x.response_due_at).getTime()<Date.now();
 return <DashboardShell title="Property Listing Requests" subtitle="Private submission review and 24-hour response tracking" role={shell.role} nav={shell.nav}
 actions={[{label:"Refresh",icon:RefreshCw,onClick:load}]}>
  {error&&<div role="alert" className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-700">{error}</div>}
  <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,1.05fr)] gap-6 items-start">
   <Panel title={`${items.length} submissions`} subtitle="Select a request to review its details">
    <div className="mb-4 flex flex-wrap gap-2">{["all","pending","in_review","approved","rejected"].map(s=><button key={s} onClick={()=>setFilter(s)} className={`rounded-full px-3 py-1.5 text-xs capitalize ${filter===s?"bg-noir-deep text-white":"bg-noir/5"}`}>{s.replace("_"," ")}</button>)}</div>
    {loading?<p className="text-sm text-noir/50">Loading…</p>:filtered.length===0?<p className="py-8 text-center text-noir/50">No submissions in this category.</p>:<div className="space-y-2">{filtered.map(x=><button key={x.id} onClick={()=>{setSelected(x);setNote(x.review_note||"")}} className={`w-full rounded-xl border p-4 text-left transition ${selected?.id===x.id?"border-gold bg-gold/5":"border-border hover:border-gold/40"}`}>
     <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-noir/50">{x.reference}</span><span className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-1 ${due(x)?"bg-rose-100 text-rose-700":"bg-noir/5"}`}>{due(x)?"Overdue":x.status.replace("_"," ")}</span></div>
     <div className="font-display text-xl mt-2">{x.title}</div><div className="mt-1 text-sm text-noir/60">{x.full_name} · {x.location}</div><div className="mt-2 text-xs text-noir/40">{new Date(x.created_at).toLocaleString()}</div>
    </button>)}</div>}
   </Panel>
   {selected&&<div className="space-y-5">
    <Panel title={selected.title} subtitle={`Reference ${selected.reference}`}>
     <div className="space-y-4 text-sm">
      <div className="grid sm:grid-cols-2 gap-4"><Fact label="Applicant" value={selected.full_name}/><Fact label="Property type" value={selected.property_type}/><Fact label="Listing" value={selected.listing_type}/><Fact label="Location" value={`${selected.location}${selected.district?", "+selected.district:""}`}/><Fact label="Asking price (internal)" value={selected.price==null?"Not provided":`${selected.currency} ${Number(selected.price).toLocaleString()}`}/><Fact label="Public price" value={selected.show_price?"Display":"Hidden"}/></div>
      <div><div className="text-xs uppercase tracking-widest text-noir/45">Description</div><p className="mt-2 whitespace-pre-wrap">{selected.description||"No description provided."}</p></div>
      <div className="flex flex-wrap gap-3">{selected.email&&<a className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 hover:text-gold" href={`mailto:${selected.email}`}><Mail className="h-4 w-4"/>{selected.email}</a>}{selected.phone&&<a className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 hover:text-gold" href={`tel:${selected.phone.replace(/[^+\d]/g,"")}`}><Phone className="h-4 w-4"/>{selected.phone}</a>}</div>
      <div className={`rounded-xl p-3 text-xs ${due(selected)?"bg-rose-50 text-rose-700":"bg-noir/5 text-noir/60"}`}><Clock3 className="inline h-4 w-4 mr-2"/>Response due: {new Date(selected.response_due_at).toLocaleString()}{selected.applicant_contacted_at&&" · Contact recorded"}</div>
      <div className="text-xs text-noir/50">Acknowledgement: {selected.acknowledgement_sent_at?"Accepted by email provider":"Queued / retrying"}{selected.acknowledgement_error&&<span className="block text-rose-600 mt-1">{selected.acknowledgement_error}</span>}</div>
      {(selected.images||[]).length>0&&<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{selected.images.map((img:any,i:number)=><a href={img.url} target="_blank" rel="noopener noreferrer" key={i}><img src={img.url} alt={`Property photo ${i+1}`} className="aspect-square w-full object-contain rounded-lg bg-noir/5"/></a>)}</div>}
      {selected.video_url&&<a href={selected.video_url} target="_blank" rel="noopener noreferrer" className="text-gold underline">Open submitted video</a>}
      {selected.linked_property_id&&<Link to="/dashboard/properties/$propertyId/edit" params={{propertyId:selected.linked_property_id}} className="block text-gold underline">Open approved draft property →</Link>}
      <label className="block"><span className="text-xs font-medium text-noir/60">Review notes / message to applicant</span><textarea rows={4} className="input-luxe mt-2" value={note} onChange={e=>setNote(e.target.value)} placeholder="Record your review or contact outcome…"/></label>
      <div className="flex flex-wrap gap-2">
       {["pending","in_review"].includes(selected.status)&&<>
        <button disabled={saving} onClick={()=>action("contacted")} className="rounded-full border border-border px-4 py-2 text-xs font-medium">Mark contacted</button>
        <button disabled={saving} onClick={()=>action("in_review")} className="rounded-full border border-border px-4 py-2 text-xs font-medium">Save review</button>
        <button disabled={saving} onClick={()=>action("approved")} className="rounded-full bg-noir-deep text-white px-4 py-2 text-xs font-medium">Approve & create draft</button>
        <button disabled={saving} onClick={()=>action("rejected")} className="rounded-full border border-rose-300 text-rose-700 px-4 py-2 text-xs font-medium">Reject</button>
       </>}
       {Number(selected.failed_emails)>0&&<button disabled={saving} onClick={()=>action("retry_email")} className="rounded-full border border-amber-300 text-amber-700 px-4 py-2 text-xs font-medium">Retry failed email</button>}
      </div>
      <p className="text-xs text-noir/45">Approval creates a private draft for final verification. It does not publish the property or create an applicant account. The mail worker sends a decision email and records delivery attempts.</p>
     </div>
    </Panel>
   </div>}
  </div>
 </DashboardShell>;
}
function Fact({label,value}:{label:string;value:any}){return <div><div className="text-[10px] uppercase tracking-wider text-noir/45">{label}</div><div className="mt-1 font-medium break-words">{value??"—"}</div></div>}
