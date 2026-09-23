"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean };

/**
 * The house app layout: a 240px sidebar on desktop, a sheet behind a menu button
 * on phones. Import it from a "use client" file (nav items hold icon components).
 */
function Nav({ brand, home, items, footer, onNavigate }: { brand: React.ReactNode; home: string; items: NavItem[]; footer?: React.ReactNode; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <Link href={home} className="px-5 pt-5 pb-6" onClick={onNavigate}>{brand}</Link>
      <nav aria-label="App" className="space-y-0.5 px-3">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-sidebar-accent font-medium text-primary" : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground")}>
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {footer ? <div className="mt-auto space-y-3 border-t p-3">{footer}</div> : null}
    </div>
  );
}

export function AppShell({ brand, home = "/dashboard", items, footer, children }: { brand: React.ReactNode; home?: string; items: NavItem[]; footer?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r bg-sidebar lg:block"><Nav brand={brand} home={home} items={items} footer={footer} /></aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open navigation"><Menu /></Button></SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Nav brand={brand} home={home} items={items} footer={footer} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link href={home}>{brand}</Link>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

/** Sidebar footer card: who's signed in (or which demo workspace this is). */
export function ShellAccount({ name, detail, note, action }: { name: string; detail?: string; note?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <>
      {note ? <p className="rounded-lg bg-accent px-3 py-2 text-xs text-primary">{note}</p> : null}
      <div className="flex items-center gap-2 px-1">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{name.slice(0, 2).toUpperCase()}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          {detail ? <span className="block truncate text-xs text-muted-foreground">{detail}</span> : null}
        </span>
        {action}
      </div>
    </>
  );
}
