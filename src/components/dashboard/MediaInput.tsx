import { useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon, Replace, ArrowRight } from "lucide-react";
import { uploadPropertyMedia } from "@/lib/r2-upload";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";
import { cfImage } from "@/lib/cf-image";

interface Props {
  value: string;
  onChange: (url: string) => void;
  subdir?: string;
  aspect?: string; // tailwind aspect class
  label?: string;
  accept?: string;
  /** Max file size in MB (default 20) */
  maxSizeMB?: number;
  /** Optional explicit user id (used as the storage path prefix). Falls back to the signed-in user. */
  userId?: string | null;
  /** Constrain the preview box without changing the saved image. */
  previewClassName?: string;
}

/**
 * Combined URL input + cloud upload + live preview.
 * Uploads files to R2 via the existing uploadPropertyMedia helper.
 */
export function MediaInput({
  value,
  onChange,
  subdir = "site",
  aspect = "aspect-[4/3]",
  label,
  accept = "image/*",
  maxSizeMB = 20,
  userId: userIdProp,
  previewClassName = "max-w-xl",
}: Props) {
  const { user } = useAuth();
  const [pct, setPct] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingNew, setPendingNew] = useState<string | null>(null);
  const [pendingPrev, setPendingPrev] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    // Resolve the storage-path owner. Prefer the explicit prop (e.g. admin uploading
    // for another user), then the auth context, finally a fresh session read.
    const ownerId = userIdProp ?? user?.id ?? null;
    if (!ownerId) {
      toast.error("Sign in to upload");
      return;
    }
    // Client-side validation
    const isImg = accept.includes("image");
    const isVid = accept.includes("video");
    if (isImg && !file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (isVid && !file.type.startsWith("video/")) {
      toast.error("Please choose a video file");
      return;
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${maxSizeMB} MB.`);
      return;
    }
    const previous = value;
    setPct(0);
    try {
      const res = await uploadPropertyMedia(ownerId, file, subdir, setPct);
      if (previous) {
        // Show before/after diff overlay before committing the replace
        setPendingPrev(previous);
        setPendingNew(res.url);
      } else {
        onChange(res.url);
        toast.success("Uploaded");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setPct(null);
    }
  }

  function confirmReplace() {
    if (!pendingNew) return;
    const prev = pendingPrev;
    const next = pendingNew;
    onChange(next);
    setPendingNew(null);
    setPendingPrev("");
    toast.success("Image replaced", {
      description: "Save to apply. You can undo within 8 seconds.",
      duration: 8000,
      action: { label: "Undo", onClick: () => onChange(prev) },
    });
  }

  function cancelReplace() {
    setPendingNew(null);
    setPendingPrev("");
    toast.info("Replacement cancelled");
  }

  function doClear() {
    const previous = value;
    onChange("");
    setConfirmClear(false);
    toast.success("Image removed", {
      description: "Save to apply. You can undo within 8 seconds.",
      duration: 8000,
      action: { label: "Undo", onClick: () => onChange(previous) },
    });
  }

  const uploading = pct !== null;

  return (
    <div className="space-y-2">
      {label && <div className="text-xs text-noir/60">{label}</div>}
      <div className={`relative ${aspect} ${previewClassName} bg-noir/5 rounded-xl overflow-hidden border border-noir/10`}>
        {value ? (
          <>
            <img src={cfImage(value,{width:900,quality:72,fit:"cover"})} onError={(e)=>{const el=e.currentTarget;if(el.src!==value)el.src=value}} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-noir-deep/70 text-white grid place-items-center hover:bg-noir-deep"
              aria-label="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {confirmClear && (
              <div className="absolute inset-0 bg-noir-deep/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white p-3 text-center">
                <div className="text-sm font-medium">Remove this image?</div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-[260px]">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-white/60">Before</div>
                    <div className="aspect-[4/3] rounded overflow-hidden ring-1 ring-white/20">
                      <img src={value} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-red-300">After</div>
                    <div className="aspect-[4/3] rounded overflow-hidden bg-red-900/40 ring-1 ring-red-400/40 flex flex-col items-center justify-center text-red-200">
                      <ImageIcon className="w-5 h-5 opacity-60" />
                      <span className="text-[10px] mt-1">Empty</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-white/60">8-second undo after confirming.</div>
                <div className="flex gap-2">
                  <button
                    onClick={doClear}
                    className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {pendingNew && (
              <div className="absolute inset-0 bg-noir-deep/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white p-3 text-center">
                <div className="text-sm font-medium">Replace this image?</div>
                <div className="flex items-center gap-2 w-full max-w-[300px]">
                  <div className="flex-1 space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-white/60">Before</div>
                    <div className="aspect-[4/3] rounded overflow-hidden ring-1 ring-white/20">
                      <img src={pendingPrev} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gold shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-gold">After</div>
                    <div className="aspect-[4/3] rounded overflow-hidden ring-1 ring-gold/50">
                      <img src={pendingNew} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={confirmReplace} className="px-3 py-1.5 rounded bg-gold text-noir-deep text-xs font-medium hover:brightness-110">
                    Confirm replace
                  </button>
                  <button onClick={cancelReplace} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-noir/40 text-xs gap-1">
            <ImageIcon className="w-6 h-6" />
            <span>No image</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-noir-deep/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 className="w-5 h-5 animate-spin" />
            <div className="w-2/3 h-1.5 bg-white/20 rounded overflow-hidden">
              <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-[11px]">{pct}%</div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Image URL or upload below"
          className="flex-1 bg-noir/5 rounded px-3 py-2 text-sm"
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-noir text-white text-xs font-medium hover:bg-noir-deep disabled:opacity-50"
        >
          {value ? <Replace className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
          {value ? "Replace" : "Upload"}
        </button>
      </div>
    </div>
  );
}