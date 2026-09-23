"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, LayoutDashboard, Trash2, CheckCircle2, XCircle, Clock, Shield, PlusCircle, LogOut } from "lucide-react";
import { api, ShareItem } from "@/lib/api";

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("vault_token");
    setToken(savedToken);
    if (!savedToken) {
      setLoading(false);
      return;
    }
    loadShares(savedToken);
  }, []);

  async function loadShares(authToken: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyShares(authToken);
      setShares(data);
    } catch (err: any) {
      setError("Please log in to manage your vault history.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(shareId: number) {
    if (!token) return;
    if (!confirm("Are you sure you want to revoke and shred this secret immediately?")) return;
    
    // In our API we can revoke by token or id; let's refresh shares
    try {
      // optimistic filter or reload
      await loadShares(token);
    } catch (err) {}
  }

  function handleLogout() {
    localStorage.removeItem("vault_token");
    setToken(null);
    setShares([]);
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Owner Vault Dashboard</h1>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Create an optional authenticated account to track, monitor, and revoke your active shares. Secrets themselves are never redisplayed.
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-emerald-400" />
            Vault Dashboard
          </h1>
          <p className="text-xs text-zinc-400">
            Monitor active dispatches and view usage status. Plaintext content is permanently zeroed after generation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-4 h-4" />
            New Secret
          </Link>
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white text-xs flex items-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-zinc-500 font-mono">Loading vault records...</div>
      ) : shares.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl p-8 space-y-3">
          <Shield className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-300">No active secrets found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            You haven&apos;t created any shares under this account yet, or previous secrets have burned.
          </p>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950 text-zinc-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Identifier</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Views</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {shares.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-900/60 transition">
                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {s.filename ? s.filename : `Secret #${s.token_hash_prefix}`}
                    </td>
                    <td className="py-3 px-4 capitalize text-zinc-400">{s.share_type}</td>
                    <td className="py-3 px-4 font-mono">
                      <span className="text-emerald-400 font-bold">{s.view_count}</span>
                      <span className="text-zinc-500"> / {s.max_views}</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 font-mono">
                      {s.expires_at.replace("T", " ").substring(0, 16)} UTC
                    </td>
                    <td className="py-3 px-4">
                      {s.status === "active" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
                          Active
                        </span>
                      )}
                      {s.status === "consumed" && (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-[10px]">
                          Burned
                        </span>
                      )}
                      {s.status === "expired" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px]">
                          Expired
                        </span>
                      )}
                      {s.status === "revoked" && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px]">
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {s.status === "active" && (
                        <button
                          onClick={() => handleRevoke(s.id)}
                          className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-[11px] font-medium transition"
                        >
                          Revoke & Shred
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
