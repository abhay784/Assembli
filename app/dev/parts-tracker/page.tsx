import { notFound } from "next/navigation";
import { AssemblyProgressSection } from "@/components/assembly/AssemblyProgressSection";
import { mockScene } from "@/lib/scene/mock";

/**
 * Dev-only: exercise Parts Usage Tracker + step completion without S3, Redis, or a job.
 * Open http://localhost:3000/dev/parts-tracker when `npm run dev` is running.
 */
export default function DevPartsTrackerPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-landing">
      <div className="mx-auto max-w-[960px] px-4 py-10">
        <div className="mb-8 rounded-lg border border-amber-700/30 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
          <strong className="font-semibold">Development only.</strong> Uses{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">mockScene</code>{" "}
          from <code className="rounded bg-black/5 px-1 dark:bg-white/10">lib/scene/mock.ts</code>.
          Completion state is stored under{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">
            localStorage[&quot;assembli.stepCompletion.v1:demo-parts-tracker&quot;]
          </code>
          .
        </div>
        <AssemblyProgressSection
          jobId="demo-parts-tracker"
          initialScene={mockScene}
        />
      </div>
    </div>
  );
}
