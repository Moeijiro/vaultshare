import { VaultShell } from "@/components/vault-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <VaultShell>{children}</VaultShell>;
}
