"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Lock, Flame, ShieldAlert, Download, Copy, Check, Key, FileCheck, EyeOff, AlertTriangle } from "lucide-react";
import { api, ShareMeta, RevealTextResponse } from "@/lib/api";

export default function ShareViewPage() {
  const params = useParams();
  const token = params?.token as string;

  const [meta, setMeta] = useState<ShareMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [password, setPassword] = useState("");
  const [revealedData, setRevealedData] = useState<RevealTextResponse | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConsumedOrNotFound, setIsConsumedOrNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .getMetadata(token)
      .then((data) => {
        setMeta(data);
        setLoading(false);
      })
      .catch((err) => {
        setIsConsumedOrNotFound(true);
        setLoading(false);
      });
  }, [token]);

  async function handleRevealText() {
    setRevealing(true);
    setError(null);
    try {
      const data = await api.unlockText(token, password.trim() || undefined);
      setRevealedData(data);
    } catch (err: any) {
      setError(err.message || "Failed to reveal secret.");
    } finally {
      setRevealing(false);
    }
  }

  async function handleDownloadFile() {
    setRevealing(true);
    setError(null);
    try {
      const blob = await api.downloadFile(token, password.trim() || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta?.filename || "downloaded-secret.bin";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDownloadSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to download file.");
    } finally {
      setRevealing(false);
    }
  }

  function handleCopy() {
    if (!revealedData) return;
    navigator.clipboard.writeText(revealedData.secret_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-zinc-400 font-mono">Verifying cryptographic token...</p>
      </div>
    );
  }

  if (isConsumedOrNotFound) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Secret Destroyed or Expired</h1>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            This link does not exist, has exceeded its maximum allowed views, or reached its expiration limit. It has been permanently shredded from memory and storage.
          </p>
        </div>
        <div className="pt-2">
          <a
            href="/"
            className="inline-block px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition"
          >
            Go to VaultShare Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
          <Lock className="w-3.5 h-3.5" />
          <span>Encrypted Vault Dispatch</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          {meta?.share_type === "file" ? "Encrypted File Received" : "Secure Secret Received"}
        </h1>
        <p className="text-xs text-zinc-400">
          Remaining views: <span className="text-emerald-400 font-bold">{meta?.views_remaining}</span> • Expires at{" "}
          {meta?.expires_at.replace("T", " ").substring(0, 19)} UTC
        </p>
      </div>

      {/* Secret Already Revealed (Text) */}
      {revealedData ? (
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Decrypted Plaintext</span>
            {revealedData.is_destroyed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-mono">
                <Flame className="w-3 h-3" />
                Shredded & Burned
              </span>
            )}
          </div>

          <div className="relative">
            <textarea
              readOnly
              rows={8}
              value={revealedData.secret_text}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm font-mono text-emerald-300 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-400 space-y-1">
            <p>
              <strong>Status:</strong>{" "}
              {revealedData.is_destroyed
                ? "This secret has been irreversibly shredded. If you refresh or close this tab, you will not be able to retrieve it again."
                : `${revealedData.views_remaining} view(s) remaining before permanent shredding.`}
            </p>
          </div>
        </div>
      ) : downloadSuccess ? (
        <div className="p-6 rounded-2xl border border-emerald-500/30 bg-zinc-900/80 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <FileCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">File Decrypted & Downloaded</h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            The file payload has been safely streamed and decrypted. If max views were reached, it has been shredded from the vault.
          </p>
        </div>
      ) : (
        /* Reveal Confirmation & Password Form */
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-6 shadow-xl">
          {meta?.has_password && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-zinc-400" />
                This secret is protected with a passphrase:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passphrase to unlock"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {meta?.share_type === "file" && (
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-white">{meta.filename}</p>
                <p className="text-zinc-500 font-mono">
                  {meta.file_size ? `${(meta.file_size / 1024).toFixed(1)} KB` : "Encrypted File"}
                </p>
              </div>
            </div>
          )}

          <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-2.5 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <p className="leading-relaxed">
              <strong>Burn Warning:</strong> Clicking the button below will consume a view. If this is a one-time link, the secret will be shredded immediately.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {meta?.share_type === "file" ? (
            <button
              onClick={handleDownloadFile}
              disabled={revealing}
              className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-sm transition glow-emerald flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {revealing ? "Decrypting & Downloading..." : "Decrypt & Download File"}
            </button>
          ) : (
            <button
              onClick={handleRevealText}
              disabled={revealing}
              className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-sm transition glow-emerald flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4" />
              {revealing ? "Decrypting Secret..." : "Reveal Secret"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
