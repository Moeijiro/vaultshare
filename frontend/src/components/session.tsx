"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, type User } from "@/lib/api";

type Session = { user: User | null; ready: boolean; refresh: () => void; signOut: () => Promise<void> };
const Ctx = createContext<Session>({ user: null, ready: false, refresh: () => undefined, signOut: async () => undefined });

/** Who's signed in, read from /auth/me (the cookie itself is HttpOnly). */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.me().then((u) => { if (!cancelled) setUser(u); }).catch(() => { if (!cancelled) setUser(null); }).finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
  }, []);
  return <Ctx.Provider value={{ user, ready, refresh, signOut }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
