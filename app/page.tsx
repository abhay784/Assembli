import { ManualUpload } from "@/components/upload/ManualUpload";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";

export default function Home() {
  return (
    <div className="assembli-backdrop relative min-h-screen overflow-hidden">
      <AnimatedGridPattern
        numSquares={42}
        maxOpacity={0.12}
        duration={5}
        repeatDelay={0.8}
        width={48}
        height={48}
        className="text-teal-600/35 [mask-image:radial-gradient(ellipse_75%_65%_at_50%_40%,#000_35%,transparent)]"
      />
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-14 md:gap-12 md:py-20">
        <header className="space-y-4 text-center md:text-left">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-orange-700/90 md:text-sm">
            Manual in → video out
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 md:text-5xl">
            Build clarity with{" "}
            <AnimatedGradientText
              speed={1.15}
              colorFrom="#ea580c"
              colorTo="#0d9488"
              className="font-display font-bold"
            >
              Assembli
            </AnimatedGradientText>
          </h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-600 md:mx-0 md:text-lg">
            Drop an IKEA-style PDF. We extract steps, narrate each beat, and render a
            watchable explainer — warm visuals, crisp motion, zero guesswork.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <span className="rounded-full bg-teal-100/90 px-3 py-1 text-xs font-semibold text-teal-900 ring-1 ring-teal-700/15">
              Claude extraction
            </span>
            <span className="rounded-full bg-amber-100/90 px-3 py-1 text-xs font-semibold text-amber-950 ring-1 ring-amber-700/20">
              ElevenLabs voice
            </span>
            <span className="rounded-full bg-orange-100/90 px-3 py-1 text-xs font-semibold text-orange-950 ring-1 ring-orange-600/20">
              Remotion video
            </span>
          </div>
        </header>
        <ManualUpload />
      </main>
    </div>
  );
}
