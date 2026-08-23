import { useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Youtube, Film, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** When true allow empty string (treated as valid) */
  allowEmpty?: boolean;
}

export type VideoKind = "youtube" | "vimeo" | "mp4" | "webm" | null;

export function parseVideoUrl(url: string): { kind: VideoKind; embed: string | null; id?: string } {
  const u = url.trim();
  if (!u) return { kind: null, embed: null };
  // YouTube
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { kind: "youtube", id: yt[1], embed: `https://www.youtube.com/embed/${yt[1]}?rel=0` };
  // Vimeo
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "vimeo", id: vm[1], embed: `https://player.vimeo.com/video/${vm[1]}` };
  // Direct file
  if (/\.mp4(\?|$)/i.test(u)) return { kind: "mp4", embed: u };
  if (/\.webm(\?|$)/i.test(u)) return { kind: "webm", embed: u };
  return { kind: null, embed: null };
}

export function VideoUrlInput({ value, onChange, placeholder, allowEmpty = true }: Props) {
  const parsed = useMemo(() => parseVideoUrl(value), [value]);
  const isEmpty = !value.trim();
  const valid = isEmpty ? allowEmpty : parsed.kind !== null;
  const [confirm, setConfirm] = useState(false);
  const lastValueRef = useRef(value);

  function requestClear() {
    if (isEmpty) return;
    setConfirm(true);
  }

  function doClear() {
    const previous = value;
    lastValueRef.current = previous;
    onChange("");
    setConfirm(false);
    toast.success("Video removed", {
      description: "Save to apply. You can undo within 8 seconds.",
      duration: 8000,
      action: { label: "Undo", onClick: () => onChange(previous) },
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {parsed.kind === "youtube" ? (
          <Youtube className="w-5 h-5 text-red-600 shrink-0" />
        ) : (
          <Film className="w-5 h-5 text-noir/60 shrink-0" />
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "YouTube, Vimeo, or .mp4 URL"}
          className={`flex-1 bg-white border rounded-md px-3 py-2 text-sm ${valid ? "border-noir/10" : "border-red-400"}`}
        />
        {!isEmpty && (
          <button
            type="button"
            onClick={requestClear}
            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 px-2 py-1.5 rounded hover:bg-red-50"
            aria-label="Remove video"
          >
            <X className="w-3.5 h-3.5" /> Remove
          </button>
        )}
        {!isEmpty && (
          valid ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /> {parsed.kind}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="w-4 h-4" /> invalid
            </span>
          )
        )}
      </div>
      {confirm && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-sm space-y-3">
          <div className="text-noir font-medium">Remove this video?</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-noir/60">Before</div>
              <div className="aspect-video rounded overflow-hidden bg-noir ring-1 ring-noir/10">
                {parsed.embed ? (
                  parsed.kind === "mp4" || parsed.kind === "webm" ? (
                    <video src={parsed.embed} muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <iframe src={parsed.embed} className="w-full h-full pointer-events-none" title="Before" />
                  )
                ) : (
                  <div className="w-full h-full grid place-items-center text-white/50 text-xs break-all px-2">{value}</div>
                )}
              </div>
              <div className="text-[10px] text-noir/60 truncate" title={value}>{value}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-red-600">After</div>
              <div className="aspect-video rounded overflow-hidden bg-red-100 ring-1 ring-red-300 grid place-items-center text-red-700">
                <div className="flex flex-col items-center gap-1">
                  <X className="w-5 h-5" />
                  <span className="text-[10px]">No video</span>
                </div>
              </div>
              <div className="text-[10px] text-red-600">Cleared — falls back to image slideshow.</div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirm(false)} className="px-3 py-1.5 rounded bg-white border border-noir/10 text-xs hover:bg-noir/5">
              Cancel
            </button>
            <button onClick={doClear} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700">
              Remove video
            </button>
          </div>
        </div>
      )}
      {!valid && !isEmpty && (
        <p className="text-xs text-red-600">
          Supported: youtube.com / youtu.be links, vimeo.com links, or direct .mp4 / .webm URLs.
        </p>
      )}
      {valid && !isEmpty && parsed.embed && (
        <div className="aspect-video w-full max-w-md bg-noir rounded overflow-hidden">
          {parsed.kind === "mp4" || parsed.kind === "webm" ? (
            <video src={parsed.embed} controls muted playsInline className="w-full h-full object-cover" />
          ) : (
            <iframe
              src={parsed.embed}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Video preview"
            />
          )}
        </div>
      )}
    </div>
  );
}