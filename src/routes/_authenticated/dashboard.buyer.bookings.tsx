import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, CreditCard, Loader2, Clock } from "lucide-react";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { BUYER_NAV } from "@/components/dashboard/nav-config";
import { CreditCard as BookingIcon } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { createBooking, listMyBookings, startBookingPayment, verifyBookingPayment, PAYMENT_METHODS } from "@/lib/bookings.functions";
import { getCustomerDashboard } from "@/lib/dashboard-data.functions";
import { listPropertiesForBooking, listAvailableApartments } from "@/lib/customers.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/buyer/bookings")({
  head: () => ({
    meta: [
      { title: "Book & Pay — NOVAWORKS" },
      { name: "description", content: "Book a NOVAWORKS apartment and pay online with MoMo, Airtel Money or card." },
    ],
  }),
  component: () => (<RoleGate allow={["customer"]}><MyBookings /></RoleGate>),
});

function MyBookings() {
  const { user, profile } = useAuth();
  const create = useServerFn(createBooking);
  const list = useServerFn(listMyBookings);
  const pay = useServerFn(startBookingPayment);
  const verify = useServerFn(verifyBookingPayment);
  const listProps = useServerFn(listPropertiesForBooking);
  const listUnits = useServerFn(listAvailableApartments);
  const dashboardFn = useServerFn(getCustomerDashboard);

  const [rows, setRows] = useState<any[]>([]);
  const [activated, setActivated] = useState(false);
  const [props, setProps] = useState<any[]>([]);
  const [units,setUnits]=useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [mode,setMode]=useState<"new"|"extension">(()=>typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("mode")==="extension"?"extension":"new");
  const [currentStay,setCurrentStay]=useState<any>(null);
  const [form, setForm] = useState({
    property_id: "", apartment_id: "", full_name: "", email: "", phone: "",
    check_in: "", check_out: "", payment_method: "momo", notes: "",
  });

  const refresh = () => list().then((d: any) => setRows(d)).catch(() => {});

  useEffect(() => {
    refresh();
    dashboardFn().then((x:any)=>{const st=x?.stay||null;setCurrentStay(st);if(st&&new URLSearchParams(window.location.search).get("mode")==="extension"){setMode("extension");setForm((f:any)=>({...f,property_id:st.property_id,apartment_id:st.apartment_id,check_in:String(st.end_date).slice(0,10),check_out:""}));}}).catch(()=>{});
    const token=localStorage.getItem("novaworks_session");
    if(token) fetch("/api/customer/access",{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():{activated:false}).then(d=>setActivated(Boolean(d.activated))).catch(()=>{});
    listProps().then(async (data: any) => {
      setProps(data ?? []);
      const qs = new URLSearchParams(window.location.search);
      const property_id = qs.get("property") || "";
      const apartment_id = qs.get("apartment") || "";
      if (property_id) {
        setForm(f => ({...f, property_id, apartment_id}));
        setUnits(await listUnits({data:{property_id}}) as any[]);
      }
    });
  }, []);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      full_name: f.full_name || profile?.full_name || "",
      email: f.email || profile?.email || user?.email || "",
      phone: f.phone || profile?.phone || "",
    }));
  }, [profile, user]);

  // Handle the gateway redirect back (?tx_ref=...)
  useEffect(() => {
    const tx = new URLSearchParams(window.location.search).get("tx_ref");
    if (!tx) return;
    verify({ data: { tx_ref: tx } })
      .then((r: any) => {
        toast[r.paid ? "success" : "error"](r.paid ? "Payment received — awaiting reception confirmation." : "Payment was not completed.");
        window.history.replaceState({}, "", window.location.pathname);
        refresh();
      })
      .catch((e: any) => toast.error(e.message ?? "Could not verify payment"));
  }, []);

  const selected = useMemo(() => props.find((p) => p.id === form.property_id), [props, form.property_id]);
  const nights = useMemo(() => {
    if (!form.check_in || !form.check_out) return 0;
    const ms = new Date(form.check_out).getTime() - new Date(form.check_in).getTime();
    return Math.max(0, Math.round(ms / 86400000));
  }, [form.check_in, form.check_out]);
  const rateForTotal = mode==="extension" ? Number(currentStay?.booking_rate||selected?.price||0) : Number(selected?.price ?? 0);
  const total = rateForTotal * Math.max(nights, 1);

  const submit = async () => {
    if(mode==="extension"&&!currentStay)return toast.error("No active stay to extend");
    if (mode==="new" && (!form.property_id || !form.check_in || !form.check_out)) return toast.error("Pick a property and your dates");
    if (mode==="extension" && !form.check_out) return toast.error("Choose the new checkout date");
    if (nights < 1) return toast.error("Check-out must be after check-in");
    setBusy(true);
    try {
      const payload:any={...form,notes:form.notes||null};if(mode==="extension"&&currentStay){payload.booking_type="extension";payload.tenancy_id=currentStay.id;payload.property_id=currentStay.property_id;payload.apartment_id=currentStay.apartment_id;payload.check_in=String(currentStay.end_date).slice(0,10);}const booking: any = await create({ data: payload });
      toast.success("Booking created");
      if (form.payment_method === "cash" || form.payment_method === "vip") {
        toast.message(form.payment_method === "vip" ? "VIP request sent — reception will confirm your eligibility and unit." : "Pay at reception — your stay starts once reception confirms.");
      } else {
        const res: any = await pay({ data: { booking_id: booking.id, redirect_url: window.location.origin + "/dashboard/buyer/bookings" } });
        window.location.href = res.link;
        return;
      }
      setForm({ ...form, check_in: "", check_out: "", notes: "" });
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Booking failed");
    } finally { setBusy(false); }
  };

  const bookingOnlyNav = [{ to: "/dashboard/buyer/bookings", label: "Book & Pay", icon: BookingIcon, group: "Booking" }];
  return (
    <DashboardShell title="Book & Pay" subtitle={activated ? "Reserve an apartment and manage your booking" : "Your account unlocks after payment and Reception confirmation"} role="customer" nav={activated ? BUYER_NAV : bookingOnlyNav}>
      {!activated && <div className="mb-6 rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 to-transparent p-5"><div className="text-sm font-semibold text-noir-deep">Booking access mode</div><p className="mt-1 text-sm text-noir/55">Until payment is completed and Reception confirms your booking, this is the only customer dashboard function available. Booked apartments are automatically excluded from the available-unit list.</p></div>}
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title={mode==="extension"?"Extend current stay":"New booking"} subtitle="Your stay changes only after payment and Reception confirmation"><div className="mb-4 inline-flex rounded-xl bg-noir/5 p-1"><button onClick={()=>setMode("new")} className={`px-4 py-2 rounded-lg text-xs font-semibold ${mode==="new"?"bg-white shadow":""}`}>Book another property</button>{currentStay&&<button onClick={()=>{setMode("extension");setForm(f=>({...f,property_id:currentStay.property_id,apartment_id:currentStay.apartment_id,check_in:String(currentStay.end_date).slice(0,10),check_out:""}))}} className={`px-4 py-2 rounded-lg text-xs font-semibold ${mode==="extension"?"bg-white shadow":""}`}>Extend current stay</button>}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <F label="Property" full>
              <select className="input-luxe" disabled={mode==="extension"} value={form.property_id} onChange={async(e) => { const id=e.target.value; setForm({ ...form, property_id:id, apartment_id:"" }); setUnits(id ? await listUnits({data:{property_id:id}}) as any[] : []); }}>
                <option value="">Select a property…</option>
                {props.map((p) => <option key={p.id} value={p.id}>{p.title} — {p.city}</option>)}
              </select>
            </F>
            <F label="Available apartment" full><select className="input-luxe" value={form.apartment_id} onChange={e=>setForm({...form,apartment_id:e.target.value})} disabled={!form.property_id||mode==="extension"}><option value="">Let reception assign / select a unit…</option>{units.map(u=><option key={u.id} value={u.id}>{u.code}{u.name?` — ${u.name}`:''}</option>)}</select></F>
            <F label="Full name"><input className="input-luxe" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></F>
            <F label="Phone"><input className="input-luxe" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+2507…" /></F>
            <F label="Email" full><input className="input-luxe" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F>
            <F label="Check-in"><input className="input-luxe" type="date" disabled={mode==="extension"} value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} /></F>
            <F label="Check-out"><input className="input-luxe" type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} /></F>
            <F label="Payment method" full>
              <select className="input-luxe" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </F>
            <F label="Notes (optional)" full><textarea className="input-luxe" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></F>
          </div>
          {(selected||mode==="extension") && nights > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between"><span>{nights} extra night(s) × {(selected?.currency||currentStay?.property_currency||currentStay?.currency||"USD")} {rateForTotal.toLocaleString()}</span>
                <strong>{selected?.currency||currentStay?.currency||"USD"} {total.toLocaleString()}</strong></div>
            </div>
          )}
          <button onClick={submit} disabled={busy} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-noir-deep text-white text-sm font-medium disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {form.payment_method === "cash" ? "Reserve (pay at reception)" : form.payment_method === "vip" ? "Request VIP reservation" : "Book & pay now"}
          </button>
        </Panel>

        <Panel title="My bookings" subtitle="Status and stay expiry">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
          <div className="space-y-3">
            {rows.map((b) => (
              <div key={b.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{b.properties?.title ?? "Property"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <CalendarCheck className="h-3.5 w-3.5" /> {b.check_in} → {b.check_out} · {b.nights} night(s)
                    </div>
                    {b.stay_end && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Expires {new Date(b.stay_end).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{b.currency} {Number(b.amount).toLocaleString()}</div>
                    <Badge status={b.status} payment={b.payment_status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </DashboardShell>
  );
}

function Badge({ status, payment }: { status: string; payment: string }) {
  const tone = status === "confirmed" ? "bg-emerald-100 text-emerald-800" : status === "cancelled" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800";
  return <div className="mt-1 flex flex-col items-end gap-1">
    <span className={`text-[11px] px-2 py-0.5 rounded-full ${tone}`}>{status}</span>
    <span className="text-[11px] text-muted-foreground">payment: {payment}</span>
  </div>;
}

function F({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`block ${full ? "sm:col-span-2" : ""}`}><div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>{children}</label>;
}
