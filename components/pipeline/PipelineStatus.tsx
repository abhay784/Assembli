"use client";

import { AlertCircle, CheckCircle2, Circle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PipelineStatus(props: {
  stages: null | Array<{
    id: string;
    label: string;
    state: "pending" | "active" | "complete" | "failed";
  }>;
  coarseStatus: "queued" | "processing" | "completed" | "failed";
}): React.JSX.Element {
  const isTerminal =
    props.coarseStatus === "completed" || props.coarseStatus === "failed";

  return (
    <section
      role="region"
      aria-label="Processing status"
      aria-live="polite"
      className="space-y-4"
    >
      <Card className="border-border/70 shadow-md shadow-black/[0.03] ring-1 ring-black/[0.03] dark:shadow-black/20 dark:ring-white/10">
        <CardHeader className="border-b border-border/50 bg-muted/15 pb-4">
          <CardTitle className="text-base font-semibold tracking-tight">
            Processing your manual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {props.stages === null && !isTerminal && props.coarseStatus === "queued" ? (
            <div className="flex items-center gap-2 text-sm">
              <Loader2
                className="size-4 animate-spin text-muted-foreground"
                aria-hidden
              />
              <span>Waiting to start…</span>
            </div>
          ) : null}

          {props.stages === null &&
          !isTerminal &&
          props.coarseStatus === "processing" ? (
            <div className="flex items-center gap-2 text-sm">
              <Loader2
                className="size-4 animate-spin text-muted-foreground"
                aria-hidden
              />
              <span>Working on your video…</span>
            </div>
          ) : null}

          {props.stages === null && props.coarseStatus === "completed" ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-primary" aria-hidden />
              <span>Processing complete.</span>
            </div>
          ) : null}

          {props.stages === null && props.coarseStatus === "failed" ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" aria-hidden />
              <span>Processing stopped.</span>
            </div>
          ) : null}

          {props.stages !== null && props.stages.length > 0 ? (
            <ol className="space-y-2">
              {props.stages.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <StageIcon state={s.state} />
                  <span>{s.label}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function StageIcon({
  state,
}: {
  state: "pending" | "active" | "complete" | "failed";
}) {
  switch (state) {
    case "pending":
      return <Circle className="size-4 text-muted-foreground" aria-hidden />;
    case "active":
      return (
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
      );
    case "complete":
      return <CheckCircle2 className="size-4 text-primary" aria-hidden />;
    case "failed":
      return <AlertCircle className="size-4 text-destructive" aria-hidden />;
    default:
      return null;
  }
}
