import { cn } from "@/lib/utils";

/** Square accent tile with a 24×24 stroke glyph, plus the product name. */
export function BrandMark({ name, children, className, wordmark = true }: { name: string; children: React.ReactNode; className?: string; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {children}
        </svg>
      </span>
      {wordmark ? <span className="font-semibold tracking-tight">{name}</span> : null}
    </span>
  );
}
