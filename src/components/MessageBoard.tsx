import { useEffect, useState } from "react";
import { Mic, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string; channel: string; transcript: string; summary: string; category: string;
  urgency: string; borough: string; created_at: string;
};

const urg: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-primary text-primary-foreground",
  low: "bg-muted text-muted-foreground",
};

export function MessageBoard() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const load = () =>
      supabase.from("board_messages").select("*").order("created_at", { ascending: false }).limit(100)
        .then(({ data }) => setRows((data as Row[]) ?? []));
    load();
    const ch = supabase.channel("board").on("postgres_changes", { event: "INSERT", schema: "public", table: "board_messages" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (!rows) return <p className="px-6 py-8 font-mono text-sm md:px-12">Loading…</p>;
  if (!rows.length) return <p className="px-6 py-8 text-muted-foreground md:px-12">No messages yet — leave one in the "Leave a message" tab.</p>;

  return (
    <section className="grid gap-6 px-6 py-8 md:grid-cols-2 md:px-12">
      {rows.map((r) => (
        <article key={r.id} className="border-2 border-foreground bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b-2 border-foreground px-4 py-2 font-mono text-xs uppercase">
            {r.channel === "voice" ? <Mic className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
            <span>{r.channel}</span>
            <span>· {r.borough}</span>
            <span className="border border-foreground px-2">{r.category}</span>
            <span className={`px-2 ${urg[r.urgency] ?? urg["medium"]}`}>{r.urgency}</span>
            <span className="ml-auto text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
          </div>
          <div className="space-y-2 p-4 text-sm">
            <p className="font-semibold">{r.summary}</p>
            <p className="text-muted-foreground">"{r.transcript}"</p>
          </div>
        </article>
      ))}
    </section>
  );
}
