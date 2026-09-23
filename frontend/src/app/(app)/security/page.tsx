import { Shield, Lock, Key, Clock, AlertOctagon, Terminal, Flame, Database } from "lucide-react";

export default function SecuritySpecPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-12 py-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
          <Shield className="w-3.5 h-3.5" />
          <span>Technical Whitepaper & Cryptographic Specification</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Security Architecture & Threat Model
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          VaultShare prioritizes transparent, defensible cryptographic engineering. This document describes the cipher primitives, key derivations, memory practices, and explicit architectural limitations.
        </p>
      </div>

      {/* Cryptographic Primitives */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-400" />
          1. Cryptographic Primitives & Storage
        </h2>
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs text-zinc-300 space-y-3 leading-relaxed">
          <p>
            <strong>Envelope Encryption with AES-256-GCM:</strong> Every secret payload (both text and files) is encrypted using Authenticated Encryption with Associated Data (AEAD) provided by the audited Python <code className="text-emerald-400">cryptography</code> library.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 font-mono text-[11px]">
            <li><strong>Cipher:</strong> AES-256 in Galois/Counter Mode (GCM).</li>
            <li><strong>Nonce/IV:</strong> 96-bit cryptographically secure pseudorandom value generated per secret. Nonces are never reused.</li>
            <li><strong>Authentication Tag:</strong> 128-bit tag ensuring ciphertext integrity; tampering causes immediate decryption abort.</li>
            <li><strong>Salt:</strong> 128-bit unique salt per secret.</li>
          </ul>
        </div>
      </section>

      {/* Key Derivation & Passwords */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-emerald-400" />
          2. Key Derivation & Passphrase Defense
        </h2>
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs text-zinc-300 space-y-3 leading-relaxed">
          <p>
            When an optional passphrase is set by the sender, the effective encryption key is derived using <strong>PBKDF2-HMAC-SHA256</strong> with 100,000 rounds combining the server master key and user passphrase.
          </p>
          <p>
            <strong>Constant-Time Verification:</strong> Passphrase checks use constant-time byte comparison (<code className="text-emerald-400">hmac.compare_digest</code>) to neutralize timing-side-channel attacks.
          </p>
          <p>
            <strong>Attempt Lockout:</strong> A strict ceiling of 5 incorrect attempts is enforced per secret. Reaching 5 failures marks the secret consumed and executes an immediate secure memory/disk shredding routine.
          </p>
        </div>
      </section>

      {/* Token Generation */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          3. Token Generation & URL Security
        </h2>
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs text-zinc-300 space-y-3 leading-relaxed">
          <p>
            Public URLs use 256-bit entropy tokens produced by <code className="text-emerald-400">secrets.token_urlsafe(32)</code>.
          </p>
          <p>
            <strong>Token Hashing in Persistence:</strong> Database lookups match against the <strong>SHA-256 hash</strong> of the token. An attacker with read access to the database cannot immediately open links without finding preimage collisions. Sequential IDs are never exposed externally.
          </p>
        </div>
      </section>

      {/* Burn-after-reading Lifecycle */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Flame className="w-5 h-5 text-emerald-400" />
          4. Burn-After-Reading & Ephemeral Lifecycle
        </h2>
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs text-zinc-300 space-y-3 leading-relaxed">
          <p>
            <strong>Crawlers & Pre-fetchers Protection:</strong> Chat preview bots (Slack, Discord, Apple iMessage, Teams) make HTTP GET requests. VaultShare&apos;s <code className="text-emerald-400">GET /shares/&#123;token&#125;/meta</code> route returns only metadata (format, expiry, password requirement). It never decrypts or consumes views.
          </p>
          <p>
            <strong>Immediate Shredding:</strong> Once maximum views are consumed or expiration elapses, file assets are overwritten with zeroes prior to deletion, and DB payload columns are cleared.
          </p>
        </div>
      </section>

      {/* Transparent Limitations */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-amber-400" />
          5. Transparent Threat Model Limitations
        </h2>
        <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-zinc-300 space-y-3 leading-relaxed">
          <p>
            <strong>No Third-Party Security Audit:</strong> VaultShare has not been independently security-audited. It is engineered as a portfolio-grade security application implementing established cryptographic standards.
          </p>
          <p>
            <strong>Server-Assisted Cryptography:</strong> Decryption occurs via FastAPI backend workers. Compromise of the server host memory could expose secrets during transit or active decryption calls. Users requiring end-to-end zero-trust client encryption should encrypt client-side prior to sharing.
          </p>
          <p>
            <strong>Recipient Exfiltration:</strong> Cryptographic enforcement ceases once data is delivered to the recipient browser. VaultShare cannot prevent recipients from saving files or taking screenshots.
          </p>
        </div>
      </section>
    </div>
  );
}
