import { Clapperboard, FileUp, Sparkles } from "lucide-react";
import { ManualUpload } from "@/components/upload/ManualUpload";

const STEPS = [
  { icon: FileUp, label: "Upload PDF" },
  { icon: Sparkles, label: "Extract & narrate" },
  { icon: Clapperboard, label: "Watch steps" },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-landing">
      <main className="mx-auto flex w-full max-w-[960px] flex-col gap-10 px-4 pb-24 pt-12 md:gap-14 md:pb-28 md:pt-16">
        <div className="mx-auto w-full max-w-[640px] space-y-8">
          <header className="space-y-6 text-center md:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm md:inline-flex">
              <span
                className="size-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_12px_oklch(0.65_0.17_155_/_0.7)]"
                aria-hidden
              />
              Manual → narrated explainer video
            </p>
            <div className="space-y-4">
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl md:leading-[1.08]">
                Assembly help,{" "}
                <span className="bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent dark:from-teal-300 dark:via-emerald-400 dark:to-teal-400">
                  animated
                </span>
              </h1>
              <p className="text-pretty text-lg leading-relaxed text-muted-foreground md:max-w-[36rem] md:text-xl md:leading-relaxed">
                Upload a furniture assembly manual to queue a narrated explainer
                video—clear steps you can follow without squinting at tiny diagrams.
              </p>
            </div>
            <ul
              className="flex flex-wrap items-center justify-center gap-2 md:justify-start"
              aria-label="What happens after upload"
            >
              {STEPS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-sm text-foreground/90 shadow-sm backdrop-blur-sm"
                >
                  <Icon
                    className="size-4 shrink-0 text-teal-700 dark:text-teal-400"
                    aria-hidden
                  />
                  {label}
                </li>
              ))}
            </ul>
          </header>
        </div>
        <ManualUpload />
      </main>
    </div>
  );
}
