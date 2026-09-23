"useclient";
import Link from "next/link";
import { Lock, Shield, PlusCircle, LayoutDashboard, KeyRound } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:border-emerald-500/60 transition">
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-white flex items-center gap-1.5">
              VaultShare
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 font-mono">
                AES-256
              </span>
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/create"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition"
          >
            <PlusCircle className="w-4 h-4" />
            New Secret
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-zinc-300 hover:text-white transition"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/security"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-zinc-400 hover:text-emerald-400 transition"
          >
            <Shield className="w-4 h-4" />
            Security Spec
          </Link>
        </div>
      </div>
    </nav>
  );
}
