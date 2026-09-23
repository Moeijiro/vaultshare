"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, LogIn, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Login failed" }));
        throw new Error(err.detail || "Invalid credentials");
      }
      const data = await res.json();
      localStorage.setItem("vault_token", data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
          <Lock className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-white">Owner Account Login</h1>
        <p className="text-xs text-zinc-400">Sign in to manage your active and expired secret dispatches.</p>
      </div>

      <form onSubmit={handleLogin} className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition glow-emerald"
        >
          <LogIn className="w-4 h-4" />
          {loading ? "Authenticating..." : "Sign In"}
        </button>

        <p className="text-center text-[11px] text-zinc-500 pt-2">
          Don&apos;t have an owner account?{" "}
          <Link href="/register" className="text-emerald-400 hover:underline">
            Register here
          </Link>
        </p>
      </form>
    </div>
  );
}
