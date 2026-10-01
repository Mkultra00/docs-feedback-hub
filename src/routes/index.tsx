import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Send, CheckCircle2, Mic, LayoutList } from "lucide-react";
import { MessageBoard } from "@/components/MessageBoard";
import { VoiceMessage } from "@/components/VoiceMessage";

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

function Index() {
  const [tab, setTab] = useState<"voice" | "board">("board");
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b-4 border-foreground px-6 py-8 md:px-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Intake simulator · demo data</p>
        <h1 className="mt-2 text-5xl font-black uppercase tracking-tight md:text-7xl">Open Line NYC</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          One number for every neighbor. Simulated calls (voiced live) and text reports, as they'd arrive before routing.
        </p>
        <div className="mt-6 flex gap-2">
          {(["board", "voice"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 border-2 border-foreground px-4 py-2 font-mono text-sm uppercase ${tab === t ? "bg-foreground text-background" : ""}`}
            >
              {t === "voice" ? <Mic className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
              {t === "voice" ? "Leave a message" : "Message board"}
            </button>
          ))}
        </div>
      </header>
      {tab === "voice" ? (
        <div>
          <VoiceMessage onPosted={() => setTab("board")} />
          <IntakeDemo />
        </div>
      ) : (
        <MessageBoard />
      )}
    </main>
  );
}

type Step = { title: string; detail: string };

const DISTRICTS: [RegExp, string, string][] = [
  [/gates ave|marcy|bed.?stuy/i, "Brooklyn", "BK CB 3"],
  [/grand concourse|167th/i, "Bronx", "BX CB 4"],
  [/jackson heights|95th/i, "Queens", "QN CB 3"],
  [/delancey|clinton/i, "Manhattan", "MN CB 3"],
  [/brownsville|livonia/i, "Brooklyn", "BK CB 16"],
  [/victoria blvd|victory blvd|staten island/i, "Staten Island", "SI CB 1"],
];
const CATEGORIES: [RegExp, string, "low" | "medium" | "high"][] = [
  [/heat|hot water|boiler/i, "Housing — no heat", "high"],
  [/mold|leak|ceiling/i, "Housing — mold / leak", "high"],
  [/signal|crosswalk|traffic light/i, "Street safety — signal / crossing", "medium"],
  [/trash|garbage|pickup|rat/i, "Sanitation — missed pickup", "low"],
  [/noise|jackhammer|construction/i, "Noise — after hours", "low"],
  [/playground|park|slide/i, "Parks — unsafe equipment", "medium"],
];

function IntakeDemo() {
  const [text, setText] = useState("No heat in my building on Gates Ave near Marcy for 3 days. Landlord won't fix the boiler.");
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function submit() {
    if (!text.trim() || running) return;
    setRunning(true);
    setSteps([]);
    const [, borough, district] = DISTRICTS.find(([re]) => re.test(text)) ?? [null, "Brooklyn", "BK CB 3"];
    const [, category, urgency] = CATEGORIES.find(([re]) => re.test(text)) ?? [null, "General — quality of life", "medium"];
    const id = `#S-${2204 + Math.floor(Math.random() * 90)}`;
    const script: Step[] = [
      { title: "Report received", detail: `Resident's message arrives by text, call, or web — no app, no account needed.` },
      { title: "Location identified", detail: `Address matched to ${borough}, ${district}. This decides who receives the report.` },
      { title: "Problem classified", detail: `Read as "${category}" — marked ${urgency} priority${urgency === "high" ? " (health or safety risk)" : ""}.` },
      { title: "Checked against existing reports", detail: "Compared with 311 data and other neighbor reports for the same spot, so duplicates stack up instead of getting lost." },
      { title: `Sent to ${district}`, detail: "Lands on the Community Board's review list with the location, category, and how many neighbors reported it." },
      { title: "Resident gets a confirmation", detail: `Automatic reply: "Open Line NYC: Logged as ${id} for ${district}. We'll text you when the board responds."` },
    ];
    script.forEach((s, i) => {
      timers.current.push(setTimeout(() => {
        setSteps((prev) => [...prev, s]);
        if (i === script.length - 1) setRunning(false);
      }, 900 * (i + 1)));
    });
  }

  return (
    <section className="px-6 py-8 md:px-12">
      <div className="max-w-2xl border-2 border-foreground bg-card">
        <div className="border-b-2 border-foreground p-4">
          <h2 className="text-lg font-bold">Try it: report a problem like a resident would</h2>
          <p className="text-sm text-muted-foreground">Type anything — a broken boiler, a dead streetlight — and watch what happens to it. All simulated.</p>
        </div>
        <div className="p-4">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="flex-1 border-2 border-foreground bg-background px-3 py-2 text-sm"
              placeholder="Describe the problem and where it is…"
            />
            <button
              onClick={submit}
              disabled={running}
              className="flex items-center gap-2 border-2 border-foreground bg-foreground px-4 py-2 font-mono text-sm uppercase text-background disabled:opacity-60"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </div>
          {steps.length > 0 && (
            <ol className="mt-6 space-y-0">
              {steps.map((s, i) => (
                <li key={i} className="relative border-l-2 border-foreground pb-5 pl-5 last:pb-0">
                  <CheckCircle2 className="absolute -left-[11px] top-0 h-5 w-5 bg-card text-primary" />
                  <p className="font-mono text-xs uppercase text-muted-foreground">Step {i + 1}</p>
                  <p className="font-bold">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.detail}</p>
                </li>
              ))}
              {running && (
                <li className="relative border-l-2 border-transparent pl-5">
                  <Loader2 className="absolute -left-[11px] top-0 h-5 w-5 animate-spin bg-card text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Working…</p>
                </li>
              )}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
