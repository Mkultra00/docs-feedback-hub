import { useRef, useState } from "react";
import { Mic, PhoneCall, PhoneOff, Loader2, Square } from "lucide-react";
import { LINE_VOICE } from "@/lib/mock-intake";

const GREETING =
  "Hi, you've reached Open Line NYC. I'm here to listen. After the tone, tell me what's going on in your neighborhood, in your own words. Take your time. Press stop when you're done.";

type Phase = "idle" | "greeting" | "recording" | "thinking" | "replying" | "done";

export function VoiceMessage({ onPosted }: { onPosted?: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [typed, setTyped] = useState("");
  const [sending, setSending] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);

  async function speak(text: string) {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId: LINE_VOICE }),
    });
    if (!r.ok) throw new Error("The agent's voice couldn't load.");
    const url = URL.createObjectURL(await r.blob());
    const a = audio.current!;
    a.src = url;
    await a.play();
    await new Promise<void>((res) => { a.onended = () => res(); a.onpause = () => res(); });
  }

  function beep() {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    o.frequency.value = 880;
    o.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.35);
  }

  async function call() {
    setError(null); setTranscript(""); setReply("");
    audio.current ??= new Audio();
    // unlock playback on the click
    audio.current.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA";
    audio.current.play().catch(() => {});
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Please allow microphone access so you can leave a message.");
      return;
    }
    try {
      setPhase("greeting");
      await speak(GREETING);
      beep();
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream.current);
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => send(new Blob(chunks, { type: r.mimeType || "audio/webm" }));
      rec.current = r;
      r.start();
      setPhase("recording");
    } catch (e) {
      cleanup();
      setError((e as Error).message);
      setPhase("idle");
    }
  }

  function cleanup() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }

  function stopRecording() {
    rec.current?.stop();
    cleanup();
    setPhase("thinking");
  }

  async function send(blob: Blob) {
    try {
      const fd = new FormData();
      fd.append("audio", blob, "message.webm");
      const r = await fetch("/api/voicemail", { method: "POST", body: fd });
      const data = await r.json();
      if (data.transcript) setTranscript(data.transcript);
      if (!r.ok) throw new Error(data.error || "Something went wrong.");
      setReply(data.reply);
      setPhase("replying");
      await speak(data.reply);
      setPhase("done");
    } catch (e) {
      setError((e as Error).message);
      setPhase("done");
    }
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (!typed.trim()) return;
    setError(null); setTranscript(typed.trim()); setReply(""); setSending(true);
    try {
      const fd = new FormData();
      fd.append("text", typed.trim());
      const r = await fetch("/api/voicemail", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Something went wrong.");
      setReply(data.reply); setTyped("");
    } catch (err) { setError((err as Error).message); }
    finally { setSending(false); }
  }

  function hangUp() {
    audio.current?.pause();
    if (rec.current?.state === "recording") { rec.current.onstop = null; rec.current.stop(); }
    cleanup();
    setPhase("idle");
  }

  const label: Record<Phase, string> = {
    idle: "Tap to call Open Line",
    greeting: "Agent is answering…",
    recording: "Recording — speak now",
    thinking: "Agent is listening back…",
    replying: "Agent is responding…",
    done: "Call ended",
  };

  return (
    <section className="px-6 py-10 md:px-12">
      <div className="mx-auto max-w-xl border-2 border-foreground bg-card p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Leave a voice message</p>
        <div className="my-8 flex justify-center">
          {phase === "idle" || phase === "done" ? (
            <button onClick={call} aria-label="Call Open Line" className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105">
              <PhoneCall className="h-10 w-10" />
            </button>
          ) : phase === "recording" ? (
            <button onClick={stopRecording} aria-label="Stop and send" className="flex h-28 w-28 animate-pulse items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg">
              <Square className="h-10 w-10" />
            </button>
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary">
              {phase === "greeting" || phase === "replying" ? <Mic className="h-10 w-10 text-primary" /> : <Loader2 className="h-10 w-10 animate-spin text-primary" />}
            </div>
          )}
        </div>
        <p className="font-mono text-sm uppercase">{label[phase]}</p>
        {phase !== "idle" && phase !== "done" && (
          <button onClick={hangUp} className="mt-4 inline-flex items-center gap-2 border-2 border-foreground px-3 py-1 font-mono text-xs uppercase">
            <PhoneOff className="h-3 w-3" /> Hang up
          </button>
        )}
        <form onSubmit={sendText} className="mt-8 flex gap-2 border-t-2 border-foreground pt-6">
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type your message…" className="flex-1 border-2 border-foreground bg-background px-3 py-2 text-sm" />
          <button disabled={sending || !typed.trim()} className="border-2 border-foreground bg-foreground px-4 py-2 font-mono text-xs uppercase text-background disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
          </button>
        </form>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {(transcript || reply) && (
          <div className="mt-6 space-y-3 text-left text-sm">
            {transcript && <div className="rounded-2xl bg-muted px-3 py-2"><span className="font-mono text-xs uppercase text-muted-foreground">You said</span><p>{transcript}</p></div>}
            {reply && <div className="rounded-2xl bg-primary px-3 py-2 text-primary-foreground"><span className="font-mono text-xs uppercase opacity-80">Open Line</span><p>{reply}</p></div>}
          </div>
        )}
        {reply && onPosted && (
          <button onClick={onPosted} className="mt-6 w-full border-2 border-foreground bg-foreground px-4 py-2 font-mono text-xs uppercase text-background">
            Your message is on the board — view it
          </button>
        )}
      </div>
    </section>
  );
}
