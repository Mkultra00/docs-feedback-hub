import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Phone, MessageSquare, Play, Square, Loader2, Send, CheckCircle2, Workflow } from "lucide-react";
import { calls, sms, LINE_VOICE, type Call } from "@/lib/mock-intake";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Open Line NYC — Intake Simulator" },
      { name: "description", content: "Simulated resident voice calls and SMS reports for Open Line NYC." },
      { property: "og:title", content: "Open Line NYC — Intake Simulator" },
      { property: "og:description", content: "Listen to simulated resident calls and read SMS reports routed to Community Boards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const urgencyClass = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-primary text-primary-foreground",
  low: "bg-muted text-muted-foreground",
};

function Index() {
  const [tab, setTab] = useState<"calls" | "sms" | "intake">("calls");
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b-4 border-foreground px-6 py-8 md:px-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Intake simulator · demo data</p>
        <h1 className="mt-2 text-5xl font-black uppercase tracking-tight md:text-7xl">Open Line NYC</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          One number for every neighbor. Simulated calls (voiced live) and text reports, as they'd arrive before routing.
        </p>
        <div className="mt-6 flex gap-2">
          {(["calls", "sms", "intake"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 border-2 border-foreground px-4 py-2 font-mono text-sm uppercase ${tab === t ? "bg-foreground text-background" : ""}`}
            >
              {t === "calls" ? <Phone className="h-4 w-4" /> : t === "sms" ? <MessageSquare className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
              {t === "calls" ? `Voice calls (${calls.length})` : t === "sms" ? `SMS (${sms.length})` : "How intake works"}
            </button>
          ))}
        </div>
      </header>
      {tab === "intake" ? (
        <IntakeDemo />
      ) : (
      <section className="grid gap-6 px-6 py-8 md:grid-cols-2 md:px-12">
        {tab === "calls" ? calls.map((c) => <CallCard key={c.id} call={c} />) : sms.map((s) => (
          <article key={s.id} className="border-2 border-foreground bg-card">
            <Meta id={s.id} phone={s.phone} district={`${s.borough} · ${s.district}`} category={s.category} urgency={s.urgency} />
            <div className="space-y-2 p-4">
              {s.messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "resident" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from === "resident" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                    {m.text}
                    <div className="mt-1 font-mono text-[10px] opacity-60">{m.at}</div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
      )}
    </main>
  );
}

function Meta(p: { id: string; phone: string; district: string; category: string; urgency: keyof typeof urgencyClass; extra?: string }) {
  return (
    <div className="border-b-2 border-foreground p-4">
      <div className="flex items-center justify-between font-mono text-xs">
        <span>{p.id} · {p.phone}</span>
        <span className={`px-2 py-0.5 uppercase ${urgencyClass[p.urgency]}`}>{p.urgency}</span>
      </div>
      <h2 className="mt-2 text-lg font-bold">{p.category}</h2>
      <p className="font-mono text-xs text-muted-foreground">{p.district}{p.extra ? ` · ${p.extra}` : ""}</p>
    </div>
  );
}

function CallCard({ call }: { call: Call }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function play() {
    stopRef.current = false;
    setError(null);
    setState("loading");
    // Unlock audio synchronously within the click so later playback isn't blocked.
    const player = audioRef.current ?? new Audio();
    audioRef.current = player;
    player.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    player.play().catch(() => {});
    try {
      const urls = await Promise.all(
        call.transcript.map(async (t) => {
          const r = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: t.text, voiceId: t.who === "line" ? LINE_VOICE : call.voiceId }),
          });
          if (!r.ok) throw new Error(await r.text());
          return URL.createObjectURL(await r.blob());
        }),
      );
      setState("playing");
      for (let i = 0; i < urls.length && !stopRef.current; i++) {
        setActive(i);
        await new Promise<void>((res, rej) => {
          player.onended = () => res();
          player.onerror = () => res();
          player.src = urls[i]!;
          player.play().catch((err) => rej(new Error(`Browser blocked audio: ${err?.message ?? err}`)));
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message.slice(0, 160) : "Playback failed");
    }
    setActive(-1);
    setState("idle");
  }

  function stop() {
    stopRef.current = true;
    audioRef.current?.pause();
    setActive(-1);
    setState("idle");
  }

  return (
    <article className="border-2 border-foreground bg-card">
      <Meta id={call.id} phone={call.phone} district={`${call.borough} · ${call.district}`} category={call.category} urgency={call.urgency} extra={`${call.receivedAt} · ${call.duration} · ${call.lang}`} />
      <div className="p-4">
        <button
          onClick={state === "idle" ? play : stop}
          disabled={state === "loading"}
          className="flex items-center gap-2 border-2 border-foreground bg-foreground px-4 py-2 font-mono text-sm uppercase text-background disabled:opacity-60"
        >
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "playing" ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {state === "loading" ? "Dialing…" : state === "playing" ? "Hang up" : "Play call"}
        </button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <ol className="mt-4 space-y-2 text-sm">
          {call.transcript.map((t, i) => (
            <li key={i} className={`border-l-4 pl-3 transition-colors ${active === i ? "border-primary bg-accent" : "border-transparent"}`}>
              <span className="font-mono text-xs uppercase text-muted-foreground">{t.who === "line" ? "Open Line" : "Caller"}</span>
              <p>{t.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
