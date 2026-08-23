import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { BUYER_NAV } from "@/components/dashboard/nav-config";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, AlertCircle, Clock, CheckCircle2, Plus, X, Search, Heart, Eye,
  Bookmark, LayoutDashboard, CalendarCheck, Settings as SettingsIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { listMyServiceRequests, createServiceRequest, getMyCustomerRecord } from "@/lib/service-requests.functions";
import { listServiceCatalog } from "@/lib/service-catalog.functions";

export const Route = createFileRoute("/_authenticated/dashboard/buyer/service-requests")({
  head: () => ({ meta: [{ title: "Service Requests — NOVAWORKS" }] }),
  component: () => (
    <RoleGate allow={["customer"]}>
      <ServiceRequestsPage />
    </RoleGate>
  ),
});



const CATEGORIES = [
  { value: "maintenance", label: "Maintenance" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "cleaning", label: "Cleaning" },
  { value: "security", label: "Security" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
] as const;

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-sky-50 text-sky-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-noir/5 text-noir/60",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-noir/5 text-noir/70",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 animate-pulse",
};

function ServiceRequestsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listMyServiceRequests);
  const me = useServerFn(getMyCustomerRecord);
  const create = useServerFn(createServiceRequest);
  const catalogFn = useServerFn(listServiceCatalog);

  const { data: requests = [] } = useQuery({ queryKey: ["my-service-requests"], queryFn: () => list() });
  const { data: customer } = useQuery({ queryKey: ["my-customer"], queryFn: () => me() });
  const { data: catalog = [] } = useQuery({ queryKey: ["service-catalog"], queryFn: () => catalogFn() });

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r: any) => r.status === "pending").length,
    in_progress: requests.filter((r: any) => r.status === "in_progress").length,
    completed: requests.filter((r: any) => r.status === "completed").length,
  }), [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r: any) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q && !(r.title + " " + r.description).toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [requests, q, statusFilter]);

  const createMut = useMutation({
    mutationFn: (data: { title: string; description: string; category: any; priority: any }) =>
      create({ data }),
    onSuccess: () => {
      toast.success("Service request submitted");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my-service-requests"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to submit"),
  });

  const canRequest = customer?.is_currently_staying === true;

  return (
    <DashboardShell
      title="Service Requests"
      subtitle="Submit and track your service requests"
      role="customer"
      nav={BUYER_NAV}
      actions={canRequest ? [{ label: "New Request", icon: Plus, variant: "primary", onClick: () => setOpen(true) }] : []}
    >
      {!customer && (
        <div className="mb-6 rounded-2xl bg-white border border-noir/5 p-5 text-sm text-noir/70">
          We couldn't find an active stay linked to your email. Please contact reception to register your stay before submitting service requests.
        </div>
      )}
      {customer && !canRequest && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-5 text-sm text-amber-800">
          Service requests are available only during your active stay
          {customer.stay_start && customer.stay_end
            ? ` (${customer.stay_start} → ${customer.stay_end}).`
            : "."}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Total Requests" value={String(stats.total)} />
        <StatCard icon={AlertCircle} label="Pending" value={String(stats.pending)} />
        <StatCard icon={Clock} label="In Progress" value={String(stats.in_progress)} />
        <StatCard icon={CheckCircle2} label="Completed" value={String(stats.completed)} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-noir/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search requests..."
            className="w-full rounded-lg bg-white border border-noir/10 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-gold/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg bg-white border border-noir/10 px-3 py-2.5 text-sm focus:outline-none focus:border-gold/50 min-w-[160px]"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl bg-white border border-noir/5 p-10 text-center text-sm text-noir/50">
            No requests yet.{canRequest && " Tap New Request to submit one."}
          </div>
        )}
        {filtered.map((r: any) => {
          const Icon = r.status === "completed" ? CheckCircle2 : r.status === "in_progress" ? Clock : AlertCircle;
          const iconColor =
            r.status === "completed" ? "text-emerald-600"
            : r.status === "in_progress" ? "text-sky-600"
            : r.priority === "urgent" ? "text-rose-600"
            : "text-amber-600";
          return (
            <article
              key={r.id}
              className={`rounded-2xl bg-white border p-5 shadow-sm transition hover:shadow-md ${
                r.priority === "urgent" && r.status === "pending" ? "border-rose-200" : "border-noir/5"
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg text-noir-deep truncate">{r.title}</h3>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${STATUS_BADGE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md capitalize ${PRIORITY_BADGE[r.priority]}`}>
                        {r.priority}
                      </span>
                    </div>
                    <p className="text-sm text-noir/70 mt-1 line-clamp-2">{r.description}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-noir/50">
                      <span>Category: <span className="text-noir/80 capitalize">{r.category}</span></span>
                      {r.customers?.properties?.title && (
                        <span>Property: <span className="text-noir/80">{r.customers.properties.title}</span></span>
                      )}
                      <span>Created: <span className="text-noir/80">{new Date(r.created_at).toISOString().slice(0, 10)}</span></span>
                    </div>
                  </div>
                </div>
                {r.admin_response && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md shrink-0">
                    <MessageSquare className="h-3 w-3" /> Admin Responded
                  </span>
                )}
              </div>
              {(r.admin_response||r.expected_at) && (
                <div className="mt-3 ml-8 text-sm text-noir/80 bg-emerald-50/40 border-l-2 border-emerald-300 pl-3 py-1.5">
                  {r.admin_response && <div>{r.admin_response}</div>}
                  {r.expected_at && <div className="mt-1 text-xs"><b>Expected action:</b> {new Date(r.expected_at).toLocaleString()}</div>}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {open && (
        <NewRequestModal
          onClose={() => setOpen(false)}
          onSubmit={(d) => createMut.mutate(d)}
          submitting={createMut.isPending}
          catalog={catalog.filter((x:any)=>x.active)}
        />
      )}
    </DashboardShell>
  );
}

function NewRequestModal({
  onClose,
  onSubmit,
  submitting,
  catalog,
}: {
  onClose: () => void;
  onSubmit: (d: { title: string; description: string; category: any; priority: any; service_catalog_id?: string }) => void;
  submitting: boolean;
  catalog: any[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [priority, setPriority] = useState<string>("medium");
  const [serviceId, setServiceId] = useState<string>("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-req-title"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-noir/5">
          <h2 id="new-req-title" className="font-display text-xl text-noir-deep">Submit New Service Request</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 text-noir/50 hover:text-noir-deep">
            <X className="h-5 w-5" />
          </button>
        </header>

        <form
          className="px-6 py-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !description.trim() || !category) {
              toast.error("Please fill in title, category and description");
              return;
            }
            onSubmit({ title: title.trim(), description: description.trim(), category, priority, service_catalog_id: serviceId || undefined });
          }}
        >
          <div>
            <label className="block text-sm font-medium text-noir-deep mb-1.5">Service needed</label>
            <select className="w-full rounded-lg border border-noir/15 px-3 py-2.5 text-sm bg-white" value={serviceId} onChange={(e)=>{const id=e.target.value;setServiceId(id);const item=catalog.find(x=>x.id===id);if(item){setTitle(item.name);setCategory(item.category||"general");setPriority(item.default_priority||"medium")}else{setTitle("");setCategory("other")}}}>
              <option value="">Other / type my own request</option>
              {catalog.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="sr-title" className="block text-sm font-medium text-noir-deep mb-1.5">Title</label>
            <input
              id="sr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              maxLength={140}
              className="w-full rounded-lg border border-noir/15 px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sr-cat" className="block text-sm font-medium text-noir-deep mb-1.5">Category</label>
              <select
                id="sr-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-noir/15 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gold"
                required
              >
                <option value="" disabled>Select category</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sr-pri" className="block text-sm font-medium text-noir-deep mb-1.5">Priority</label>
              <select
                id="sr-pri"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-noir/15 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gold"
              >
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="sr-desc" className="block text-sm font-medium text-noir-deep mb-1.5">Description</label>
            <textarea
              id="sr-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Provide detailed information about your request..."
              className="w-full rounded-lg border border-noir/15 px-3 py-2.5 text-sm focus:outline-none focus:border-gold resize-y"
              required
            />
          </div>

          {priority === "urgent" && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2">
              Marking as <strong>urgent</strong> will immediately alert reception and admins by email and notification.
            </div>
          )}

          <footer className="flex items-center justify-end gap-2 pt-2 border-t border-noir/5 -mx-6 px-6 mt-5">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-noir-deep hover:bg-noir/5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gold text-noir-deep hover:bg-gold-soft disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}