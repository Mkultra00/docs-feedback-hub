import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `You are the Open Line NYC voice agent. A New York resident just left a voicemail about a problem in their neighborhood.
Reply as if speaking on the phone, in 3-4 short warm sentences (under 70 words, no lists, no markdown).
First, reflect back what they told you in your own words and name how it must feel (frustrating, worrying, exhausting) so they feel truly heard.
Then reassure them: their report is logged and will go to the right Community Board. If anything sounds like an emergency or danger to life, gently tell them to call 911.
Never be dismissive, never blame them, never promise a specific fix date.`;

async function reply(transcript: string, key: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions: SYSTEM,
      input: [{ role: "user", content: transcript }],
    }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text();
    throw Object.assign(new Error(`AI failed [${res.status}]: ${t}`), { status: res.status });
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const ev = JSON.parse(d);
        if (ev.type === "response.output_text.delta") out += ev.delta;
      } catch {}
    }
  }
  return out.trim();
}

export const Route = createFileRoute("/api/voicemail")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const el = process.env["ELEVENLABS_API_KEY"];
        const ai = process.env["LOVABLE_API_KEY"];
        if (!el || !ai) return Response.json({ error: "Voice service not connected" }, { status: 500 });
        const form = await request.formData().catch(() => null);
        const audio = form?.get("audio");
        if (!(audio instanceof Blob) || audio.size === 0) return Response.json({ error: "No audio received" }, { status: 400 });
        if (audio.size > 20_000_000) return Response.json({ error: "Message too long" }, { status: 400 });

        const fd = new FormData();
        fd.append("file", audio, "message.webm");
        fd.append("model_id", "scribe_v2");
        const stt = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: { "xi-api-key": el },
          body: fd,
        });
        if (!stt.ok) {
          const t = await stt.text();
          console.error(`STT failed [${stt.status}]: ${t}`);
          return Response.json({ error: "Couldn't hear the message. Please try again." }, { status: 502 });
        }
        const transcript = ((await stt.json()).text ?? "").trim();
        if (!transcript) return Response.json({ error: "We didn't catch any words — try speaking a bit closer to the mic." }, { status: 400 });

        try {
          const text = await reply(transcript, ai);
          return Response.json({ transcript, reply: text });
        } catch (e) {
          const status = (e as { status?: number }).status ?? 500;
          console.error(e);
          const msg = status === 402 ? "AI credits have run out." : status === 429 ? "Too many requests — try again shortly." : "The agent couldn't respond right now.";
          return Response.json({ error: msg, transcript }, { status });
        }
      },
    },
  },
});
