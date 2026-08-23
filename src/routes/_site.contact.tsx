import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { getContactContent } from "@/lib/contact-content.functions";
import { submitContactMessage } from "@/lib/contact-messages.functions";

export const Route = createFileRoute("/_site/contact")({
  head: () => ({
    meta: [
      { title: "Contact NOVAWORKS — Speak With Our Team" },
      { name: "description", content: "Get in touch with NOVAWORKS Real Estate. Our team is available to discuss listings, valuations and bespoke property requirements." },
    ],
  }),
  loader: () => getContactContent(),
  component: ContactPage,
});

function ContactPage() {
  const data = Route.useLoaderData();
  const info = data.info;
  const submitMessage = useServerFn(submitContactMessage);
  const [form,setForm]=useState({first_name:"",last_name:"",email:"",phone:"",interest:"Buy a property",message:""});
  const [sending,setSending]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState("");
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setSending(true);setError("");try{await submitMessage({data:form});setSent(true);setForm({first_name:"",last_name:"",email:"",phone:"",interest:"Buy a property",message:""})}catch(err:any){setError(err?.message??"Could not send message")}finally{setSending(false)}};
  const contactItems = [
    { i: Phone, t: "Call us", v: info.phone, s: info.phone_hours },
    { i: Mail, t: "Email us", v: info.email, s: info.email_note },
    { i: MapPin, t: "Visit us", v: info.address, s: info.address_note },
    { i: Clock, t: "Office hours", v: info.hours, s: info.hours_note },
  ];
  return (
    <div>
      <section className="bg-noir-deep text-white py-20">
        <div className="container-luxe max-w-3xl">
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Get In Touch</div>
          <h1 className="mt-4 font-display text-5xl md:text-6xl">Let's start a conversation.</h1>
          <p className="mt-4 text-white/60 max-w-xl">Whether you're searching for a home, listing a property or exploring investment, our team responds within 24 hours.</p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe grid lg:grid-cols-[1fr_1.2fr] gap-12">
          <div className="space-y-4">
            {contactItems.map((c) => (
              <div key={c.t} className="flex gap-4 p-5 bg-card border border-border rounded-xl">
                <div className="w-11 h-11 rounded-lg bg-gold/10 text-gold flex items-center justify-center shrink-0">
                  <c.i className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{c.t}</div>
                  <div className="font-medium text-foreground">{c.v}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.s}</div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-8">
            <div className="font-display text-2xl mb-6">Send us a message</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input required label="First name" placeholder="John" value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})} />
              <Input required label="Last name" placeholder="Doe" value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})} />
              <Input required label="Email" placeholder="you@example.com" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
              <Input label="Phone" placeholder="+250 …" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Interest</label>
              <select value={form.interest} onChange={e=>setForm({...form,interest:e.target.value})} className="bg-muted rounded-md px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/30">
                <option>Buy a property</option><option>Rent a property</option><option>List my property</option>
                <option>Investment advisory</option><option>Property management</option><option>Other</option>
              </select>
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Message</label>
              <textarea required rows={5} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} className="bg-muted rounded-md px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/30" placeholder="Tell us a little about what you're looking for..." />
            </div>
            {sent&&<div className="mt-4 rounded-lg bg-emerald-50 text-emerald-700 p-3 text-sm">Message received. Our team has been notified.</div>}{error&&<div className="mt-4 rounded-lg bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}<button disabled={sending} type="submit" className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold-soft to-gold text-noir-deep px-6 py-3.5 rounded-md font-medium disabled:opacity-60"><Send className="w-4 h-4" /> {sending?"Sending…":"Send message"}</button>
          </form>
        </div>
      </section>
    </div>
  );
}

function Input({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input {...rest} className="bg-muted rounded-md px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/30" />
    </div>
  );
}