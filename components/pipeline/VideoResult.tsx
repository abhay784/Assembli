"use client";

import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export const VideoResult = React.forwardRef<
  HTMLDivElement,
  {
    videoUrl: string | null;
    jobCompleted: boolean;
    title?: string;
  }
>(function VideoResult(
  { videoUrl, jobCompleted, title = "Your explainer video" },
  ref,
) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold leading-tight tracking-tight md:text-xl">
        {title}
      </h2>
      {videoUrl ? (
        <>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-[15px]">
            Play the steps below. You can fullscreen for a closer view.
          </p>
          <div
            ref={ref}
            className={cn(
              "aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-card p-3 shadow-lg shadow-black/[0.06] ring-1 ring-black/[0.04] md:p-5 dark:shadow-black/40 dark:ring-white/10",
            )}
          >
            <video
              controls
              playsInline
              className="h-full w-full"
              src={videoUrl}
            />
          </div>
        </>
      ) : jobCompleted ? (
        <Alert variant="destructive">
          <AlertTitle>Video unavailable</AlertTitle>
          <AlertDescription>
            Video is not available yet. Refresh the page.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center text-sm leading-relaxed text-muted-foreground md:p-8">
          Video preview will appear here when your manual is ready.
        </div>
      )}
    </section>
  );
});

VideoResult.displayName = "VideoResult";
