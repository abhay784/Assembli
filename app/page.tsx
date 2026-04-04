import { ManualUpload } from "@/components/upload/ManualUpload";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-16 md:py-16">
      <header className="space-y-2">
        <h1 className="text-[28px] font-semibold leading-[1.2] tracking-tight text-foreground">
          Assembli
        </h1>
        <p className="text-base font-normal leading-normal text-muted-foreground">
          Upload a furniture assembly manual to queue a narrated explainer video.
        </p>
      </header>
      <ManualUpload />
    </main>
  );
}
