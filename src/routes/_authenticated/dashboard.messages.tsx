import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, Mail, MessageSquare, Plus, Search, Send, UserRound, X } from "lucide-react";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { navForRoles } from "@/components/dashboard/nav-config";
import { useAuth } from "@/lib/use-auth";
import { createCommunication, getCommunicationMessages, listCommunicationThreads, sendCommunicationMessage } from "@/lib/communications.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/messages")({
  head: () => ({ meta: [{ title: "Messages — NOVAWORKS" }] }),
  component: () => <RoleGate allow={["it","admin","receptionist","agent"]}><MessagesWorkspace/></RoleGate>,
});

function MessagesWorkspace() {
  const { roles } = useAuth();
  const shell = navForRoles(roles);
  const staff = roles.some((r) => ["it", "admin", "receptionist"].includes(r));
  const list = useServerFn(listCommunicationThreads);
  const getMessages = useServerFn(getCommunicationMessages);
  const create = useServerFn(createCommunication);
  const send = useServerFn(sendCommunicationMessage);

  const [threads, setThreads] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState({ email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    const data: any = await list();
    setThreads(data ?? []);
    setActive((current: any) => current ? (data ?? []).find((x: any) => x.id === current.id) ?? current : (data?.[0] ?? null));
  };

  useEffect(() => { refresh().catch(() => {}); }, []);
  useEffect(() => {
    if (!active?.id) { setMessages([]); return; }
    getMessages({ data: { thread_id: active.id } }).then((x: any) => setMessages(x ?? [])).catch(() => setMessages([]));
  }, [active?.id]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => `${t.subject} ${t.external_email || ""} ${t.last_body || ""}`.toLowerCase().includes(q));
  }, [threads, search]);

  async function sendReply() {
    if (!active || !text.trim()) return;
    setSending(true);
    try {
      await send({ data: { thread_id: active.id, message: text.trim() } });
      setText("");
      setMessages(await getMessages({ data: { thread_id: active.id } }) as any);
      await refresh();
      toast.success(staff && active.external_email ? "Reply emailed and saved" : "Message sent");
    } catch (e: any) { toast.error(e.message ?? "Could not send message"); }
    finally { setSending(false); }
  }

  async function createNew() {
    if (!draft.email || !draft.subject || !draft.message.trim()) return toast.error("Complete recipient, subject and message");
    setSending(true);
    try {
      const r: any = await create({ data: draft });
      toast.success("Email sent from NOVAWORKS");
      setCompose(false);
      setDraft({ email: "", subject: "", message: "" });
      await refresh();
      const all: any = await list();
      const next = all?.find((x: any) => x.id === r.id);
      if (next) setActive(next);
    } catch (e: any) { toast.error(e.message ?? "Could not send email"); }
    finally { setSending(false); }
  }

  return (
    <DashboardShell title="Messages" subtitle={staff ? "NOVAWORKS mail workspace · booking chats and incoming email · retained for 7 days" : "Your NOVAWORKS conversations"} role={shell.role} nav={shell.nav}>
      <div className="overflow-hidden rounded-2xl border border-noir/8 bg-white shadow-sm lg:grid lg:grid-cols-[360px_minmax(0,1fr)] min-h-[650px]">
        <aside className="border-b border-noir/8 bg-[#fbfaf7] lg:border-b-0 lg:border-r">
          <div className="border-b border-noir/8 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><div className="font-semibold">Inbox</div><div className="text-[11px] text-noir/45">{threads.length} conversation{threads.length === 1 ? "" : "s"}</div></div>
              {staff && <button onClick={() => setCompose(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-noir-deep px-3 text-xs font-semibold text-white shadow-sm hover:-translate-y-0.5 transition"><Plus className="h-3.5 w-3.5" />New</button>}
            </div>
            <div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-noir/30"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mail or booking…" className="w-full rounded-xl border border-noir/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gold/50"/></div>
          </div>
          <div className="max-h-[570px] overflow-y-auto p-2">
            {visible.map((t) => <button key={t.id} onClick={() => { setCompose(false); setActive(t); }} className={`mb-1 w-full rounded-xl p-3 text-left transition ${active?.id === t.id && !compose ? "bg-gold/12 ring-1 ring-gold/25" : "hover:bg-white"}`}>
              <div className="flex items-start gap-3"><div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.kind === "booking" ? "bg-gold/15 text-gold-dark" : "bg-noir/5 text-noir/55"}`}>{t.kind === "booking" ? <MessageSquare className="h-4 w-4"/> : <Mail className="h-4 w-4"/>}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><div className={`truncate text-sm ${t.unread_count>0?"font-bold":"font-semibold"}`}>{t.unread_count>0&&<span className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-500"/>}{t.subject}</div><div className="shrink-0 text-[10px] text-noir/35">{t.last_message_at ? new Date(t.last_message_at).toLocaleDateString() : ""}</div></div><div className="mt-0.5 flex items-center gap-2 truncate text-xs text-noir/45"><span className="truncate">{t.external_email || t.booking_name || "Internal"}</span>{t.unread_count>0&&<span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{t.unread_count}</span>}</div><div className="mt-1 line-clamp-1 text-[11px] text-noir/40">{t.last_body || "No messages yet"}</div></div></div>
            </button>)}
            {!visible.length && <div className="py-16 text-center text-sm text-noir/35"><Inbox className="mx-auto mb-2 h-7 w-7"/>No conversations found.</div>}
          </div>
        </aside>

        <section className="flex min-h-[650px] flex-col bg-white">
          {compose ? <>
            <div className="flex items-center justify-between border-b border-noir/8 px-5 py-4"><div><div className="font-semibold">New email</div><div className="text-xs text-noir/45">Sent with the NOVAWORKS branded email template</div></div><button onClick={() => setCompose(false)} className="rounded-lg p-2 hover:bg-noir/5"><X className="h-4 w-4"/></button></div>
            <div className="mx-auto w-full max-w-3xl space-y-4 p-6"><label className="block"><span className="text-[11px] font-semibold uppercase tracking-wider text-noir/45">To</span><input className="input-luxe mt-1" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="receiver@example.com"/></label><label className="block"><span className="text-[11px] font-semibold uppercase tracking-wider text-noir/45">Subject</span><input className="input-luxe mt-1" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Subject"/></label><label className="block"><span className="text-[11px] font-semibold uppercase tracking-wider text-noir/45">Message</span><textarea className="input-luxe mt-1 min-h-56" value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} placeholder="Write your message…"/></label><button disabled={sending} onClick={createNew} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-soft to-gold px-5 py-2.5 text-sm font-semibold text-noir-deep disabled:opacity-50"><Send className="h-4 w-4"/>{sending ? "Sending…" : "Send email"}</button></div>
          </> : active ? <>
            <div className="border-b border-noir/8 px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gold/12 text-gold-dark"><UserRound className="h-4 w-4"/></div><div className="min-w-0"><div className="font-semibold truncate">{active.subject}</div><div className="text-xs text-noir/45 truncate">{active.external_email || "NOVAWORKS conversation"}</div></div></div></div>
            <div className="flex-1 overflow-y-auto bg-[#fbfaf7] p-5"><div className="mx-auto max-w-3xl space-y-3">{messages.map((m) => <div key={m.id} className={`flex ${m.direction === "inbound" ? "justify-start" : "justify-end"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${m.direction === "inbound" ? "rounded-tl-md border border-noir/8 bg-white" : "rounded-tr-md bg-gold/15 text-noir-deep"}`}><div className="mb-1 text-[10px] font-medium text-noir/40">{m.sender_name || m.sender_email || "NOVAWORKS"} · {new Date(m.created_at).toLocaleString()}</div><div className="whitespace-pre-wrap leading-relaxed">{m.body}</div></div></div>)}</div></div>
            <div className="border-t border-noir/8 bg-white p-4"><div className="mx-auto flex max-w-3xl items-end gap-2"><textarea value={text} onChange={(e) => setText(e.target.value)} className="input-luxe min-h-14 max-h-36 resize-y" placeholder={staff && active.external_email ? "Reply by email…" : "Write a message…"}/><button disabled={sending || !text.trim()} onClick={sendReply} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold text-noir-deep disabled:opacity-40"><Send className="h-4 w-4"/></button></div></div>
          </> : <div className="grid flex-1 place-items-center text-center text-noir/35"><div><MessageSquare className="mx-auto mb-3 h-10 w-10"/><div className="font-display text-xl text-noir/55">Choose a conversation</div><div className="mt-1 text-sm">Booking replies and incoming emails appear here.</div></div></div>}
        </section>
      </div>
    </DashboardShell>
  );
}
