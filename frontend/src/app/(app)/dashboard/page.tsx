"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Ban, CheckCircle2, Clock, FileLock, FileText, FolderLock, LogIn, Plus, Timer } from "lucide-react";
import { useSession } from "@/components/session";
import { Empty, ErrorState, PageLoading, PageTitle, Panel, Pill, RowsLoading, Stat, Table, Td, Th } from "@/components/kit/ui";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { STATUS, until, when } from "@/lib/format";

export default function MyLinksPage() {
  const { user, ready } = useSession();
  if (!ready) return <PageLoading />;
  if (!user) {
    return (
      <>
        <PageTitle title="My links" />
        <div className="rounded-xl border bg-card">
          <Empty icon={LogIn} title="Sign in to see your links" description="Links you create while signed in are listed here, with their status — and you can revoke them."
            action={<div className="flex gap-2"><Button asChild><Link href="/login">Sign in</Link></Button><Button asChild variant="outline"><Link href="/register">Create an account</Link></Button></div>} />
        </div>
      </>
    );
  }
  return <Links />;
}

function Links() {
  const data = useApi(() => Promise.all([api.stats(), api.mine()]), "mine");
  const [busy, setBusy] = useState<number | null>(null);

  async function revoke(id: number) {
    if (!confirm("Revoke this link? The secret is destroyed immediately.")) return;
    setBusy(id);
    try {
      await api.revokeMine(id);
      toast.success("Link revoked and secret destroyed");
      data.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  const [stats, shares] = data.data ?? [null, null];
  return (
    <>
      <PageTitle title="My links" description="Only metadata is listed — the secrets themselves can't be shown again, even to you." actions={<Button asChild><Link href="/create"><Plus />New secret</Link></Button>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Created" icon={FolderLock} value={stats?.total_created ?? "—"} />
        <Stat label="Active" icon={Timer} value={stats?.active_count ?? "—"} tone={stats?.active_count ? "ok" : undefined} />
        <Stat label="Opened or revoked" icon={CheckCircle2} value={stats?.consumed_count ?? "—"} />
        <Stat label="Expired unopened" icon={Clock} value={stats?.expired_count ?? "—"} tone={stats?.expired_count ? "warn" : undefined} />
      </div>
      <Panel bodyClassName="p-0">
        {!shares ? <RowsLoading /> : shares.length === 0 ? <Empty icon={FolderLock} title="No links yet" description="Create a secret while signed in and it will show up here." /> : (
          <Table>
            <thead><tr><Th>Secret</Th><Th>Status</Th><Th>Views</Th><Th>Created</Th><Th>Expires</Th><Th className="text-right" /></tr></thead>
            <tbody>
              {shares.map((s) => {
                const st = STATUS[s.status];
                return (
                  <tr key={s.id}>
                    <Td><span className="flex items-center gap-2">{s.share_type === "file" ? <FileLock className="size-4 text-primary" /> : <FileText className="size-4 text-primary" />}<span className="font-medium">{s.filename ?? "Text secret"}</span><span className="font-mono text-xs text-muted-foreground">#{s.token_hash_prefix}</span></span></Td>
                    <Td><Pill tone={st.tone}>{st.label}</Pill></Td>
                    <Td className="tabular">{s.view_count} / {s.max_views}</Td>
                    <Td className="text-xs whitespace-nowrap text-muted-foreground">{when(s.created_at)}</Td>
                    <Td className="text-xs whitespace-nowrap text-muted-foreground">{s.status === "active" ? until(s.expires_at) : "—"}</Td>
                    <Td className="text-right">{s.status === "active" ? <Button variant="ghost" size="sm" disabled={busy === s.id} onClick={() => revoke(s.id)}><Ban />Revoke</Button> : null}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
