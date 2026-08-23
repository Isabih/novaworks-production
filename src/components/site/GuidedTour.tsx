import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, CheckCircle2, Home, KeyRound, ListPlus, Search, Sparkles, X, Building2, BadgeDollarSign, Crown, MailCheck, ShieldCheck } from "lucide-react";
import { subscribeAndSendOtp } from "@/lib/email.functions";

const flows: Record<string, {title:string; text:string; icon:any}[]> = {
  luxury: [
    { title:"Open a Luxury property", text:"Luxury listings are clearly marked with the crown badge. Normal properties never require Luxury Access.", icon:Crown },
    { title:"Request Luxury Access", text:"Enter your name and email in the Luxury Access form, then verify the code sent to your email.", icon:MailCheck },
    { title:"Wait for NOVAWORKS approval", text:"Admin and IT receive the verified request. They review it and approve or decline access.", icon:ShieldCheck },
    { title:"Receive the decision by email", text:"If approved, your email contains a direct property link. If declined, the message includes NOVAWORKS contact details so you can ask for assistance.", icon:MailCheck },
    { title:"Return and book", text:"Open the approved Luxury property, sign in with the same verified customer email, choose an available unit and continue with booking or VIP reservation.", icon:KeyRound },
  ],
  rent: [
    { title:"Tell NOVAWORKS what you need", text:"Choose Rent, then filter by location, budget and property type.", icon:Search },
    { title:"Explore the property", text:"Open a property, compare photos, amenities and location. Buildings show their available apartment/office/studio units; standalone units show their own availability and images.", icon:Building2 },
    { title:"Choose an available apartment", text:"Only currently available, unreserved units are shown. Choose the exact code (for example LB-002), review unit images when available, then select your stay dates.", icon:KeyRound },
    { title:"Create or sign in to your account", text:"Bookings require a verified customer account. New accounts are verified by email before booking.", icon:Sparkles },
    { title:"Book and choose payment", text:"Use MoMo, Airtel Money, card, cash at reception, or approved VIP access.", icon:BadgeDollarSign },
    { title:"Reception confirms your stay", text:"After payment is received, Reception confirms the booking, the owner and NOVAWORKS staff are notified, and your full customer dashboard is unlocked.", icon:CheckCircle2 },
    { title:"Manage your active stay", text:"Your dashboard shows the live remaining-days countdown, NOVAWORKS contacts, service requests and booking history. To stay longer, request an extension, pay for the extra days and wait for Reception confirmation.", icon:Home },
    { title:"Request a service when needed", text:"During an active stay choose a service such as plumbing, electrical, cleaning or security, set its priority, or choose Other and describe it. You receive email updates as NOVAWORKS handles the request.", icon:ShieldCheck },
  ],
  buy: [
    { title:"Choose Buy", text:"Search properties for sale by type, location and budget.", icon:Search },
    { title:"Review the full property", text:"Inspect media, location, details and the available units where the property contains apartments.", icon:Building2 },
    { title:"Create a verified account", text:"A verified NOVAWORKS customer account keeps your requests, visits and communication together.", icon:Sparkles },
    { title:"Send an inquiry or request a visit", text:"Our team receives your request and assigns the right staff member to follow up.", icon:KeyRound },
    { title:"Complete the purchase process", text:"NOVAWORKS guides the agreement, payment and ownership handover with clear records.", icon:BadgeDollarSign },
  ],
  sell: [
    { title:"Create your account", text:"Sign in or create a verified NOVAWORKS account.", icon:Sparkles },
    { title:"Tell us about the property", text:"Provide ownership, location, type, price and contact information.", icon:Building2 },
    { title:"Add quality media", text:"Upload photos, video, floor plan and 3D tour where available.", icon:ListPlus },
    { title:"NOVAWORKS reviews the listing", text:"The team verifies the property and prepares it for publication.", icon:CheckCircle2 },
    { title:"Start receiving clients", text:"Once published, inquiries and client activity are tracked inside NOVAWORKS.", icon:BadgeDollarSign },
  ],
  list: [
    { title:"Sign in and choose List Property", text:"Your account keeps ownership and communication connected to the listing.", icon:Sparkles },
    { title:"Add property details", text:"Choose whether it is a standalone property, a building with no units yet, or a building with apartments/offices/studios. Enter location, price, ownership and initial unit count.", icon:Building2 },
    { title:"Upload property media", text:"Add building/property media first. Staff can then manage each unit code separately and optionally upload unit-specific images.", icon:ListPlus },
    { title:"Submit for verification", text:"NOVAWORKS reviews the listing before it becomes publicly discoverable.", icon:CheckCircle2 },
    { title:"Publish and receive clients", text:"Approved listings can receive inquiries, visit requests and bookings where applicable.", icon:BadgeDollarSign },
  ],
};

const choices = [
  ["rent","I want to rent",KeyRound], ["buy","I want to buy",BadgeDollarSign],
  ["sell","I want to sell",Building2], ["list","I want to list a property",ListPlus],
  ["luxury","How to get Luxury Access",Crown],
] as const;

export function GuidedTour({open,onClose}:{open:boolean;onClose:()=>void}) {
  const subscribe = useServerFn(subscribeAndSendOtp);
  const [kind,setKind]=useState<string|null>(null);
  const [step,setStep]=useState(0);
  const [email,setEmail]=useState("");
  const [done,setDone]=useState(false);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{ if(!open){ setKind(null); setStep(0); setDone(false); setBusy(false); setEmail(""); } },[open]);
  useEffect(()=>{ if(!done) return; const t=setTimeout(()=>{ onClose(); window.location.href="/"; },2200); return()=>clearTimeout(t); },[done,onClose]);
  if(!open) return null;
  const steps=kind?flows[kind]:[];
  const finish=!!kind && step>=steps.length;
  const progress=kind?Math.min(100,((Math.min(step,steps.length)+1)/(steps.length+1))*100):7;

  return <div className="fixed inset-0 z-[120] grid place-items-center overflow-hidden bg-[#0a0907]/55 p-3 backdrop-blur-xl md:p-6">
    <div className="pointer-events-none absolute -left-32 top-[-10%] h-[460px] w-[460px] rounded-full bg-gold/20 blur-[110px] animate-pulse"/>
    <div className="pointer-events-none absolute -right-40 bottom-[-18%] h-[520px] w-[520px] rounded-full bg-amber-200/15 blur-[130px]"/>
    <div className="pointer-events-none absolute inset-0 opacity-[.15]" style={{backgroundImage:"radial-gradient(circle at 1px 1px, white 1px, transparent 0)",backgroundSize:"28px 28px"}}/>

    <div className="relative w-full max-w-3xl overflow-hidden rounded-[34px] border border-white/35 bg-white/78 shadow-[0_35px_120px_rgba(0,0,0,.45)] backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-gold/15 to-transparent"/>
      <div className="h-1.5 bg-black/5"><div className="h-full bg-gradient-to-r from-[#f9d999] via-gold to-[#b57828] transition-all duration-700 ease-out" style={{width:`${progress}%`}}/></div>
      <button onClick={onClose} className="absolute right-5 top-5 z-10 rounded-full border border-black/5 bg-white/60 p-2.5 shadow-sm backdrop-blur hover:rotate-90 hover:bg-white transition duration-300"><X className="h-5 w-5"/></button>

      <div className="relative p-7 md:p-11">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[.22em] text-[#8f5c17]"><Sparkles className="h-4 w-4 animate-pulse"/> NOVAWORKS guided tour</div>
        {!kind ? <>
          <h2 className="max-w-xl font-display text-4xl leading-tight md:text-5xl">Your property journey, made simple.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-noir/55">Tell us what you want to do and we will guide you through the exact NOVAWORKS path.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">{choices.map(([k,l,I],i)=><button key={k} onClick={()=>{setKind(k);setStep(0)}} className="group relative overflow-hidden rounded-2xl border border-black/8 bg-white/65 p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-gold/55 hover:shadow-xl"><div className="absolute right-[-22px] top-[-22px] h-24 w-24 rounded-full bg-gold/8 transition group-hover:scale-150"/><div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-noir-deep text-gold shadow-lg"><I className="h-5 w-5"/></div><b className="text-base">{l}</b><div className="mt-1 text-xs text-noir/45">Personal guided steps · 0{i+5} min</div></button>)}</div>
        </> : !finish ? <>
          <div className="text-[11px] font-semibold uppercase tracking-[.2em] text-noir/40">Step {step+1} of {steps.length}</div>
          <div key={`${kind}-${step}`} className="mt-5 animate-in fade-in slide-in-from-right-8 duration-500">
            {(() => { const I=steps[step].icon; return <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-noir-deep to-[#33240f] text-gold shadow-[0_14px_35px_rgba(0,0,0,.22)]"><I className="h-7 w-7"/></div> })()}
            <h2 className="max-w-2xl font-display text-4xl md:text-5xl">{steps[step].title}</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-noir/58">{steps[step].text}</p>
          </div>
          <div className="mt-10 flex items-center justify-between gap-3"><button onClick={()=>step?setStep(step-1):setKind(null)} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-4 py-3 text-sm font-semibold hover:bg-white"><ArrowLeft className="h-4 w-4"/>Back</button><button onClick={()=>setStep(step+1)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-soft to-gold px-6 py-3 text-sm font-bold text-noir-deep shadow-lg transition hover:-translate-y-0.5">Continue<ArrowRight className="h-4 w-4"/></button></div>
        </> : done ? <div className="py-8 text-center animate-in zoom-in-90 fade-in duration-500"><div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-emerald-500/10 ring-8 ring-emerald-500/5"><CheckCircle2 className="h-12 w-12 text-emerald-600"/></div><h2 className="mt-6 font-display text-4xl">Thank you for joining us.</h2><p className="mt-2 text-noir/55">Your subscription is active. Taking you back home…</p><div className="mx-auto mt-7 h-1.5 w-48 overflow-hidden rounded-full bg-black/5"><div className="h-full w-full origin-left animate-[tourThanks_2.2s_linear] bg-gradient-to-r from-gold to-emerald-500"/></div></div> : <>
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-8 w-8"/></div>
          <h2 className="mt-5 font-display text-4xl md:text-5xl">You are ready.</h2><p className="mt-3 max-w-xl text-noir/55">Get notified when NOVAWORKS publishes new properties and selected opportunities.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row"><input className="input-luxe flex-1 bg-white/70" type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/><button disabled={busy||!email} onClick={async()=>{if(!email)return;setBusy(true);try{await subscribe({data:{email}});setDone(true)}finally{setBusy(false)}}} className="rounded-xl bg-noir-deep px-6 py-3 font-semibold text-white disabled:opacity-50">{busy?"Subscribing…":"Subscribe"}</button></div>
          <button onClick={()=>{onClose();location.href="/"}} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-dark"><Home className="h-4 w-4"/>Skip subscription and return home</button>
        </>}
      </div>
    </div>
    <style>{`@keyframes tourThanks{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
  </div>;
}
