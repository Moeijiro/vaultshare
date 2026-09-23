"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Marketing-page pieces shared by every product landing page. */

const ease = [0.22, 1, 0.36, 1] as const;

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay, ease }}>{children}</motion.div>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-primary">{children}</p>;
}

export function SiteNav({ brand, links, actions }: { brand: React.ReactNode; links: [string, string][]; actions: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="Home">{brand}</Link>
        <ul className="hidden gap-1 text-sm md:flex">
          {links.map(([href, label]) => (
            <li key={href}><a href={href} className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">{label}</a></li>
          ))}
        </ul>
        <div className="ml-auto flex gap-2">{actions}</div>
      </nav>
    </header>
  );
}

export function Hero({ eyebrow, title, description, actions, note, visual }: { eyebrow: React.ReactNode; title: React.ReactNode; description: React.ReactNode; actions: React.ReactNode; note?: React.ReactNode; visual?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="pointer-events-none absolute inset-0 bg-dots [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000,transparent)]" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>
          {note ? <p className="mt-3 text-xs text-muted-foreground">{note}</p> : null}
        </motion.div>
        {visual ? (
          <motion.div className="mt-14" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15, ease }}>
            {visual}
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}

export function Section({ id, eyebrow, title, description, children, tinted = false, last = false }: { id?: string; eyebrow: string; title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; tinted?: boolean; last?: boolean }) {
  return (
    <section id={id} className={cn("scroll-mt-14 py-20 sm:py-24", !last && "border-b", tinted && "bg-card/60")}>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p> : null}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

export function FeatureCard({ icon: Icon, title, children, index, delay = 0 }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode; index?: number; delay?: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="h-full rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <Icon className="size-5 text-primary" />
          {index !== undefined ? <span className="font-mono text-xs text-muted-foreground">{String(index).padStart(2, "0")}</span> : null}
        </div>
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{children}</p>
      </div>
    </Reveal>
  );
}

/** The accent band that closes the last section. */
export function CtaBand({ title, description, action }: { title: string; description: string; action: React.ReactNode }) {
  return (
    <Reveal className="mt-16 rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
      <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-primary-foreground/80">{description}</p>
      <div className="mt-8 flex justify-center">{action}</div>
    </Reveal>
  );
}

/** Title + body card used for use cases. */
export function InfoCard({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="h-full rounded-xl border bg-card p-6">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </Reveal>
  );
}

export function SiteFooter({ brand, note, right }: { brand: React.ReactNode; note?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        {brand}
        <p className="text-xs">{note ?? "A portfolio project · MIT licensed · demo data is generated"}</p>
        {right ? <span className="flex items-center gap-1.5 text-xs">{right}</span> : null}
      </div>
    </footer>
  );
}

export function HeroButton({ href, children, variant = "default" }: { href: string; children: React.ReactNode; variant?: "default" | "outline" }) {
  const external = href.startsWith("#") || href.startsWith("http");
  return (
    <Button asChild size="lg" variant={variant} className="h-11 px-5">
      {external ? <a href={href}>{children}</a> : <Link href={href}>{children}</Link>}
    </Button>
  );
}

/** Panel shown under the hero: a product preview in a raised card. */
export function HeroCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border bg-card p-5 shadow-[0_24px_60px_-30px_rgba(30,50,120,0.35)] sm:p-7", className)}>{children}</div>;
}
