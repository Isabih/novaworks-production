import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LayoutDashboard, ShieldCheck, RefreshCw, Image as ImageIcon, Video, ExternalLink, CheckCircle2, XCircle, Building2, Loader2 } from "lucide-react";
import { DashboardShell, Panel, StatCard } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { useAuth } from "@/lib/use-auth";
import { verifyPropertyMedia, type MediaCheckResult } from "@/lib/media-verify.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/it/media-verify")({
  head: () => ({ meta: [{ title: "Media Verification — NOVAWORKS" }] }),
  component: () => (
    <RoleGate allow={["it", "admin"]}>
      <MediaVerifyPage />
    </RoleGate>
  ),
});

const NAV = [
  { to: "/dashboard/it", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/properties", label: "Properties", icon: Building2, group: "Content" },
  { to: "/dashboard/it/media-verify", label: "Media Verification", icon: ShieldCheck, group: "Content" },
];

function MediaVerifyPage() {
  const { roles } = useAuth();
  const role = roles.includes("admin") ? "admin" : "it";
  const verify = useServerFn(verifyPropertyMedia);
  const [results, setResults] = useState<MediaCheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [ranOnce, setRanOnce] = useState(false);
  const [filter, setFilter] = useState<"all" | "broken" | "images" | "videos">("all");

  const run = async () => {
    setLoading(true);
    try {
      const res = await verify({ data: {} });
      setResults(res.results);
      setRanOnce(true);
      toast.success(`Checked ${res.checked} files — ${res.broken} broken`);
    } catch (e: any) {
      toast.error(e?.message ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const total = results.length;
  const broken = results.filter((r) => !r.ok).length;
  const imgs = results.filter((r) => r.kind === "image").length;
  const vids = results.filter((r) => r.kind === "video").length;

  const filtered = results.filter((r) => {
    if (filter === "broken") return !r.ok;
    if (filter === "images") return r.kind === "image";
    if (filter === "videos") return r.kind === "video";
    return true;
  });

  return (
    <DashboardShell
      title="Media Verification"
      subtitle="Check that every property image and video is publicly reachable"
      role={role as any}
      nav={NAV}
      actions={[
        { label: loading ? "Checking…" : ranOnce ? "Re-run check" : "Run check", icon: RefreshCw, onClick: run, variant: "primary" },
      ]}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShieldCheck} label="Files checked" value={String(total)} sublabel={ranOnce ? "Last scan" : "Click Run check"} />
        <StatCard icon={XCircle} label="Broken" value={String(broken)} sublabel="Failed HEAD" delta={broken ? { value: `${broken}`, positive: false } : undefined} />
        <StatCard icon={ImageIcon} label="Images" value={String(imgs)} sublabel="Across all properties" />
        <StatCard icon={Video} label="Videos" value={String(vids)} sublabel="Including YouTube" />
      </div>

      <div className="mt-6">
        <Panel
          title="Results"
          subtitle={ranOnce ? `${broken} broken of ${total}` : "Run a check to see results"}
          action={
            <div className="flex gap-1 text-xs">
              {(["all", "broken", "images", "videos"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md transition ${
                    filter === f ? "bg-noir-deep text-white" : "bg-noir/5 text-noir-deep hover:bg-noir/10"
                  }`}
                >
                  {f === "all" ? "All" : f === "broken" ? `Broken (${broken})` : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          }
        >
          {loading ? (
            <div className="py-16 flex items-center justify-center text-noir/50 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Checking media URLs…
            </div>
          ) : !ranOnce ? (
            <div className="py-16 text-center text-sm text-noir/50">No scan yet. Click "Run check" above.</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-noir/50">No items match this filter.</div>
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-noir/40 border-b border-noir/5">
                  <tr>
                    <th className="px-5 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Property</th>
                    <th className="px-3 py-2 font-medium">Section</th>
                    <th className="px-3 py-2 font-medium">URL</th>
                    <th className="px-3 py-2 font-medium text-right">Size</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-noir/5">
                  {filtered.map((r, i) => (
                    <tr key={`${r.url}-${i}`} className={r.ok ? "" : "bg-rose-50/40"}>
                      <td className="px-5 py-3">
                        {r.ok ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                            <CheckCircle2 className="h-4 w-4" /> {r.status || "OK"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-600 text-xs font-medium">
                            <XCircle className="h-4 w-4" /> {r.status || "ERR"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {r.kind === "image" ? (
                          <ImageIcon className="h-4 w-4 text-noir/40" />
                        ) : (
                          <Video className="h-4 w-4 text-noir/40" />
                        )}
                      </td>
                      <td className="px-3 py-3 text-noir-deep">{r.property_title ?? "—"}</td>
                      <td className="px-3 py-3 text-noir/60 text-xs">{r.section ?? "—"}</td>
                      <td className="px-3 py-3">
                        <span className="block max-w-[28rem] truncate text-noir/70 text-xs font-mono">{r.url}</span>
                        {r.error && <span className="block text-rose-600 text-xs mt-0.5">{r.error}</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-noir/50">
                        {r.bytes ? formatBytes(r.bytes) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-gold hover:underline">
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
