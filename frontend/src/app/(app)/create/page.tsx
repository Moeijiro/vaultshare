"use client";

import { useState } from "react";
import { Lock, FileText, Upload, Copy, Check, AlertTriangle, ShieldCheck, Flame, Clock, Eye } from "lucide-react";
import { api, ShareResponse } from "@/lib/api";

export default function CreatePage() {
  const [tab, setTab] = useState<"text" | "file">("text");
  const [secretText, setSecretText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [expiration, setExpiration] = useState<number>(1440);
  const [maxViews, setMaxViews] = useState<number>(1);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdShare, setCreatedShare] = useState<ShareResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "text") {
        if (!secretText.trim()) {
          throw new Error("Secret text cannot be empty.");
        }
        const token = typeof window !== "undefined" ? localStorage.getItem("vault_token") || undefined : undefined;
        const res = await api.createTextShare(
          {
            text: secretText,
            expiration_minutes: expiration,
            max_views: maxViews,
            password: password.trim() || undefined,
          },
          token
        );
        setCreatedShare(res);
      } else {
        if (!file) {
          throw new Error("Please select a file to upload.");
        }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("expiration_minutes", expiration.toString());
        formData.append("max_views", maxViews.toString());
        if (password.trim()) {
          formData.append("password", password.trim());
        }
        const token = typeof window !== "undefined" ? localStorage.getItem("vault_token") || undefined : undefined;
        const res = await api.createFileShare(formData, token);
        setCreatedShare(res);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create share.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!createdShare) return;
    const fullUrl = `${window.location.origin}${createdShare.share_url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function resetForm() {
    setSecretText("");
    setFile(null);
    setPassword("");
    setCreatedShare(null);
    setCopied(false);
    setError(null);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
          <Lock className="w-6 h-6 text-emerald-400" />
          Create Encrypted Secret
        </h1>
        <p className="text-sm text-zinc-400">
          Encrypted with AES-256-GCM before storage. Self-destructs automatically.
        </p>
      </div>

      {createdShare ? (
        <div className="p-6 rounded-2xl border border-emerald-500/30 bg-zinc-900/90 shadow-2xl space-y-6 glow-emerald">
          <div className="flex items-center gap-3 text-emerald-400">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Encrypted Share Ready</h3>
              <p className="text-xs text-zinc-400">Copy the unique one-time link below.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Shareable URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== "undefined" ? `${window.location.origin}${createdShare.share_url}` : createdShare.share_url}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Expires in: {createdShare.expires_at.replace("T", " ").substring(0, 19)} UTC</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Eye className="w-3.5 h-3.5 text-zinc-500" />
              <span>Max Views: {createdShare.max_views}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-2.5 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <p className="leading-relaxed">
              <strong>Important security note:</strong> Secret content cannot be viewed again by the sender. Once closed or destroyed, it is permanently purged.
            </p>
          </div>

          <button
            onClick={resetForm}
            className="w-full py-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 text-xs font-medium transition"
          >
            Create Another Secret
          </button>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-6">
          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setTab("text")}
              className={`py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                tab === "text" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Text Secret
            </button>
            <button
              type="button"
              onClick={() => setTab("file")}
              className={`py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                tab === "file" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Small File (≤ 10MB)
            </button>
          </div>

          {tab === "text" ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Secret Text / Key / Config</label>
              <textarea
                rows={6}
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Paste API keys, passwords, connection strings, or confidential notes here..."
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Encrypted Attachment File</label>
              <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 rounded-xl p-6 text-center cursor-pointer relative">
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  required
                />
                <Upload className="w-8 h-8 mx-auto text-zinc-500 mb-2" />
                {file ? (
                  <p className="text-sm font-medium text-emerald-400">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
                ) : (
                  <p className="text-xs text-zinc-400">
                    Click or drag file here (Max 10 MB). Will be encrypted using AES-256-GCM.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Expiration Window
              </label>
              <select
                value={expiration}
                onChange={(e) => setExpiration(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value={10}>10 minutes</option>
                <option value={60}>1 hour</option>
                <option value={1440}>24 hours</option>
                <option value={10080}>7 days</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-zinc-400" />
                Maximum Views
              </label>
              <select
                value={maxViews}
                onChange={(e) => setMaxViews(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>1 view (Burn after reading)</option>
                <option value={2}>2 views</option>
                <option value={5}>5 views</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300">
              Optional Recipient Passphrase
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for link-only authentication"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-zinc-500">
              If set, recipient must provide this passphrase. Shreds automatically after 5 failed attempts.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-sm transition glow-emerald flex items-center justify-center gap-2"
          >
            {loading ? "Encrypting & Storing..." : "Generate Secure Link"}
          </button>
        </form>
      )}
    </div>
  );
}
