import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Plus, LayoutDashboard, Upload, X, Loader2 } from "lucide-react";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { useAuth, dashboardPathFor } from "@/lib/use-auth";
import { createProperty, uploadPropertyFile, IMAGE_SECTIONS, type ImageSection } from "@/lib/properties-db";
import { uploadPropertyMedia, type UploadProvider } from "@/lib/r2-upload";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { notifySubscribersOfProperty } from "@/lib/email.functions";
import { fetchPropertyCategories } from "@/lib/property-types-public";
import type { PropertyTypeRow } from "@/lib/property-types.functions";
import { listStaffForAssignment } from "@/lib/customers.functions";
import { defaultPrefixFromTitle } from "@/lib/apartments.functions";

export const Route = createFileRoute("/_authenticated/dashboard/properties/new")({
  head: () => ({ meta: [{ title: "Add Property — NOVAWORKS" }] }),
  component: NewProperty,
});

const NAV = [
  { to: "/dashboard/it", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/properties", label: "All Properties", icon: Building2, group: "Content" },
  { to: "/dashboard/properties/new", label: "Add Property", icon: Plus, group: "Content" },
];

function NewProperty() {
  const { user, primaryRole, roles } = useAuth();
  const navigate = useNavigate();
  // IT and Admin may add/manage properties.
  const canManage = roles.includes("it") || roles.includes("admin");
  const role = (roles.includes("it") ? "it" : roles.includes("admin") ? "admin" : (primaryRole as any) ?? "customer");

  useEffect(() => {
    if (roles.length && !canManage) {
      toast.error("Only IT or Admin can add properties.");
      navigate({ to: dashboardPathFor((primaryRole as any) ?? "customer") });
    }
  }, [roles, canManage, primaryRole, navigate]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "residential",
    structure_mode: "standalone",
    listing_type: "sale",
    price: "",
    currency: "USD",
    bedrooms: "",
    bathrooms: "",
    area_sqm: "",
    address: "",
    city: "Kigali",
    district: "",
    lat: "",
    lng: "",
    amenities: "",
    owner_id: "",
    agent_id: "", // empty = Novaworks Agent default
    video_url: "",
    tour_3d_url: "",
    unit_count: "1",
    unit_code_prefix: "",
    is_luxury: false,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [sections, setSections] = useState<ImageSection[]>([]);
  const [blueprint, setBlueprint] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [uploadProviders, setUploadProviders] = useState<(UploadProvider | null)[]>([]);
  const notifyFn = useServerFn(notifySubscribersOfProperty);
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeRow[]>([]);
  useEffect(() => { fetchPropertyCategories().then((r) => setPropertyTypes(r.filter((x) => x.enabled))).catch(() => {}); }, []);
  const loadStaff = useServerFn(listStaffForAssignment);
  const [owners, setOwners] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    if (!canManage) return;
    loadStaff().then((rows: any[]) => {
      setOwners(rows.filter((r) => r.role === "owner"));
      setAgents(rows.filter((r) => r.role === "agent"));
    });
  }, [canManage]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v: any = (e.target as any).type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    // No arbitrary image-count limit. Each file is still validated and optimized
    // before upload so large galleries remain practical.
    const arr = Array.from(list);
    setFiles((prev) => [...prev, ...arr]);
    setPreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
    setSections((prev) => {
      const hasMain = prev.includes("main");
      const next = [...prev];
      arr.forEach(() => {
        if (!hasMain && !next.includes("main")) next.push("main");
        else next.push("other");
      });
      return next;
    });
  };

  const removeFile = (i: number) => {
    setFiles((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
    setSections((p) => p.filter((_, idx) => idx !== i));
  };

  const setSection = (i: number, s: ImageSection) =>
    setSections((p) => p.map((cur, idx) => (idx === i ? s : cur)));

  const submit = async (status: "draft" | "active") => {
    if (!user) return;
    if (!form.title.trim() || !form.price) {
      toast.error("Title and price are required");
      return;
    }
    if (!form.owner_id) {
      toast.error("Please select an owner — it is required.");
      return;
    }
    setSubmitting(true);
    setUploadProgress(files.map(() => 0));
    setUploadProviders(files.map(() => null));
    try {
      const uploads = [] as Array<{ url: string; path: string; section: ImageSection; provider: UploadProvider }>;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const section = sections[i] ?? "other";
        const r = await uploadPropertyMedia(user.id, f, section, (pct) => {
          setUploadProgress((p) => { const n = [...p]; n[i] = pct; return n; });
        });
        setUploadProviders((p) => { const n = [...p]; n[i] = r.provider; return n; });
        uploads.push({ url: r.url, path: r.path, section, provider: r.provider });
      }
      let blueprintUrl: string | null = null;
      if (blueprint) {
        const r = await uploadPropertyFile(user.id, blueprint, "blueprints");
        blueprintUrl = r.url;
      }
      let videoUrl: string | null = form.video_url.trim() || null;
      if (videoFile) {
        setVideoProgress(0);
        const r = await uploadPropertyMedia(user.id, videoFile, "video", (pct) => setVideoProgress(pct));
        videoUrl = r.url;
      }
      const unitCount = Math.max(0, Number(form.unit_count) || 0);
      const prefix = (form.unit_code_prefix.trim() || defaultPrefixFromTitle(form.title)).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "APT";
      const prop = await createProperty({
        ownerId: form.owner_id,
        agentId: form.agent_id || null, // null = Novaworks Agent default
        title: form.title.trim(),
        description: form.description.trim(),
        property_type: form.property_type,
        structure_mode: form.structure_mode,
        unit_type: form.property_type,
        listing_type: form.listing_type,
        price: Number(form.price),
        currency: form.currency,
        bedrooms: Number(form.bedrooms) || 0,
        bathrooms: Number(form.bathrooms) || 0,
        area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
        address: form.address.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        amenities: form.amenities.split(",").map((s) => s.trim()).filter(Boolean),
        status,
        notify_subscribers: true,
        video_url: videoUrl,
        tour_3d_url: form.tour_3d_url.trim() || null,
        blueprint_url: blueprintUrl,
        unit_count: unitCount,
        unit_code_prefix: prefix,
        is_luxury: form.is_luxury,
        images: uploads,
      });
      toast.success(status === "active" ? "Property published" : "Draft saved");
      if (status === "active" && prop) {
        notifyFn({ data: { propertyId: (prop as any).id } })
          .then((r: any) => toast.success(`Notified ${r.sent ?? 0} recipient(s)`))
          .catch((e) => toast.error("Notify failed: " + (e.message ?? "error")));
      }
      navigate({ to: "/dashboard/properties" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save property");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell
      title="Add New Property"
      subtitle="Fill in the details, upload media, and publish"
      role={role}
      nav={[...NAV, { to: dashboardPathFor(role), label: "Back to dashboard", icon: LayoutDashboard, group: "Overview" }]}
      actions={[
        { label: "Save Draft", onClick: () => submit("draft") },
        { label: submitting ? "Publishing…" : "Publish", icon: submitting ? Loader2 : Plus, onClick: () => submit("active"), variant: "primary" },
      ]}
    >
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Assignment" subtitle="Owner is required. Agent defaults to 'Novaworks Agent' if left blank.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Owner (required)">
                <select className="input-luxe" value={form.owner_id} onChange={update("owner_id")}>
                  <option value="">— Select owner —</option>
                  {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </Field>
              <Field label="Agent (optional)">
                <select className="input-luxe" value={form.agent_id} onChange={update("agent_id")}>
                  <option value="">Novaworks Agent (default)</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
            </div>
            {owners.length === 0 && <p className="text-xs text-rose-600 mt-2">No owners registered yet. Ask Admin to add one in <strong>Add Staff</strong>.</p>}
          </Panel>

          <Panel title="Basics" subtitle="Title, description, and type">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Title" full>
                <input className="input-luxe" value={form.title} onChange={update("title")} placeholder="Kigali Heights Luxury Penthouse" />
              </Field>
              <Field label="Property type">
                <select className="input-luxe" value={form.property_type} onChange={update("property_type")}>
                  <option value="">Select property type</option>
                  {propertyTypes.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
                </select>
              </Field>
              <Field label="Structure / inventory">
                <select className="input-luxe" value={form.structure_mode} onChange={update("structure_mode")}>
                  <option value="standalone">Standalone property / unit</option>
                  <option value="building">Building / complex with optional units</option>
                  <option value="mixed">Mixed-use building</option>
                </select>
              </Field>
              <Field label="Listing type">
                <select className="input-luxe" value={form.listing_type} onChange={update("listing_type")}>
                  <option value="sale">For sale</option>
                  <option value="rent">For rent</option>
                </select>
              </Field>
              <Field label="Price" >
                <input className="input-luxe" type="number" value={form.price} onChange={update("price")} placeholder="0" />
              </Field>
              <Field label="Currency">
                <select className="input-luxe" value={form.currency} onChange={update("currency")}>
                  <option>USD</option><option>EUR</option><option>RWF</option>
                </select>
              </Field>
              <Field label="Bedrooms"><input className="input-luxe" type="number" value={form.bedrooms} onChange={update("bedrooms")} /></Field>
              <Field label="Bathrooms"><input className="input-luxe" type="number" value={form.bathrooms} onChange={update("bathrooms")} /></Field>
              <Field label="Area (m²)"><input className="input-luxe" type="number" value={form.area_sqm} onChange={update("area_sqm")} /></Field>
              <Field label="Description" full>
                <textarea className="input-luxe min-h-32" value={form.description} onChange={update("description")} placeholder="Describe the property…" />
              </Field>
              <Field label="Amenities (comma separated)" full>
                <input className="input-luxe" value={form.amenities} onChange={update("amenities")} placeholder="Pool, Gym, 24/7 Security" />
              </Field>
            </div>
          </Panel>

          <Panel title="Location" subtitle="Address and coordinates">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Address" full><input className="input-luxe" value={form.address} onChange={update("address")} /></Field>
              <Field label="City"><input className="input-luxe" value={form.city} onChange={update("city")} /></Field>
              <Field label="District"><input className="input-luxe" value={form.district} onChange={update("district")} /></Field>
              <Field label="Latitude"><input className="input-luxe" value={form.lat} onChange={update("lat")} placeholder="-1.9536" /></Field>
              <Field label="Longitude"><input className="input-luxe" value={form.lng} onChange={update("lng")} placeholder="30.0606" /></Field>
            </div>
          </Panel>

          <Panel title="Units inside this property" subtitle="A building may have zero or many apartments/offices/studios. A standalone apartment normally has one unit. You can add/edit unit codes and images later from All Properties → Manage Units.">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Initial unit count"><input className="input-luxe" type="number" min={0} value={form.unit_count} onChange={update("unit_count")} /></Field>
              <Field label="Code prefix"><input className="input-luxe" value={form.unit_code_prefix} onChange={update("unit_code_prefix")} placeholder={defaultPrefixFromTitle(form.title || "APT")} /></Field>
              <Field label="Luxury listing">
                <label className="flex items-center gap-2 h-[42px]"><input type="checkbox" checked={form.is_luxury} onChange={update("is_luxury")} /> Requires luxury access</label>
              </Field>
            </div>
          </Panel>

          <Panel title="Video, 3D tour & blueprint" subtitle="Optional rich media — shown next to the gallery">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Video URL (YouTube / Vimeo / mp4)" full><input className="input-luxe" value={form.video_url} onChange={update("video_url")} placeholder="https://youtu.be/..." /></Field>
              <Field label="…or upload a video file (mp4 / webm) to Cloudflare R2" full>
                <input className="input-luxe" type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
                {videoFile && (
                  <div className="mt-2">
                    <div className="text-xs text-noir/60">{videoFile.name} · {(videoFile.size/1024/1024).toFixed(1)} MB</div>
                    {videoProgress !== null && (
                      <div className="mt-1 h-1.5 bg-noir/10 rounded overflow-hidden">
                        <div className="h-full bg-gold transition-all duration-150" style={{ width: `${videoProgress}%` }} />
                      </div>
                    )}
                  </div>
                )}
              </Field>
              <Field label="3D tour URL (Matterport, Kuula, etc.)" full><input className="input-luxe" value={form.tour_3d_url} onChange={update("tour_3d_url")} placeholder="https://..." /></Field>
              <Field label="Blueprint / footprint (PDF)" full>
                <input className="input-luxe" type="file" accept="application/pdf" onChange={(e) => setBlueprint(e.target.files?.[0] ?? null)} />
                {blueprint && <div className="text-xs text-noir/60 mt-1">{blueprint.name}</div>}
              </Field>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Media" subtitle="First image becomes the cover">
            <label className="border-2 border-dashed border-noir/15 rounded-xl p-6 text-center cursor-pointer block hover:border-gold transition">
              <Upload className="h-6 w-6 mx-auto text-noir/40" />
              <div className="mt-2 text-sm font-medium">Click to upload</div>
              <div className="text-xs text-noir/50">JPG, PNG, WebP · add as many images as needed · each image optimized automatically</div>
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => addFiles(e.target.files)} />
            </label>
            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={src} className="relative aspect-square rounded-md overflow-hidden bg-noir/5 group">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {i === 0 && <span className="absolute top-1 left-1 bg-gold text-noir-deep text-[10px] px-1.5 py-0.5 rounded">COVER</span>}
                    <button onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                    <select
                      value={sections[i] ?? "main"}
                      onChange={(e) => setSection(i, e.target.value as ImageSection)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-1 left-1 right-1 text-[10px] bg-black/70 text-white rounded px-1 py-0.5 outline-none border border-white/20"
                    >
                      {IMAGE_SECTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    {submitting && uploadProgress[i] !== undefined && (
                      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/40">
                        <div className="h-full bg-gold transition-all duration-150" style={{ width: `${uploadProgress[i]}%` }} />
                      </div>
                    )}
                    {submitting && uploadProgress[i] === 100 && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <span className="text-white text-xs font-medium bg-emerald-600/90 px-2 py-0.5 rounded">
                          ✓ {uploadProviders[i] === "r2" ? "R2" : uploadProviders[i] === "lovable" ? "Backup" : "Linked"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Tips" subtitle="Listings with photos perform 5× better">
            <ul className="text-sm text-noir/60 space-y-2 list-disc list-inside">
              <li>Add at least 5 high-quality photos.</li>
              <li>Set accurate coordinates for the map.</li>
              <li>Save as draft first to preview.</li>
            </ul>
          </Panel>

          <Panel title="Email notifications" subtitle="Sent automatically on publish">
            <p className="text-sm text-noir/70">
              When you click <em>Publish</em>, every verified subscriber <strong>and</strong> every staff/user
              account with an email on file is notified about this property. Drafts never notify.
            </p>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <div className="text-xs font-medium text-noir/60 mb-1.5">{label}</div>
      {children}
    </label>
  );
}