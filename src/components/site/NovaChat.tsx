import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles, Phone, Mail } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const ESCALATE_PATTERNS = [
  // explicit asks
  /\b(human|agent|receptionist|reception|admin|support|manager|staff|someone|talk to (a )?person|contact)\b/i,
  // dissatisfaction
  /\b(not (satisfied|happy|working)|unhappy|disappoint|complain|frustrat|angry|useless|stupid|terrible|awful|bad service)\b/i,
  // explicit help
  /\b(help me|i need help|escalate|urgent|emergency|refund|cancel|problem|issue|broken|doesn'?t work|can'?t (login|sign|access|find))\b/i,
  // languages
  /\b(mfasha|ndakeneye ubufasha|aide|aidez)\b/i,
];

function shouldEscalate(userText: string, assistantText: string) {
  const blob = `${userText}\n${assistantText}`;
  return ESCALATE_PATTERNS.some((re) => re.test(blob));
}

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi! I'm **NOVA AI** ✨ — your guide to NOVAWORKS. I can help you find properties, explain how Luxury Access works, or connect you with our team. What are you looking for today?",
};

export function NovaChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(localStorage.getItem("novaworks_session") ? { Authorization: `Bearer ${localStorage.getItem("novaworks_session")}` } : {}) },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
      if (shouldEscalate(text, acc)) setShowEscalate(true);
    } catch (e: any) {
      const detail = String(e?.message || "").trim();
      setMessages((m) => {
        const copy = m.slice();
        copy[copy.length - 1] = {
          role: "assistant",
          content: detail ? `NOVA is temporarily unavailable. ${detail}` : "NOVA is temporarily unavailable. Please try again, or contact reception below.",
        };
        return copy;
      });
      setShowEscalate(true);
    } finally {
      setStreaming(false);
    }
  }


  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open NOVA AI assistant"
        className="fixed bottom-6 right-6 z-[60] group flex items-center gap-2 pl-3 pr-4 py-3 rounded-full bg-gradient-to-r from-gold-soft to-gold text-noir-deep shadow-2xl shadow-gold/40 hover:scale-105 transition-transform"
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        <span className="text-sm font-semibold tracking-wide">{open ? "Close" : "NOVA AI"}</span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-8rem))] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-gold/30 bg-noir-deep text-white">
          <div className="px-4 py-3 bg-gradient-to-r from-noir to-noir-deep border-b border-gold/20 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-soft to-gold flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-noir-deep" />
            </div>
            <div>
              <div className="text-sm font-semibold">NOVA AI</div>
              <div className="text-[11px] text-white/60">Your NOVAWORKS guide • Online</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] bg-gradient-to-br from-gold-soft to-gold text-noir-deep px-3 py-2 rounded-2xl rounded-br-sm"
                      : "max-w-[90%] text-white/90 whitespace-pre-wrap"
                  }
                >
                  {m.content || (streaming && i === messages.length - 1 ? <Dots /> : "")}
                </div>
              </div>
            ))}

            {showEscalate && (
              <div className="mt-3 p-3 rounded-xl border border-gold/30 bg-white/5">
                <div className="text-xs uppercase tracking-wider text-gold mb-2">Talk to a human</div>
                <div className="space-y-1.5 text-xs">
                  <a href="tel:+250788000000" className="flex items-center gap-2 hover:text-gold">
                    <Phone className="w-3.5 h-3.5" /> Reception: +250 788 000 000
                  </a>
                  <a href="mailto:admin@novaworks.rw?subject=Support%20request&body=Hello%20NOVAWORKS%20team%2C%0A%0AI%20need%20help%20with..." className="flex items-center gap-2 hover:text-gold">
                    <Mail className="w-3.5 h-3.5" /> admin@novaworks.rw
                  </a>
                  <a href="mailto:support@novaworks.rw?subject=Technical%20issue" className="flex items-center gap-2 hover:text-gold">
                    <Mail className="w-3.5 h-3.5" /> support@novaworks.rw
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3 flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Ask NOVA anything…"
              className="flex-1 resize-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold/40 text-white placeholder-white/40 max-h-24"
            />
            <button
              onClick={send}
              disabled={!input.trim() || streaming}
              className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-soft to-gold text-noir-deep flex items-center justify-center disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Dots() {
  return (
    <span className="inline-flex gap-1">
      <span className="w-1.5 h-1.5 bg-gold/70 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 bg-gold/70 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 bg-gold/70 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );
}