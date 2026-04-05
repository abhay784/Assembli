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
    <section className="space-y-3">
      <h2 className="text-lg font-semibold leading-[1.2]">{title}</h2>
      {videoUrl ? (
        <>
          <p className="text-sm text-muted-foreground">
            Play the steps below. You can fullscreen for a closer view.
          </p>
          <div
            ref={ref}
            className={cn(
              "aspect-video w-full overflow-hidden rounded-xl bg-card p-4 md:p-6",
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
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-card p-4 text-center text-sm text-muted-foreground md:p-6">
          Video preview will appear here when your manual is ready.
        </div>
      )}
    </section>
  );
});

VideoResult.displayName = "VideoResult";
