import Link from "next/link";
import { ShieldCheck, Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 py-10 mt-20 text-xs text-zinc-500">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-500" />
          <span>VaultShare — Ephemeral, authenticated secret and file dispatch.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/security" className="hover:text-emerald-400 transition">
            Threat Model & Cryptographic Spec
          </Link>
          <a
            href="https://github.com/Moeijiro/vaultshare"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            GitHub
          </a>
          <span>MIT License © 2026</span>
        </div>
      </div>
    </footer>
  );
}
