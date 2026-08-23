import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, Loader2, MessageSquare, CreditCard, Crown, Banknote, Smartphone, CalendarDays, Building2 } from "lucide-react";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { navForRoles } from "@/components/dashboard/nav-config";
import { useAuth } from "@/lib/use-auth";
import { listAllBookings, confirmBookingPayment, rejectBooking, replyToBooking } from "@/lib/bookings.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/bookings")({
  head: () => ({ meta: [{ title: "Bookings & Payments — NOVAWORKS" }] }),
  component: () => <RoleGate allow={["receptionist", "admin", "it"]}><BookingsDesk /></RoleGate>,
});

function PaymentIcon({ method }: { method: string }) {
  if (method === "vip") return <Crown className="h-4 w-4" />;
  if (method === "cash") return <Banknote className="h-4 w-4" />;
  if (method === "card") return <CreditCard className="h-4 w-4" />;
  return <Smartphone className="h-4 w-4" />;
}

function BookingsDesk() {
  const { roles } = useAuth();
  const shell = navForRoles(roles);
  const list = useServerFn(listAllBookings);
  const confirm = useServerFn(confirmBookingPayment);
  const reject = useServerFn(rejectBooking);
  const reply = useServerFn(replyToBooking);
  const [bookings, setBookings] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [unit, setUnit] = useState<Record<string, string>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const refresh = () => list().then((d: any) => setBookings(d ?? [])).catch((e: any) => toast.error(e.message ?? "Failed to load bookings"));
  useEffect(() => { refresh(); }, []);

  async function doConfirm(b: any) {
    setBusy(b.id);
    try {
      const r: any = await confirm({ data: {
        booking_id: b.id,
        apartment_no: b.apartment_code ? null : (unit[b.id] || null),
        apartment_id: b.apartment_id || null,
        message: replyText[b.id]?.trim() || null,
      } });
      toast.success(`Confirmed · ${r.apartment_code}`);
      setReplyText((x) => ({ ...x, [b.id]: "" }));
      refresh();
    } catch (e: any) { toast.error(e.message ?? "Could not confirm booking"); }
    finally { setBusy(null); }
  }

  async function doReject(b: any) {
    const reason = replyText[b.id]?.trim();
    if (!reason) return toast.error("Write a short reason/message before declining");
    if (!window.confirm("Decline this booking and email the customer?")) return;
    setBusy(b.id);
    try {
      await reject({ data: { booking_id: b.id, reason } });
      toast.success("Booking declined and customer notified");
      setReplyText((x) => ({ ...x, [b.id]: "" }));
      refresh();
    } catch (e: any) { toast.error(e.message ?? "Could not decline booking"); }
    finally { setBusy(null); }
  }

  async function doReply(b: any) {
    const text = replyText[b.id]?.trim();
    if (!text) return toast.error("Write a message first");
    setBusy(b.id);
    try {
      await reply({ data: { booking_id: b.id, message: text } });
      toast.success("Reply emailed and saved to the conversation");
      setReplyText((x) => ({ ...x, [b.id]: "" }));
    } catch (e: any) { toast.error(e.message ?? "Could not send reply"); }
    finally { setBusy(null); }
  }

  const pending = bookings.filter((b) => b.status === "pending");
  const history = bookings.filter((b) => b.status !== "pending");

  return (
    <DashboardShell title="Bookings & Payments" subtitle="Review online, cash and VIP booking requests before an apartment is assigned" role={shell.role} nav={shell.nav}>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="space-y-6">
          <Panel title="Reception queue" subtitle={`${pending.length} booking request${pending.length === 1 ? "" : "s"} awaiting a decision`}>
            {!pending.length && <div className="py-14 text-center text-sm text-noir/45"><CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-500" />No bookings waiting for Reception.</div>}
            <div className="space-y-4">
              {pending.map((b) => (
                <article key={b.id} className="rounded-2xl border border-noir/10 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-xl">{b.full_name}</h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-800"><PaymentIcon method={b.payment_method} />{b.payment_method}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${b.payment_status === "paid" || b.payment_status === "waived" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{b.payment_status}</span>
                      </div>
                      <div className="mt-2 text-sm text-noir/55">{b.email} · {b.phone || "No phone"}</div>
                      <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <Info icon={<Building2 className="h-4 w-4" />} label="Property" value={b.properties?.title} />
                        <Info icon={<CalendarDays className="h-4 w-4" />} label="Stay" value={`${b.check_in} → ${b.check_out}`} />
                        <Info icon={<CreditCard className="h-4 w-4" />} label="Amount" value={b.payment_method === "vip" ? "VIP / waived" : `${b.currency} ${Number(b.amount).toLocaleString()}`} />
                        <Info icon={<Building2 className="h-4 w-4" />} label="Apartment" value={b.apartment_code || "Reception to assign"} />
                      </div>
                      {b.notes && <div className="mt-3 rounded-xl bg-noir/[.035] px-3 py-2 text-sm text-noir/65"><b>Customer note:</b> {b.notes}</div>}
                    </div>
                  </div>

                  {!b.apartment_code && <div className="mt-4 max-w-sm"><label className="text-[11px] font-semibold uppercase tracking-wider text-noir/45">Apartment code if not preselected</label><input className="input-luxe mt-1" value={unit[b.id] ?? ""} onChange={(e) => setUnit((u) => ({ ...u, [b.id]: e.target.value }))} placeholder="e.g. A-204" /></div>}

                  <div className="mt-4 rounded-xl border border-noir/10 bg-[#fbfaf7] p-3">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-noir/45">Message to customer</label>
                    <textarea className="input-luxe mt-1 min-h-20" value={replyText[b.id] ?? ""} onChange={(e) => setReplyText((r) => ({ ...r, [b.id]: e.target.value }))} placeholder="Write a short reply. It is emailed to the customer and saved in Messages." />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button disabled={busy === b.id} onClick={() => doConfirm(b)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Approve booking</button>
                      <button disabled={busy === b.id} onClick={() => doReply(b)} className="inline-flex items-center gap-2 rounded-lg border border-noir/15 bg-white px-4 py-2 text-sm font-semibold"><MessageSquare className="h-4 w-4" />Send reply</button>
                      <button disabled={busy === b.id} onClick={() => doReject(b)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"><XCircle className="h-4 w-4" />Decline</button>
                      <Link to="/dashboard/messages" className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gold">Open conversation →</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Booking history" subtitle="Recently confirmed and declined bookings">
            <div className="divide-y divide-noir/10">
              {history.slice(0, 80).map((b) => <div key={b.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="text-sm font-semibold">{b.full_name} · {b.properties?.title}</div><div className="text-xs text-noir/45">{b.check_in} → {b.check_out} · {b.apartment_code || "—"} · {b.payment_method}</div></div><span className={`text-xs font-semibold ${b.status === "confirmed" ? "text-emerald-700" : "text-rose-600"}`}>{b.status}</span></div>)}
              {!history.length && <div className="py-8 text-center text-sm text-noir/40">No booking history yet.</div>}
            </div>
          </Panel>
        </div>

        <div className="xl:sticky xl:top-24 space-y-4">
          <Panel title="How confirmation works" subtitle="Simple, controlled and auditable">
            <ol className="space-y-3 text-sm text-noir/65">
              <li><b>1.</b> Customer selects property, apartment and dates.</li>
              <li><b>2.</b> MoMo/card must be paid online. Cash waits for Reception. VIP must already be approved.</li>
              <li><b>3.</b> Reception confirms the apartment and can include a personal reply.</li>
              <li><b>4.</b> The stay/tenancy is created only after confirmation.</li>
              <li><b>5.</b> Customer receives NOVAWORKS contact details by email.</li>
            </ol>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return <div className="rounded-xl border border-noir/8 bg-noir/[.02] p-3"><div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-noir/40">{icon}{label}</div><div className="mt-1 text-sm font-semibold text-noir">{value || "—"}</div></div>;
}
