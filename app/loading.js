// Global, lett lasteindikator. Holdes minimal for å unngå tung flash.
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-hairline" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-lavender animate-spin" />
        </div>
        <div className="flex items-center gap-1.5 text-ink">
          <span className="font-heading font-bold tracking-[-0.02em] text-lg">DigiHome</span>
          <span className="h-1.5 w-1.5 rounded-full bg-lavender" />
        </div>
      </div>
    </div>
  );
}
