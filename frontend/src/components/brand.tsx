import { BrandMark } from "@/components/kit/brand";

/** A padlock with a keyhole. */
export function Logo({ wordmark = true, className }: { wordmark?: boolean; className?: string }) {
  return (
    <BrandMark name="VaultShare" wordmark={wordmark} className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" />
    </BrandMark>
  );
}
