export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

export type Expiration = 10 | 60 | 1440 | 10080;
export type MaxViews = 1 | 2 | 5;

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface ShareResponse {
  token: string;
  share_url: string;
  share_type: "text" | "file";
  expires_at: string;
  max_views: number;
  has_password: boolean;
  notice: string;
}

export interface ShareMeta {
  share_type: "text" | "file";
  has_password: boolean;
  expires_at: string;
  views_remaining: number;
  filename: string | null;
  file_size: number | null;
  mime_type: string | null;
}

export interface RevealTextResponse {
  secret_text: string;
  burn_after_reading: boolean;
  views_remaining: number;
  is_destroyed: boolean;
}

export interface ShareItem {
  id: number;
  token_hash_prefix: string;
  share_type: "text" | "file";
  filename: string | null;
  max_views: number;
  view_count: number;
  is_consumed: boolean;
  is_revoked: boolean;
  expires_at: string;
  created_at: string;
  status: "active" | "consumed" | "expired" | "revoked";
}

export interface ShareStats {
  total_created: number;
  active_count: number;
  consumed_count: number;
  expired_count: number;
}

export interface SecuritySpec {
  cipher_suite: string;
  key_derivation: string;
  token_entropy: string;
  storage_model: string;
  shredding_policy: string;
  threat_model_mitigations: { threat: string; defense: string }[];
  known_limitations: { limitation: string; detail: string }[];
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * Every request sends the HttpOnly session cookie (credentials: "include");
 * the page itself never sees or stores the token.
 */
async function raw(path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    const json = typeof init.body === "string";
    res = await fetch(`${API_URL}${path}`, { ...init, credentials: "include", headers: json ? { "Content-Type": "application/json" } : undefined });
  } catch {
    throw new ApiError("Can't reach the VaultShare API. Is the backend running on port 8000?", 0);
  }
  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status}).`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") message = data.detail;
      else if (Array.isArray(data?.detail) && data.detail[0]?.msg) message = String(data.detail[0].msg).replace(/^Value error, /, "");
    } catch {
      /* not JSON */
    }
    throw new ApiError(message, res.status);
  }
  return res;
}

const json = async <T,>(path: string, init?: RequestInit) => (await raw(path, init)).json() as Promise<T>;
const post = (body?: unknown): RequestInit => ({ method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  me: () => json<User>("/auth/me"),
  login: (email: string, password: string) => json<{ user: User }>("/auth/login", post({ email, password })),
  register: (email: string, password: string) => json<User>("/auth/register", post({ email, password })),
  logout: () => raw("/auth/logout", { method: "POST" }),
  createText: (body: { text: string; expiration_minutes: Expiration; max_views: MaxViews; password?: string }) => json<ShareResponse>("/shares/text", post(body)),
  createFile: (form: FormData) => json<ShareResponse>("/shares/file", { method: "POST", body: form }),
  meta: (token: string) => json<ShareMeta>(`/shares/${encodeURIComponent(token)}/meta`),
  unlock: (token: string, password?: string) => json<RevealTextResponse>(`/shares/${encodeURIComponent(token)}/unlock`, post({ password })),
  download: async (token: string, password?: string) => (await raw(`/shares/${encodeURIComponent(token)}/download`, post({ password }))).blob(),
  mine: () => json<ShareItem[]>("/shares/mine/all"),
  stats: () => json<ShareStats>("/shares/mine/stats"),
  revoke: (token: string) => json<{ message: string }>(`/shares/${encodeURIComponent(token)}`, { method: "DELETE" }),
  revokeMine: (id: number) => json<{ message: string }>(`/shares/mine/${id}`, { method: "DELETE" }),
  spec: () => json<SecuritySpec>("/security/spec"),
};
