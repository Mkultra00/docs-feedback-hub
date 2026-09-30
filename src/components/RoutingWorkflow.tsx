import { CheckCircle2, X } from "lucide-react";
import { routeFor } from "@/lib/routing";

export function RoutingWorkflow(props: { category: string; borough: string; district?: string; onClose: () => void }) {
  const steps = routeFor(props);
  return (
    <div className="border-t-2 border-foreground bg-accent/40 p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Where this report goes</p>
        <button onClick={props.onClose} aria-label="Close routing" className="border border-foreground p-1">
          <X className="h-3 w-3" />
        </button>
      </div>
      <ol className="mt-3">
        {steps.map((s, i) => (
          <li key={i} className="relative border-l-2 border-foreground pb-4 pl-5 last:pb-0">
            <CheckCircle2 className="absolute -left-[11px] top-0 h-5 w-5 bg-card text-primary" />
            <p className="font-mono text-[10px] uppercase text-muted-foreground">Step {i + 1}</p>
            <p className="text-sm font-bold">{s.title}</p>
            <p className="text-sm text-muted-foreground">{s.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
