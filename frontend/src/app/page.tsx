"use client";

import Link from "next/link";
import { ArrowRight, Clock, Eye, FileLock, Flame, KeyRound, Link2, Lock, ShieldCheck, Trash2, Zap } from "lucide-react";
import { Logo } from "@/components/brand";
import { CtaBand, FeatureCard, Hero, HeroButton, HeroCard, InfoCard, Section, SiteFooter, SiteNav } from "@/components/kit/site";
import { Button } from "@/components/ui/button";

function Preview() {
  return (
    <HeroCard>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-semibold">You send</p>
          <pre className="rounded-lg bg-code p-3.5 font-mono text-[12px] leading-relaxed text-code-foreground">STRIPE_SECRET_KEY=sk_live_••••••••••••
DB_PASSWORD=••••••••••••</pre>
          <div className="flex flex-wrap gap-2 text-xs">
            {[[Clock, "Expires in 24 h"], [Flame, "1 view"], [KeyRound, "Passphrase"]].map(([Icon, label]) => {
              const I = Icon as typeof Clock;
              return <span key={label as string} className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-muted-foreground"><I className="size-3.5" />{label as string}</span>;
            })}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold">They receive</p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 font-mono text-xs text-muted-foreground"><Link2 className="size-3.5 text-primary" />vaultshare.app/s/Xf3k9…QpL0</div>
          <div className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground"><Flame className="mr-1.5 inline size-4 text-fail" />After it&apos;s opened once, the ciphertext is overwritten and deleted. The link just says &ldquo;no longer works&rdquo;.</div>
        </div>
      </div>
    </HeroCard>
  );
}

export default function Landing() {
  return (
    <>
      <SiteNav brand={<Logo />} links={[["#how", "How it works"], ["#security", "Security"], ["#use-cases", "Use cases"]]}
        actions={<><Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/login">Sign in</Link></Button><Button asChild size="sm"><Link href="/create">Share a secret</Link></Button></>} />
      <main id="main">
        <Hero eyebrow="One-time secret links"
          title="Stop pasting passwords into chat."
          description="VaultShare turns a password, API key or small file into an encrypted link that expires and destroys itself after it's read. Add a passphrase for a second channel."
          actions={<><HeroButton href="/create">Share a secret<ArrowRight data-icon="inline-end" /></HeroButton><HeroButton href="#security" variant="outline">How it&apos;s protected</HeroButton></>}
          note="No account needed. Nothing readable is ever stored."
          visual={<Preview />} />

        <Section id="how" eyebrow="How it works" title="Three steps, then it's gone">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={Lock} title="Encrypt" index={1}>Text or a file up to 10 MB is encrypted with AES-256-GCM before it&apos;s stored.</FeatureCard>
            <FeatureCard icon={Link2} title="Share the link" index={2} delay={0.05}>A 256-bit random token; the database only keeps its hash.</FeatureCard>
            <FeatureCard icon={Eye} title="Open once" index={3} delay={0.1}>Link previews in chat apps can&apos;t trigger it — the recipient presses Reveal.</FeatureCard>
            <FeatureCard icon={Trash2} title="Shredded" index={4} delay={0.15}>After the last view, on expiry or on revoke, the ciphertext is overwritten and deleted.</FeatureCard>
          </div>
        </Section>

        <Section id="security" eyebrow="Security" title="Built to fail closed" description="The full threat model — including what VaultShare can't protect against — is on the Security page, served by the API itself." tinted>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={KeyRound} title="Passphrases aren't stored">The passphrase is part of the key; a wrong one fails the GCM tag. No hash to crack offline.</FeatureCard>
            <FeatureCard icon={Flame} title="Really one-time" delay={0.05}>Views are claimed atomically, so two simultaneous opens can&apos;t both see a one-view secret.</FeatureCard>
            <FeatureCard icon={ShieldCheck} title="Five guesses, then gone" delay={0.1}>The fifth wrong passphrase destroys the secret on the spot.</FeatureCard>
            <FeatureCard icon={FileLock} title="Files stay files">Always downloaded as an attachment with a cleaned name — never rendered in the browser.</FeatureCard>
            <FeatureCard icon={Lock} title="HttpOnly sessions" delay={0.05}>Accounts use a cookie page scripts can&apos;t read; login is rate-limited.</FeatureCard>
            <FeatureCard icon={Zap} title="Safe defaults" delay={0.1}>The server refuses to start in production with the development keys.</FeatureCard>
          </div>
        </Section>

        <Section id="use-cases" eyebrow="Use cases" title="For every secret that shouldn't live in a chat log" last>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoCard title="Client handovers">Hosting logins and API keys for a client, gone once they&apos;ve copied them.</InfoCard>
            <InfoCard title="Onboarding" delay={0.05}>First-day passwords and VPN configs without an email trail.</InfoCard>
            <InfoCard title="Support teams">Ask a customer for a credential without it staying in the ticket.</InfoCard>
            <InfoCard title="Freelancers" delay={0.05}>Receive access from clients through a link that can&apos;t be forwarded twice.</InfoCard>
          </div>
          <CtaBand title="Send your first one-time link" description="It takes ten seconds and nothing readable is kept."
            action={<Button asChild size="lg" variant="secondary" className="h-11 px-5"><Link href="/create">Share a secret<ArrowRight data-icon="inline-end" /></Link></Button>} />
        </Section>
      </main>
      <SiteFooter brand={<Logo />} right={<><Lock className="size-3.5" />AES-256-GCM · shredded after reading</>} />
    </>
  );
}
