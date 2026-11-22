import {createFileRoute,Link} from "@tanstack/react-router";
import {useEffect,useState} from "react";
import {Upload,Camera,CheckCircle2,ArrowRight,Mail,Phone,ShieldCheck,Clock3,X} from "lucide-react";
import {CATEGORY_META,type PropertyCategory} from "@/lib/properties";
import {getContactContent,type ContactInfo} from "@/lib/contact-content.functions";
import {useServerFn} from "@tanstack/react-start";
import {ProgressiveImage} from "@/components/site/ProgressiveImage";

export const Route=createFileRoute("/_site/list-property")({
 head:()=>({meta:[{title:"List Your Property — NOVAWORKS"},{name:"description",content:"Submit your property for professional NOVAWORKS review."}]}),
 component:ListPage
});
const initial={full_name:"",email:"",phone:"",title:"",property_type:"apartment",listing_type:"sale",location:"",district:"",description:"",price:"",currency:"USD",show_price:false,bedrooms:"",bathrooms:"",area_sqm:"",year_built:"",video_url:""};
function ListPage(){
 const [form,setForm]=useState(initial);
 const [files,setFiles]=useState<File[]>([]);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState<{reference:string;message:string}|null>(null);
 const [contact,setContact]=useState<Partial<ContactInfo>>({});
 const loadContact=useServerFn(getContactContent);
 useEffect(()=>{loadContact().then(c=>setContact(c.info)).catch(()=>{})},[loadContact]);
 const set=(k:keyof typeof initial,v:any)=>setForm(f=>({...f,[k]:v}));
 const field=(k:keyof typeof initial)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>set(k,e.target.value);
 const addFiles=(list:FileList|null)=>{
  if(!list)return;
  const next=[...files,...Array.from(list)];
  if(next.length>8){setError("You can attach a maximum of 8 images.");return}
  if(next.some(f=>f.size>8*1024*1024)){setError("Each image must be under 8 MB.");return}
  setFiles(next);setError("");
 };
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();if(sending)return;
  setSending(true);setError("");
  try{
   const data=new FormData();
   data.append("details",JSON.stringify({...form,price:form.price||null,bedrooms:form.bedrooms||null,bathrooms:form.bathrooms||null,area_sqm:form.area_sqm||null,year_built:form.year_built||null}));
   files.forEach(f=>data.append("images",f));
   const token=typeof window!=="undefined"?localStorage.getItem("novaworks_session"):null;
   const r=await fetch("/api/public/listing-requests",{method:"POST",headers:token?{Authorization:`Bearer ${token}`}:{},body:data});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to submit listing");
   setSuccess(d);
  }catch(e:any){setError(e.message||"Submission failed")}finally{setSending(false)}
 };
 return <div className="min-h-screen bg-background">
  <section className="relative overflow-hidden bg-noir-deep py-24 text-white"><div aria-hidden="true" className="absolute inset-0 opacity-20"><ProgressiveImage src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=75" alt="" priority width={1600} height={900} sizes="100vw" className="h-full w-full object-cover" containerClassName="h-full w-full"/></div><div className="container-luxe relative"><div className="max-w-3xl"><span className="text-xs tracking-[.25em] uppercase text-gold">For Property Owners</span><h1 className="mt-4 font-display text-5xl md:text-6xl">List your property with NOVAWORKS.</h1><p className="mt-5 max-w-2xl text-white/65 leading-relaxed">Present your property to our experienced team. Submit the details securely, and we will guide you through the next steps.</p></div></div></section>
  <section className="py-20"><div className="container-luxe">
   {success?<div className="max-w-2xl rounded-2xl border border-border bg-card p-8 md:p-12 shadow-xl text-foreground"><CheckCircle2 className="h-12 w-12 text-gold"/><h2 className="font-display text-3xl mt-5">Your request is received.</h2><p className="mt-4 text-muted-foreground">{success.message}</p><p className="mt-4 text-gold font-medium">Reference: {success.reference}</p><p className="mt-4 text-sm text-muted-foreground">Please keep this reference. The property is not yet published. You will receive an acknowledgement email once it has been delivered by our mail service.</p><Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold text-noir-deep px-6 py-3 font-semibold">Back to home <ArrowRight className="h-4 w-4"/></Link></div>:
   <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)] gap-8 items-start">
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 md:p-10 space-y-7 shadow-lg text-foreground">
     <div><h2 className="font-display text-3xl">Tell us about your property</h2><p className="text-sm text-muted-foreground mt-2">Your details are only visible to authorized NOVAWORKS staff.</p></div>
     {error&&<div role="alert" className="rounded-xl border border-rose-400/40 bg-rose-500/15 p-4 text-sm text-rose-100">{error}</div>}
     <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Owner full name" required><input required maxLength={150} autoComplete="name" className="input-luxe !bg-background !text-foreground !border-border placeholder:!text-muted-foreground" value={form.full_name} onChange={field("full_name")}/></Field>
      <Field label="Email address" required><input required type="email" autoComplete="email" className="input-luxe" value={form.email} onChange={field("email")}/></Field>
      <Field label="Phone number" required><input required type="tel" autoComplete="tel" className="input-luxe" placeholder="+250 7XX XXX XXX" value={form.phone} onChange={field("phone")}/></Field>
      <Field label="Property title" required><input required className="input-luxe" value={form.title} onChange={field("title")}/></Field>
      <Field label="Category"><select className="input-luxe" value={form.property_type} onChange={field("property_type")}>{(Object.keys(CATEGORY_META) as PropertyCategory[]).map(c=><option key={c} value={c}>{CATEGORY_META[c].label}</option>)}</select></Field>
      <Field label="Listing type"><select className="input-luxe" value={form.listing_type} onChange={field("listing_type")}><option value="sale">For sale</option><option value="rent">For rent</option></select></Field>
      <Field label="Location" required><input required className="input-luxe" placeholder="Kimihurura, Kigali" value={form.location} onChange={field("location")}/></Field>
      <Field label="District"><input className="input-luxe" value={form.district} onChange={field("district")}/></Field>
      <Field label="Asking price (optional)"><input type="number" min="0" step="0.01" className="input-luxe" value={form.price} onChange={field("price")}/></Field>
      <Field label="Currency"><select className="input-luxe" value={form.currency} onChange={field("currency")}><option>USD</option><option>RWF</option><option>EUR</option></select></Field>
      <Field label="Public price visibility" full><select className="input-luxe" value={form.show_price?"yes":"no"} onChange={e=>set("show_price",e.target.value==="yes")}><option value="no">Hide price · Price on request</option><option value="yes">Display price publicly</option></select></Field>
      <Field label="Bedrooms"><input type="number" min="0" className="input-luxe" value={form.bedrooms} onChange={field("bedrooms")}/></Field>
      <Field label="Bathrooms"><input type="number" min="0" className="input-luxe" value={form.bathrooms} onChange={field("bathrooms")}/></Field>
      <Field label="Area (m²)"><input type="number" min="0" step="0.01" className="input-luxe" value={form.area_sqm} onChange={field("area_sqm")}/></Field>
      <Field label="Year built"><input type="number" min="1800" className="input-luxe" value={form.year_built} onChange={field("year_built")}/></Field>
      <Field label="Description" full><textarea rows={5} className="input-luxe" value={form.description} onChange={field("description")} placeholder="Describe the property and its distinctive features…"/></Field>
     </div>
     <div><div className="text-sm font-medium mb-3">Property photography</div><label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-white/20 p-8 text-center hover:border-gold/50 transition"><Camera className="h-7 w-7 text-gold"/><span className="mt-3 text-sm">Select property images</span><span className="mt-1 text-xs text-muted-foreground">Up to 8 JPEG, PNG or WebP images · 8 MB each</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>addFiles(e.target.files)}/></label>
      {files.length>0&&<div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">{files.map((f,i)=><div key={i} className="relative rounded-lg overflow-hidden bg-white/5"><img src={URL.createObjectURL(f)} alt="" className="h-24 w-full object-contain"/><div className="p-2 text-[10px] truncate">{f.name}</div><button type="button" onClick={()=>setFiles(v=>v.filter((_,j)=>j!==i))} aria-label="Remove image" className="absolute top-1 right-1 rounded-full bg-black/70 p-1"><X className="h-3 w-3"/></button></div>)}</div>}
     </div>
     <Field label="Video tour link (optional)"><input type="url" className="input-luxe" placeholder="https://youtube.com/..." value={form.video_url} onChange={field("video_url")}/></Field>
     <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-soft to-gold text-noir-deep px-6 py-4 text-sm font-semibold uppercase tracking-wider disabled:opacity-50">{sending?"Submitting securely…":"Submit listing"}<ArrowRight className="h-4 w-4"/></button>
     <p className="text-xs text-muted-foreground">By submitting, you authorize NOVAWORKS to contact you regarding this property. Your listing will not go live automatically.</p>
    </form>
    <aside className="lg:sticky lg:top-28 space-y-5">
     <div className="rounded-2xl border border-border bg-card p-8 shadow-md text-foreground"><h3 className="font-display text-3xl">What happens next?</h3><div className="mt-6 space-y-5">{[["01","We receive your request","Your details enter our private review queue."],["02","Our team contacts you","We aim to respond within 24 hours using your submitted contact information."],["03","Inspection & preparation","We verify the property, agree on terms and prepare the listing for publication."]].map(([n,t,d])=><div key={n} className="flex gap-4"><span className="text-gold font-display text-2xl">{n}</span><div><h4 className="font-medium">{t}</h4><p className="text-sm text-muted-foreground mt-1">{d}</p></div></div>)}</div></div>
     <div className="rounded-2xl border border-border bg-card p-7 shadow-md text-foreground"><h3 className="font-display text-2xl">Need assistance?</h3><p className="text-sm text-muted-foreground mt-2">Speak to our team directly.</p>{contact.email&&<a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm mt-5 hover:text-gold"><Mail className="h-4 w-4 text-gold"/>{contact.email}</a>}{contact.phone&&<a href={`tel:${contact.phone.replace(/[^+\d]/g,"")}`} className="flex items-center gap-3 text-sm mt-4 hover:text-gold"><Phone className="h-4 w-4 text-gold"/>{contact.phone}</a>}</div>
    </aside>
   </div>}
  </div></section>
 </div>;
}
function Field({label,children,required,full}:{label:string;children:React.ReactNode;required?:boolean;full?:boolean}){return <label className={`block ${full?"sm:col-span-2":""}`}><span className="block mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">{label}{required&&" *"}</span>{children}</label>}
