"use client";

import { AlertTriangle, KeyRound, Lock, ShieldCheck, Trash2, Hash } from "lucide-react";
import { ErrorState, PageLoading, PageTitle, Panel } from "@/components/kit/ui";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";

export default function SecurityPage() {
  const spec = useApi(() => api.spec(), "spec");
  if (spec.error) return <ErrorState message={spec.error} onRetry={spec.reload} />;
  if (!spec.data) return <PageLoading />;
  const s = spec.data;
  const facts = [
    { icon: Lock, label: "Cipher", value: s.cipher_suite },
    { icon: KeyRound, label: "Key derivation", value: s.key_derivation },
    { icon: Hash, label: "Link tokens", value: s.token_entropy },
    { icon: ShieldCheck, label: "Storage", value: s.storage_model },
    { icon: Trash2, label: "Shredding", value: s.shredding_policy },
  ];
  return (
    <>
      <PageTitle title="Security model" description="Served by the API itself, so it describes the code that is actually running." />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="rounded-xl border bg-card p-5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><f.icon className="size-3.5" />{f.label}</p>
            <p className="mt-2 text-sm">{f.value}</p>
          </div>
        ))}
      </div>
      <Panel title="Threats and defences" className="mt-5">
        <ul className="divide-y">
          {s.threat_model_mitigations.map((t) => (
            <li key={t.threat} className="grid grid-cols-1 gap-1 px-5 py-3.5 md:grid-cols-[240px_minmax(0,1fr)] md:gap-6">
              <span className="text-sm font-medium">{t.threat}</span>
              <span className="text-sm text-muted-foreground">{t.defense}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Known limitations" description="What VaultShare doesn't protect against." className="mt-5">
        <ul className="divide-y">
          {s.known_limitations.map((l) => (
            <li key={l.limitation} className="flex gap-3 px-5 py-3.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <span><span className="block text-sm font-medium">{l.limitation}</span><span className="text-sm text-muted-foreground">{l.detail}</span></span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
