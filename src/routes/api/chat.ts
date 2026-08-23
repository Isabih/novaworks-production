import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `You are NOVA AI, the official NOVAWORKS assistant. Be concise, professional, warm, and reply in the user's language (English, Kinyarwanda or French).

CRITICAL DATA RULES:
- BUSINESS_CONTEXT is live NOVAWORKS data already permission-filtered for the authenticated user.
- When asked about a stay, payment, service request, visit, apartment, extension or owner balance, answer ONLY from BUSINESS_CONTEXT.
- Never invent a status, price, payment, staff assignment, completion, date, or guarantee.
- If BUSINESS_CONTEXT does not contain enough evidence, say the system cannot confirm it and direct the user to the appropriate staff.
- Never expose another user's data or internal IDs unless needed to identify the user's own request.
- Explain public browsing, rentals, Luxury Access, and services to unauthenticated visitors.
- For urgent/emergency matters, state the submitted request status only if present. Never claim completion without database evidence.
- For owner figures, explain gross rent, commission, maintenance deductions and net balance only from ledger data supplied.`;

type ChatMessage = { role: "user" | "assistant" | "system"; content: string | any };
function contentText(c: any) { if (typeof c === "string") return c; if (Array.isArray(c)) return c.map((x: any) => x?.text || x?.content || "").join(" "); return String(c ?? ""); }
function outputText(j: any) { if (typeof j?.output_text === "string" && j.output_text) return j.output_text; for (const item of j?.output || []) for (const c of item?.content || []) if (typeof c?.text === "string") return c.text; return ""; }

function basicNovaFallback(context: any, messages: ChatMessage[]) {
  const question = contentText([...messages].reverse().find((m) => m.role === "user")?.content).toLowerCase();
  if (!context?.authenticated) {
    return "NOVA is running in basic mode right now. I can still help you browse NOVAWORKS properties, explain Luxury Access, visits, bookings, and how to contact our team. For a personalized account status, please sign in.";
  }
  if (context.customer) {
    if (/stay|remaining|checkout|check out|apartment|tenan/.test(question)) {
      const s = context.stays?.[0];
      return s ? `Your latest stay is ${s.status} at ${s.property}, apartment ${s.apartment}. It runs from ${String(s.start_date).slice(0,10)} to ${String(s.end_date).slice(0,10)}${s.days_remaining != null ? `, with ${s.days_remaining} day(s) remaining` : ""}.` : "I cannot confirm an active stay from your NOVAWORKS account data.";
    }
    if (/payment|paid|balance|money/.test(question)) {
      const p = context.payments?.[0];
      return p ? `Your latest recorded payment is ${p.currency} ${Number(p.amount).toLocaleString()} by ${p.payment_method}, with status ${p.status}.` : "I cannot find a recorded payment in your NOVAWORKS account data.";
    }
    if (/service|repair|maintenance|urgent|emergency|tap|lamp/.test(question)) {
      const r = context.services?.[0];
      return r ? `Your latest service request “${r.title}” is ${r.status} with ${r.priority} priority${r.assigned_admin ? ` and is assigned to ${r.assigned_admin}` : ""}.${r.completed_at ? ` It was completed on ${String(r.completed_at).slice(0,10)}.` : ""}` : "I cannot find a service request in your NOVAWORKS account data.";
    }
    if (/visit|viewing|meeting/.test(question)) {
      const v = context.visits?.[0];
      return v ? `Your latest property visit for ${v.property} is ${v.status}, scheduled for ${new Date(v.requested_for).toLocaleString()}${v.assigned_admin ? ` and assigned to ${v.assigned_admin}` : ""}.` : "I cannot find a property-visit request in your NOVAWORKS account data.";
    }
    if (/extension|extend/.test(question)) {
      const e = context.extensions?.[0];
      return e ? `Your latest stay-extension request is ${e.status} and requests an end date of ${String(e.requested_end_date).slice(0,10)}.` : "I cannot find a stay-extension request in your NOVAWORKS account data.";
    }
  }
  if (context.summary_by_currency && /owner|income|balance|commission|maintenance|report|money/.test(question)) {
    const rows = context.summary_by_currency;
    if (!rows.length) return "I cannot find owner-ledger figures for your account.";
    return rows.map((r:any) => `${r.currency}: net ${Number(r.net_balance).toLocaleString()}, rent ${Number(r.rent_income).toLocaleString()}, commission ${Number(r.commission).toLocaleString()}, maintenance ${Number(r.maintenance).toLocaleString()}`).join("\n");
  }
  if (context.operations && /service|unit|stay|visit|operation|dashboard/.test(question)) {
    const o = context.operations;
    return `Current NOVAWORKS operations: ${o.active_stays} active stay(s), ${o.available_units} available unit(s), ${o.open_services} open service request(s), ${o.urgent_services} urgent service request(s), and ${o.open_visits} open visit(s).`;
  }
  return "NOVA is temporarily using its database-safe basic mode. I can answer account questions about stays, payments, service requests, visits, extensions, owner balances, and current operations from live NOVAWORKS data. Ask me about one of those items.";
}

async function callOpenAI(key: string, model: string, instructions: string, messages: ChatMessage[]) {
  const input = messages.slice(-14).filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: contentText(m.content) }));
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, instructions, input, max_output_tokens: 700 }),
  });
  const json: any = await response.json().catch(() => ({}));
  return { response, json };
}

async function callOllama(base: string, model: string, instructions: string, messages: ChatMessage[]) {
  const payload = { model, stream: false, messages: [{ role: "system", content: instructions }, ...messages.slice(-14).filter(m=>m.role!=="system").map(m=>({role:m.role,content:contentText(m.content)}))] };
  const response = await fetch(`${base.replace(/\/$/,"")}/api/chat`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
  const json:any = await response.json().catch(()=>({}));
  return {response,json,text:json?.message?.content||""};
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json() as { messages?: ChatMessage[] };
          if (!Array.isArray(body.messages)) return new Response("messages required", { status: 400 });
          const key = (process.env.OPENAI_API_KEY || "").trim();
          const ollamaBase=(process.env.OLLAMA_BASE_URL||"").trim();
          const ollamaModel=(process.env.OLLAMA_MODEL||"llama3.2:3b").trim();

          const [{ bearer, getSessionUser }, { getNovaContext }] = await Promise.all([
            import("@/lib/auth.server"),
            import("@/lib/nova-context.server"),
          ]);
          const user = await getSessionUser(bearer(request));
          const context = await getNovaContext(user);
          const instructions = `${SYSTEM}\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`;
          const primaryModel = (process.env.OPENAI_MODEL || "gpt-5.6-luna").trim();
          const fallbackModel = (process.env.OPENAI_FALLBACK_MODEL || "gpt-5.4-mini").trim();

          if(!key || key === "CHANGE_ME"){
            if(!ollamaBase) return new Response(basicNovaFallback(context, body.messages),{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store","X-NOVA-Provider":"basic"}});
            const local=await callOllama(ollamaBase,ollamaModel,instructions,body.messages);if(!local.response.ok||!local.text)return new Response("NOVA local AI is unavailable",{status:503});return new Response(local.text,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store","X-NOVA-Provider":"ollama"}});
          }
          let { response, json } = await callOpenAI(key, primaryModel, instructions, body.messages);
          if (!response.ok && [400, 404].includes(response.status) && fallbackModel && fallbackModel !== primaryModel) {
            const firstError = json?.error?.message || "";
            if (/model|not found|does not exist|unsupported/i.test(firstError)) {
              ({ response, json } = await callOpenAI(key, fallbackModel, instructions, body.messages));
            }
          }

          if (!response.ok) {
            const message = json?.error?.message || json?.message || `OpenAI HTTP ${response.status}`;
            console.error("[NOVA AI] OpenAI error", response.status, message);
            if (response.status === 401) return new Response("OpenAI rejected the API key. Check OPENAI_API_KEY.", { status: 502 });
            if (response.status === 429 && ollamaBase) { const local=await callOllama(ollamaBase,ollamaModel,instructions,body.messages); if(local.response.ok&&local.text)return new Response(local.text,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store","X-NOVA-Provider":"ollama"}}); }
            if (response.status === 429) return new Response(basicNovaFallback(context, body.messages), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-NOVA-Provider": "basic" } });
            return new Response(`NOVA AI provider error: ${message}`, { status: 502 });
          }

          const text = outputText(json);
          if (!text) return new Response("OpenAI returned no text", { status: 502 });
          return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
        } catch (e: any) {
          console.error("[NOVA AI]", e);
          return new Response(e?.message || "NOVA AI request failed", { status: 500 });
        }
      },
    },
  },
});
