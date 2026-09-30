import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  text: z.string().min(1).max(2000),
  voiceId: z.string().regex(/^[A-Za-z0-9]{10,40}$/),
});

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["ELEVENLABS_API_KEY"];
        if (!key) return new Response("Voice service not connected", { status: 500 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const { text, voiceId } = parsed.data;
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: { "xi-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              model_id: "eleven_multilingual_v2",
              voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.4, speed: 1.0 },
            }),
          },
        );
        if (!res.ok) {
          const err = await res.text();
          console.error(`TTS failed [${res.status}]: ${err}`);
          return new Response(`TTS failed [${res.status}]: ${err}`, { status: 502 });
        }
        return new Response(res.body, { headers: { "Content-Type": "audio/mpeg" } });
      },
    },
  },
});
