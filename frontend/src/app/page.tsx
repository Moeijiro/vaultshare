import Link from "next/link";
import { Lock, Shield, Flame, Clock, Key, FileCheck, ArrowRight, EyeOff, ServerOff, DatabaseZap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="space-y-24 py-6">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-3xl mx-auto pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
          <Shield className="w-3.5 h-3.5" />
          <span>Zero-Plaintext Storage • Authenticated AES-256-GCM</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Secure, self-destructing <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            secrets & files.
          </span>
        </h1>
        
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Share API keys, database credentials, environment variables, and sensitive config files via one-time encrypted links that burn upon reading.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/create"
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold flex items-center justify-center gap-2 transition glow-emerald"
          >
            Create a Secret Link
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/security"
            className="w-full sm:w-auto px-6 py-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 font-medium transition"
          >
            Read Security Spec
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">How VaultShare Works</h2>
          <p className="text-sm text-zinc-400">An uncompromising ephemeral lifecycle designed for modern security teams.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">1</div>
            <h3 className="font-semibold text-white">Input & Encrypt</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your secret text or small file is encrypted using AES-256-GCM with a unique 96-bit nonce and 128-bit salt before persistence.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">2</div>
            <h3 className="font-semibold text-white">High-Entropy Token</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              A 256-bit cryptographically random token is generated. Only the SHA-256 hash of the token is saved in the database index.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">3</div>
            <h3 className="font-semibold text-white">Explicit Reveal</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Link bots & chat pre-fetchers cannot burn the link. The recipient must explicitly provide the passphrase and click reveal.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">4</div>
            <h3 className="font-semibold text-white">Instant Shredding</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Once maximum views are reached or the timer elapses, ciphertext is zeroed and purged. Subsequent visits yield generic 404s.
            </p>
          </div>
        </div>
      </section>

      {/* Security Principles */}
      <section className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/20 space-y-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-white tracking-tight">Security Design Principles</h2>
          <p className="text-sm text-zinc-400 mt-1">Defensive engineering choices built directly into the core engine.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-4">
            <div className="p-2.5 h-fit rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Flame className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-white text-sm">True Burn-After-Reading</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                When views expire, payload buffers are overwritten with null bytes prior to filesystem unlinking and database removal.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-2.5 h-fit rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-white text-sm">PBKDF2-HMAC-SHA256</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                100,000 iterations for password derivation and constant-time digest comparison to neutralize timing attacks.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-2.5 h-fit rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <EyeOff className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-white text-sm">Creator Blindness</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Senders cannot re-inspect secrets after creation. Even authenticated account dashboards only display metadata and revoke controls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold tracking-tight text-white text-center">Frequently Asked Questions</h2>
        
        <div className="space-y-4">
          <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-2">
            <h3 className="font-medium text-white text-sm">Can I recover a secret if my recipient forgot the password?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              No. By design, passphrases are not stored anywhere and incorrect attempts lead to shredding after 5 failures. You must create a new share link.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-2">
            <h3 className="font-medium text-white text-sm">Will URL previewers in Slack or Microsoft Teams consume the one-time link?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              No. Link crawlers only perform HTTP GET requests to inspect metadata. Revealing a secret requires a dedicated POST transaction with explicit user confirmation.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-2">
            <h3 className="font-medium text-white text-sm">Is VaultShare independently audited?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              No. VaultShare has not undergone a formal third-party security audit. It employs vetted standard cryptographic primitives (AES-GCM, PBKDF2). Review our technical security page for full threat-model transparency.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-12 border border-zinc-800/80 rounded-2xl bg-gradient-to-b from-zinc-900/50 to-zinc-950 p-8 space-y-4">
        <h2 className="text-3xl font-extrabold text-white">Ready to share a confidential credential?</h2>
        <p className="text-zinc-400 text-sm max-w-lg mx-auto">
          No sign-up required for anonymous one-time shares. Free, fast, and cryptographically sound.
        </p>
        <div className="pt-2">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition glow-emerald"
          >
            Create Encrypted Share
          </Link>
        </div>
      </section>
    </div>
  );
}
