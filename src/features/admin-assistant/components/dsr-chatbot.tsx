"use client";

import { useState } from "react";

type Message = { role: "assistant" | "user"; text: string };
const SUGGESTIONS = ["Aaj Gaurav ne kya kiya hai?", "Is week team ka summary do", "Is month kis employee ke DSR pending hain?"];

export function DsrChatbot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);

  async function ask(rawQuestion: string) {
    const text = rawQuestion.trim();
    if (!text || pending) return;
    setQuestion("");
    setMessages((items) => [...items, { role: "user", text }]);
    setPending(true);
    try {
      const response = await fetch("/api/admin/dsr-assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text }) });
      const data = await response.json() as { answer?: string; error?: string };
      setMessages((items) => [...items, { role: "assistant", text: response.ok ? data.answer ?? "No answer returned." : data.error ?? "Unable to answer right now." }]);
    } catch {
      setMessages((items) => [...items, { role: "assistant", text: "Unable to reach the DSR assistant. Please try again." }]);
    } finally { setPending(false); }
  }

  return <div className="fixed bottom-5 right-5 z-50">
    {open && <section aria-label="DSR assistant" className="mb-3 flex h-[min(620px,calc(100dvh-7rem))] w-[min(390px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-200 bg-violet-50 px-4 py-3">
        <div><p className="text-sm font-semibold text-slate-900">DSR assistant</p><p className="text-xs text-slate-500">Groq-powered reporting summary</p></div>
        <button aria-label="Close DSR assistant" className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800" onClick={() => setOpen(false)} type="button">×</button>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <><p className="text-sm leading-6 text-slate-600">Ask about today&apos;s work, or get weekly and monthly DSR summaries.</p><div className="space-y-2">{SUGGESTIONS.map((suggestion) => <button className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-700 hover:border-violet-200 hover:bg-violet-50" key={suggestion} onClick={() => ask(suggestion)} type="button">{suggestion}</button>)}</div></>}
        {messages.map((message, index) => <div className={`whitespace-pre-wrap rounded-xl px-3 py-2.5 text-sm leading-6 ${message.role === "user" ? "ml-8 bg-violet-600 text-white" : "mr-4 bg-slate-100 text-slate-700"}`} key={`${message.role}-${index}`}>{message.text}</div>)}
        {pending && <div className="mr-4 rounded-xl bg-slate-100 px-3 py-2.5 text-sm text-slate-500">Reviewing DSR entries…</div>}
      </div>
      <form className="border-t border-slate-200 p-3" onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
        <div className="flex gap-2"><input className="crm-input min-w-0 flex-1" disabled={pending} maxLength={800} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about DSRs…" value={question} /><button className="crm-primary shrink-0" disabled={pending || !question.trim()} type="submit">Send</button></div>
      </form>
    </section>}
    <button aria-expanded={open} aria-label="Open DSR assistant" className="flex h-12 items-center gap-2 rounded-full bg-violet-600 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-300 transition hover:bg-violet-700" onClick={() => setOpen((value) => !value)} type="button"><ChatIcon />DSR Assistant</button>
  </div>;
}

function ChatIcon() {
  return <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" strokeLinecap="round" strokeWidth="3" /></svg>;
}
