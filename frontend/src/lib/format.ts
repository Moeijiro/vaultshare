import type { Tone } from "@/components/kit/ui";
import type { ShareItem } from "@/lib/api";

export function parseUTC(value: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
}

/** "in 23 h", "in 6 days", "expired". */
export function until(value: string): string {
  const minutes = Math.round((parseUTC(value).getTime() - Date.now()) / 60000);
  if (minutes <= 0) return "expired";
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} h`;
  return `in ${Math.round(hours / 24)} days`;
}

export function when(value: string): string {
  return parseUTC(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function bytes(n: number | null | undefined): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const EXPIRATIONS = [
  { value: "10", label: "10 minutes" },
  { value: "60", label: "1 hour" },
  { value: "1440", label: "24 hours" },
  { value: "10080", label: "7 days" },
];

export const VIEWS = [
  { value: "1", label: "1 view — burn after reading" },
  { value: "2", label: "2 views" },
  { value: "5", label: "5 views" },
];

export const STATUS: Record<ShareItem["status"], { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "ok" },
  consumed: { label: "Viewed & destroyed", tone: "muted" },
  expired: { label: "Expired", tone: "warn" },
  revoked: { label: "Revoked", tone: "fail" },
};
