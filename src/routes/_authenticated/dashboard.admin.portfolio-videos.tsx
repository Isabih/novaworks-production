import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LayoutDashboard, Mail, Save, Plus, Trash2, Film, Play } from "lucide-react";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { MediaInput } from "@/components/dashboard/MediaInput";
import { VideoPlayer, getYouTubeId } from "@/components/site/VideoPlayer";
import {
  getPortfolioVideos,
  updatePortfolioVideos,
  type PortfolioVideo,
} from "@/lib/portfolio-videos.functions";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/admin/portfolio-videos")({
  head: () => ({ meta: [{ title: "Portfolio Videos — NOVAWORKS" }] }),
  component: () => (
    <RoleGate allow={["admin", "it"]}>
      <PortfolioVideosEdit />
    </RoleGate>
  ),
});

function newVideo(): PortfolioVideo {
  return { id: crypto.randomUUID(), title: "New video", building: "Building", url: "", poster: "", description: "" };
}

function PortfolioVideosEdit() {
  const load = useServerFn(getPortfolioVideos);
  const save = useServerFn(updatePortfolioVideos);
  const [videos, setVideos] = useState<PortfolioVideo[] | null>(null);
  const [original, setOriginal] = useState<string>("[]");
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  useEffect(() => {
    load().then((v) => {
      setVideos(v);
      setOriginal(JSON.stringify(v));
      if (v[0]) setActiveId(v[0].id);
    });
  }, []);

  if (!videos) {
    return (
      <DashboardShell title="Portfolio Videos" role="admin" nav={nav}>
        <Panel title="Loading…"><div className="py-12 text-center text-noir/50 text-sm">Fetching videos…</div></Panel>
      </DashboardShell>
    );
  }

  const dirty = JSON.stringify(videos) !== original;

  const update = (i: number, patch: Partial<PortfolioVideo>) => {
    const next = [...videos];
    next[i] = { ...next[i], ...patch };
    setVideos(next);
  };
  const add = () => {
    const v = newVideo();
    setVideos([v, ...videos]);
    setActiveId(v.id);
  };
  const remove = (i: number) => {
    const next = videos.filter((_, idx) => idx !== i);
    setVideos(next);
    if (videos[i].id === activeId) setActiveId(next[0]?.id ?? null);
    setPendingDelete(null);
    toast.success("Video removed (unsaved)");
  };

  const onSave = async () => {
    for (const v of videos) {
      if (!v.title.trim() || !v.building.trim() || !v.url.trim()) {
        return toast.error("Every video needs a building, title and URL");
      }
    }
    setSaving(true);
    try {
      await save({ data: { videos } });
      setOriginal(JSON.stringify(videos));
      toast.success("Portfolio videos saved");
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  const active = videos.find((v) => v.id === activeId);

  return (
    <DashboardShell
      title="Portfolio Videos"
      subtitle="Curate the building walkthroughs shown at /portfolio/videos"
      role="admin"
      nav={nav}
      actions={[{ label: saving ? "Saving…" : dirty ? "Save changes" : "Saved", icon: Save, variant: "primary", onClick: onSave }]}
    >
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Panel title={active ? `Edit · ${active.building}` : "No video selected"} subtitle="Live preview updates as you type">
          {active ? (
            <div className="space-y-4">
              <VideoPlayer url={active.url} title={active.title} poster={active.poster} />
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Building">
                  <input className="input-luxe" value={active.building}
                    onChange={(e) => update(videos.indexOf(active), { building: e.target.value })} />
                </Field>
                <Field label="Title">
                  <input className="input-luxe" value={active.title}
                    onChange={(e) => update(videos.indexOf(active), { title: e.target.value })} />
                </Field>
              </div>
              <Field label="Video URL (YouTube, Vimeo, or direct .mp4)">
                <input className="input-luxe" value={active.url} placeholder="https://youtube.com/watch?v=…"
                  onChange={(e) => update(videos.indexOf(active), { url: e.target.value })} />
                {active.url && !getYouTubeId(active.url) && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(active.url) && (
                  <p className="text-[11px] text-amber-600 mt-1">Heads up: this URL may not be a recognised video link.</p>
                )}
              </Field>
              <Field label="Description (optional)">
                <textarea rows={3} className="input-luxe" value={active.description ?? ""}
                  onChange={(e) => update(videos.indexOf(active), { description: e.target.value })} />
              </Field>
              <div>
                <div className="text-xs text-noir/60 mb-1.5">Custom poster (optional — overrides YouTube thumbnail)</div>
                <div className="max-w-[260px]">
                  <MediaInput
                    value={active.poster ?? ""}
                    onChange={(url) => update(videos.indexOf(active), { poster: url })}
                    subdir="portfolio-videos/posters"
                    aspect="aspect-video"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-noir/10">
                <button
                  onClick={() => setPendingDelete(videos.indexOf(active))}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove this video
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-noir/50 text-sm">Add a video to begin.</div>
          )}
        </Panel>

        <Panel
          title={`Videos (${videos.length})`}
          subtitle="Drag-free list — click to edit"
          action={
            <button onClick={add} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-noir-deep text-white">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          }
        >
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {videos.map((v, i) => {
              const yt = getYouTubeId(v.url);
              const thumb = v.poster || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : "");
              return (
                <div
                  key={v.id}
                  className={`flex gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    v.id === activeId ? "bg-gold/10 border-gold/40" : "bg-white border-noir/10 hover:border-noir/30"
                  }`}
                  onClick={() => setActiveId(v.id)}
                >
                  <div className="relative w-24 aspect-video rounded bg-noir/10 overflow-hidden shrink-0">
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-noir/30">
                        <Film className="w-4 h-4" />
                      </div>
                    )}
                    <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 hover:opacity-100">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-gold truncate">{v.building || "—"}</div>
                    <div className="text-sm font-medium text-noir line-clamp-2">{v.title || "Untitled"}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPendingDelete(i); }}
                    className="self-start p-1 text-red-500 hover:bg-red-50 rounded"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            {videos.length === 0 && (
              <p className="text-sm text-noir/50 text-center py-6">No videos yet — click "Add".</p>
            )}
          </div>
        </Panel>
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this video?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete !== null && (
                <>This will remove <strong>{videos[pendingDelete]?.title}</strong> from the gallery. The change is unsaved until you click <em>Save changes</em>.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete !== null && remove(pendingDelete)} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}

const nav = [
  { to: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/admin/contact-edit", label: "Contact Page", icon: Mail, group: "Content" },
  { to: "/dashboard/admin/portfolio-videos", label: "Portfolio Videos", icon: Film, group: "Content" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-xs font-medium text-noir/60 mb-1">{label}</div>{children}</label>;
}