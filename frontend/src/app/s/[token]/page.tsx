"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Copy, Download, Eye, FileLock, Flame, KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand";
import { CodeBlock, Field, PageLoading } from "@/components/kit/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { api, ApiError, type RevealTextResponse } from "@/lib/api";
import { bytes, until } from "@/lib/format";

/**
 * The recipient's page. Opening the link only reads metadata (safe for chat-app link
 * previews); the secret is decrypted when the recipient presses Reveal.
 */
export default function RevealPage() {
  const { token } = useParams<{ token: string }>();
  const meta = useApi(() => api.meta(token), token);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [revealed, setRevealed] = useState<RevealTextResponse | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function open(e: React.FormEvent) {
    e.preventDefault();
    if (!meta.data) return;
    setBusy(true);
    setError(null);
    try {
      if (meta.data.share_type === "text") {
        setRevealed(await api.unlock(token, password || undefined));
      } else {
        const blob = await api.download(token, password || undefined);
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), { href: url, download: meta.data.filename ?? "download.bin" });
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setDownloaded(true);
      }
    } catch (err) {
      const e2 = err as ApiError;
      if (e2.status === 404 || e2.status === 403) setGone(true);
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  const missing = gone || (meta.error && (meta.error.includes("not found") || meta.error.includes("expired") || meta.error.includes("consumed")));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b"><div className="mx-auto flex h-14 max-w-3xl items-center px-5"><Link href="/"><Logo /></Link></div></header>
      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-5 py-12">
        {revealed ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">Here&apos;s your secret</h1>
            <div className="relative">
              <CodeBlock value={revealed.secret_text} />
              <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={async () => { await navigator.clipboard.writeText(revealed.secret_text).catch(() => undefined); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy"}</Button>
            </div>
            <p className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm">
              {revealed.is_destroyed ? <><Flame className="size-4 text-fail" />This secret has now been destroyed. Copy it before leaving the page.</> : <><Eye className="size-4 text-primary" />{revealed.views_remaining} more view{revealed.views_remaining === 1 ? "" : "s"} before it&apos;s destroyed.</>}
            </p>
          </div>
        ) : downloaded ? (
          <div className="space-y-3 text-center">
            <Check className="mx-auto size-10 text-ok" />
            <h1 className="text-2xl font-semibold tracking-tight">Download started</h1>
            <p className="text-sm text-muted-foreground">If this was the last allowed view, the encrypted file has been overwritten and deleted.</p>
          </div>
        ) : missing ? (
          <div className="space-y-3 text-center">
            <ShieldAlert className="mx-auto size-10 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">This link no longer works</h1>
            <p className="text-sm text-muted-foreground">It was already opened, expired, revoked, or destroyed after too many wrong passphrases. Ask the sender for a new one.</p>
            <Button asChild variant="outline"><Link href="/">What is VaultShare?</Link></Button>
          </div>
        ) : meta.error ? (
          <p className="text-center text-sm text-destructive">{meta.error}</p>
        ) : !meta.data ? <PageLoading /> : (
          <form onSubmit={open} className="space-y-5">
            <div className="text-center">
              <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-accent"><ShieldCheck className="size-6 text-primary" /></span>
              <h1 className="text-2xl font-semibold tracking-tight">Someone shared a {meta.data.share_type === "text" ? "secret" : "file"} with you</h1>
              <p className="mt-1 text-sm text-muted-foreground">It&apos;s still encrypted. Opening it counts as a view.</p>
            </div>
            <div className="rounded-xl border bg-card px-5 py-2">
              {meta.data.share_type === "file" ? <Field label="File"><span className="inline-flex items-center gap-1.5"><FileLock className="size-4 text-primary" />{meta.data.filename} · {bytes(meta.data.file_size)}</span></Field> : null}
              <Field label="Expires">{until(meta.data.expires_at)}</Field>
              <Field label="Views left">{meta.data.views_remaining === 1 ? "1 — destroyed after you open it" : meta.data.views_remaining}</Field>
            </div>
            {meta.data.has_password ? (
              <div className="space-y-1.5">
                <label htmlFor="pw" className="flex items-center gap-1.5 text-sm font-medium"><KeyRound className="size-3.5" />Passphrase</label>
                <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" autoFocus />
              </div>
            ) : null}
            {error ? <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <Button type="submit" size="lg" className="h-11 w-full" disabled={busy}>
              {meta.data.share_type === "text" ? <Eye /> : <Download />}{busy ? "Decrypting…" : meta.data.share_type === "text" ? "Reveal secret" : "Download file"}
            </Button>
          </form>
        )}
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">Encrypted with AES-256-GCM · shredded after the last view</footer>
    </div>
  );
}
