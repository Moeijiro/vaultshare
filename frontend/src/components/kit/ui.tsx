"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Building blocks shared by every product in the house style. */

export type Tone = "ok" | "warn" | "fail" | "run" | "primary" | "muted";

const TONE: Record<Tone, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  fail: "var(--fail)",
  run: "var(--run)",
  primary: "var(--primary)",
  muted: "var(--muted-foreground)",
};

export function PageTitle({ title, description, actions, eyebrow }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1.5 text-sm text-muted-foreground">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, description, action, children, className, bodyClassName }: {
  title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}>
      {title ? (
        <header className="flex items-start justify-between gap-3 border-b px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone, icon: Icon }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: Tone; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular" style={tone ? { color: TONE[tone] } : undefined}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** A small coloured status label: <Pill tone="ok">Resolved</Pill>. */
export function Pill({ tone = "muted", children, dot = true, pulse = false, className }: { tone?: Tone; children: React.ReactNode; dot?: boolean; pulse?: boolean; className?: string }) {
  const color = TONE[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", className)}
      style={{ color, borderColor: `color-mix(in oklch, ${color} 30%, transparent)`, background: `color-mix(in oklch, ${color} 9%, transparent)` }}>
      {dot ? <span className={cn("size-1.5 rounded-full", pulse && "animate-pulse")} style={{ background: color }} /> : null}
      {children}
    </span>
  );
}

/** Neutral tag for categories and labels. */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md border bg-muted/60 px-1.5 py-0.5 text-[11.5px] font-medium text-muted-foreground", className)}>{children}</span>;
}

export function CodeBlock({ value, className, copy = false }: { value: unknown; className?: string; copy?: boolean }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("relative", className)}>
      <pre className="overflow-auto rounded-lg bg-code p-3.5 font-mono text-[12px] leading-relaxed text-code-foreground">{text}</pre>
      {copy ? (
        <button type="button" aria-label="Copy" onClick={async () => { await navigator.clipboard.writeText(text).catch(() => undefined); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
          className="absolute top-2 right-2 rounded-md bg-white/10 p-1.5 text-code-foreground hover:bg-white/20">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      ) : null}
    </div>
  );
}

export function Empty({ title, description, icon: Icon, action, className }: { title: string; description?: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {Icon ? <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-accent"><Icon className="size-5 text-primary" /></span> : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-10 text-center">
      <AlertTriangle className="size-5 text-destructive" />
      <p className="max-w-md text-sm">{message}</p>
      {onRetry ? <Button variant="outline" size="sm" onClick={onRetry}><RotateCw />Try again</Button> : null}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export function RowsLoading({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-2 p-4" role="status" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>;
}

/** Key/value rows inside a Panel. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)] gap-3 border-b py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

/** Table with the house header style. Wrap rows in <tbody>; use Th/Td for cells. */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)}>{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("border-b bg-muted/40 px-5 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted-foreground", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("border-b px-5 py-3 align-middle", className)}>{children}</td>;
}

/** Horizontal bar used for simple breakdown charts. */
export function Bar({ label, value, max, hint, tone = "primary" }: { label: string; value: number; max: number; hint?: React.ReactNode; tone?: Tone }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular">{hint ?? value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: TONE[tone] }} />
      </div>
    </div>
  );
}
