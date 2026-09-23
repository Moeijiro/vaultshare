"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") await api.register(email, password);
      await api.login(email, password);
      refresh();
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dots px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center"><Logo /></Link>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-[0_24px_60px_-30px_rgba(30,50,120,0.35)]">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{mode === "login" ? "Sign in" : "Create an account"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? "See and revoke the links you've created." : "Optional — sharing works without one."}</p>
          </div>
          <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={mode === "register" ? 8 : undefined} maxLength={72} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === "register" ? <p className="text-xs text-muted-foreground">At least 8 characters.</p> : null}
          </div>
          {error ? <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? <>No account? <Link href="/register" className="text-primary hover:underline">Create one</Link></> : <>Have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link></>}
          </p>
        </form>
      </div>
    </div>
  );
}
