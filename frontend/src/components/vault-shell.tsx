"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderLock, LogIn, LogOut, Plus, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand";
import { AppShell, ShellAccount, type NavItem } from "@/components/kit/shell";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";

const NAV: NavItem[] = [
  { href: "/create", label: "New secret", icon: Plus },
  { href: "/dashboard", label: "My links", icon: FolderLock },
  { href: "/security", label: "Security model", icon: ShieldCheck },
];

export function VaultShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useSession();
  const router = useRouter();
  return (
    <AppShell brand={<Logo />} home="/create" items={NAV}
      footer={user ? (
        <ShellAccount name={user.email.split("@")[0]} detail={user.email}
          action={<Button variant="ghost" size="icon-sm" aria-label="Sign out" onClick={async () => { await signOut(); router.push("/"); }}><LogOut /></Button>} />
      ) : (
        <div className="space-y-2 px-1">
          <p className="text-xs text-muted-foreground">No account needed to share. Sign in to see and revoke your links.</p>
          <Button asChild variant="outline" size="sm" className="w-full"><Link href="/login"><LogIn />Sign in</Link></Button>
        </div>
      )}>
      {children}
    </AppShell>
  );
}
