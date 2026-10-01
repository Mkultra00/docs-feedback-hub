import { useEffect, useRef, useState } from "react";
import { Mic, MessageSquare, Play, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutingWorkflow } from "@/components/RoutingWorkflow";
import { calls, sms, LINE_VOICE, type Call } from "@/lib/mock-intake";

type Row = {
  id: string; channel: string; transcript: string; summary: string; category: string;
  urgency: string; borough: string; created_at: string; audio_url?: string | null;
};

type SmsThread = (typeof sms)[number];

type FeedItem =
  | { kind: "live"; at: number; row: Row }
  | { kind: "call"; at: number; call: Call }
  | { kind: "sms"; at: number; thread: SmsThread };

const urg: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-primary text-primary-foreground",
  low: "bg-muted text-muted-foreground",
};

// Turn mock clock strings like "7:12 AM" or "11:14 PM" into a real timestamp
// (today at that time; yesterday if that would be in the future).
function mockTime(timeStr: string): number {
  const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return Date.now();
  let h = parseInt(m[1]!, 10) % 12;
  if (m[3]!.toUpperCase() === "PM") h += 12;
  const d = new Date();
  d.setHours(h, parseInt(m[2]!, 10), 0, 0);
  if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
  return d.getTime();
}

export function MessageBoard() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      supabase.from("board_messages").select("*").order("created_at", { ascending: false }).limit(100)
        .then(({ data }) => { if (alive) setRows((data as Row[]) ?? []); });
    load();
    const ch = supabase.channel("board").on("postgres_changes", { event: "INSERT", schema: "public", table: "board_messages" }, load).subscribe();
    // Realtime can be blocked in some preview/embedded contexts — poll as a fallback.
    const timer = setInterval(load, 5000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      supabase.removeChannel(ch);
    };
  }, []);


  if (!rows) return <p className="px-6 py-8 font-mono text-sm md:px-12">Loading…</p>;

  const feed: FeedItem[] = [
    ...rows.map((row): FeedItem => ({ kind: "live", at: new Date(row.created_at).getTime(), row })),
    ...calls.map((call): FeedItem => ({ kind: "call", at: mockTime(call.receivedAt.replace(/^Today\s*/i, "")), call })),
    ...sms.map((thread): FeedItem => ({ kind: "sms", at: mockTime(thread.messages[0]!.at), thread })),
  ].sort((a, b) => b.at - a.at);

  const q = query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(q);
  const filtered = q
    ? feed.filter((item) =>
        item.kind === "live"
          ? matches(item.row.summary) || matches(item.row.transcript) || matches(item.row.category) || matches(item.row.borough)
          : item.kind === "call"
            ? matches(item.call.category) || matches(item.call.borough) || item.call.transcript.some((t) => matches(t.text))
            : matches(item.thread.category) || matches(item.thread.borough) || item.thread.messages.some((m) => matches(m.text)),
      )
    : feed;

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8 md:px-12">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search messages by keyword — e.g. heat, trash, Brooklyn…"
        aria-label="Search messages by keyword"
        className="w-full border-2 border-foreground bg-card px-4 py-3 font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {q && (
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "match" : "matches"} for "{query.trim()}"
        </p>
      )}
      {!filtered.length && <p className="text-muted-foreground">{q ? "No messages match that keyword." : 'No messages yet — leave one in the "Leave a message" tab.'}</p>}
      {filtered.map((item) => {
        const key = item.kind === "live" ? item.row.id : item.kind === "call" ? item.call.id : item.thread.id;
        const open = openId === key;
        const toggle = () => setOpenId(open ? null : key);
        if (item.kind === "live") return <LiveCard key={key} row={item.row} open={open} toggle={toggle} />;
        if (item.kind === "call") return <CallCard key={key} call={item.call} open={open} toggle={toggle} />;
        return <SmsCard key={key} thread={item.thread} open={open} toggle={toggle} />;
      })}
    </section>
  );
}

function LiveCard({ row, open, toggle }: { row: Row; open: boolean; toggle: () => void }) {
  return (
    <article className="border-2 border-foreground bg-card">
      <button onClick={toggle} className="block w-full text-left" aria-expanded={open}>
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-foreground px-4 py-2 font-mono text-xs uppercase">
          {row.channel === "voice" ? <Mic className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
          <span>{row.channel}</span>
          <span>· {row.borough}</span>
          <span className="border border-foreground px-2">{row.category}</span>
          <span className={`px-2 ${urg[row.urgency] ?? urg["medium"]}`}>{row.urgency}</span>
          <span className="ml-auto text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
        </div>
        <div className="space-y-2 p-4 text-sm">
          <p className="font-semibold">{row.summary}</p>
          <p className="text-muted-foreground">"{row.transcript}"</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {open ? "Hide routing ▲" : "See where this goes ▼"}
          </p>
        </div>
      </button>
      {row.audio_url && (
        <div className="px-4 pb-4">
          <audio controls preload="none" src={row.audio_url} className="w-full" aria-label="Voice recording" />
        </div>
      )}
      {open && <RoutingWorkflow category={row.category} borough={row.borough} onClose={toggle} />}
    </article>
  );
}

function SmsCard({ thread: s, open, toggle }: { thread: SmsThread; open: boolean; toggle: () => void }) {
  return (
    <article className="border-2 border-foreground bg-card">
      <button onClick={toggle} className="block w-full text-left" aria-expanded={open}>
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-foreground px-4 py-2 font-mono text-xs uppercase">
          <MessageSquare className="h-3 w-3" />
          <span>SMS · {s.id}</span>
          <span>· {s.borough}</span>
          <span className="border border-foreground px-2">{s.category}</span>
          <span className={`px-2 ${urg[s.urgency]}`}>{s.urgency}</span>
          <span className="ml-auto text-muted-foreground">{s.messages[0]!.at}</span>
        </div>
        <div className="space-y-2 p-4 text-sm">
          {s.messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "resident" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.from === "resident" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                {m.text}
                <div className="mt-1 font-mono text-[10px] opacity-60">{m.at}</div>
              </div>
            </div>
          ))}
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {open ? "Hide routing ▲" : "See where this goes ▼"}
          </p>
        </div>
      </button>
      {open && <RoutingWorkflow category={s.category} borough={s.borough} district={s.district} onClose={toggle} />}
    </article>
  );
}

function CallCard({ call, open, toggle }: { call: Call; open: boolean; toggle: () => void }) {
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
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-foreground px-4 py-2 font-mono text-xs uppercase">
        <Mic className="h-3 w-3" />
        <span>CALL · {call.id}</span>
        <span>· {call.borough}</span>
        <span className="border border-foreground px-2">{call.category}</span>
        <span className={`px-2 ${urg[call.urgency]}`}>{call.urgency}</span>
        <span className="ml-auto text-muted-foreground">{call.receivedAt}</span>
      </div>
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
        <button
          onClick={toggle}
          aria-expanded={open}
          className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground underline"
        >
          {open ? "Hide routing ▲" : "See where this goes ▼"}
        </button>
      </div>
      {open && <RoutingWorkflow category={call.category} borough={call.borough} district={call.district} onClose={toggle} />}
    </article>
  );
}
