"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, FileLock, FileText, Flame, KeyRound, Lock, Plus, Upload } from "lucide-react";
import { useSession } from "@/components/session";
import { SelectField } from "@/components/kit/select-field";
import { PageTitle, Panel, Field } from "@/components/kit/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, type Expiration, type MaxViews, type ShareResponse } from "@/lib/api";
import { bytes, EXPIRATIONS, until, VIEWS, when } from "@/lib/format";

const MAX_MB = 10;

export default function CreatePage() {
  const { user } = useSession();
  const [kind, setKind] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [expiration, setExpiration] = useState("1440");
  const [views, setViews] = useState("1");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<ShareResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let share: ShareResponse;
      if (kind === "text") {
        share = await api.createText({ text, expiration_minutes: Number(expiration) as Expiration, max_views: Number(views) as MaxViews, password: password || undefined });
      } else {
        if (!file) throw new Error("Choose a file first.");
        if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Files are limited to ${MAX_MB} MB.`);
        const form = new FormData();
        form.append("file", file);
        form.append("expiration_minutes", expiration);
        form.append("max_views", views);
        if (password) form.append("password", password);
        share = await api.createFile(form);
      }
      setCreated(share);
      setText("");
      setFile(null);
      setPassword("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const link = created ? `${typeof window !== "undefined" ? window.location.origin : ""}${created.share_url}` : "";

  if (created) {
    return (
      <>
        <PageTitle title="Your link is ready" description="Send it over a different channel than the passphrase, if you set one." />
        <Panel className="max-w-2xl" bodyClassName="space-y-5 p-5">
          <div className="flex items-center gap-2 rounded-lg border border-ok/30 bg-ok/5 px-3 py-2.5 text-sm"><Lock className="size-4 text-ok" />Encrypted and stored. VaultShare can&apos;t show you this secret again.</div>
          <div className="flex gap-2">
            <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Share link" />
            <Button onClick={async () => { await navigator.clipboard.writeText(link).catch(() => undefined); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy"}</Button>
          </div>
          <div>
            <Field label="Contains">{created.share_type === "text" ? "Text secret" : "Encrypted file"}</Field>
            <Field label="Expires">{when(created.expires_at)} ({until(created.expires_at)})</Field>
            <Field label="Views">{created.max_views === 1 ? "One view, then destroyed" : `${created.max_views} views, then destroyed`}</Field>
            <Field label="Passphrase">{created.has_password ? "Required — 5 wrong guesses destroy it" : "None"}</Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCreated(null)}><Plus />Share another</Button>
            {user ? null : <p className="self-center text-xs text-muted-foreground">Sign in before creating links to see and revoke them later.</p>}
          </div>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageTitle title="New secret" description="Encrypted with AES-256-GCM on the server; the link works for a limited time and a limited number of views." />
      <form onSubmit={submit} className="grid max-w-5xl grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel bodyClassName="space-y-4 p-5">
          <Tabs value={kind} onValueChange={(v) => setKind(v as "text" | "file")}>
            <TabsList><TabsTrigger value="text"><FileText />Text</TabsTrigger><TabsTrigger value="file"><FileLock />File</TabsTrigger></TabsList>
          </Tabs>
          {kind === "text" ? (
            <div className="space-y-1.5">
              <Label htmlFor="secret">Secret</Label>
              <Textarea id="secret" required maxLength={100000} rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="Password, API key, recovery codes…" className="font-mono text-sm" autoComplete="off" spellCheck={false} />
            </div>
          ) : (
            <div>
              <input ref={input} type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="File" />
              <button type="button" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0] ?? null); }}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 px-6 py-12 text-center transition-colors hover:border-primary/50">
                <Upload className="size-6 text-primary" />
                {file ? <span className="text-sm font-medium">{file.name} · {bytes(file.size)}</span> : <span className="text-sm">Drop a file here or <span className="text-primary">choose one</span></span>}
                <span className="text-xs text-muted-foreground">Up to {MAX_MB} MB · delivered as a download, never opened in the browser</span>
              </button>
            </div>
          )}
        </Panel>
        <Panel title="Rules" bodyClassName="space-y-4 p-5">
          <div className="space-y-1.5"><Label htmlFor="exp">Expires after</Label><SelectField id="exp" label="Expires after" value={expiration} onChange={setExpiration} options={EXPIRATIONS} /></div>
          <div className="space-y-1.5"><Label htmlFor="views">Can be opened</Label><SelectField id="views" label="Views" value={views} onChange={setViews} options={VIEWS} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="pw" className="flex items-center gap-1.5"><KeyRound className="size-3.5" />Passphrase <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="pw" type="password" maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <p className="text-xs text-muted-foreground">Part of the encryption key — not stored anywhere.</p>
          </div>
          <Button type="submit" className="w-full" disabled={busy || (kind === "text" ? !text.trim() : !file)}>
            {views === "1" ? <Flame /> : <Lock />}{busy ? "Encrypting…" : "Create link"}
          </Button>
        </Panel>
      </form>
    </>
  );
}
