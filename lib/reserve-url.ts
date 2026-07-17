import { readWallPrintProReserveUrl } from "@/lib/runtime-env";

// LAUNCH GATE: real Stripe Payment Link for the $100 print-job-slot deposit.
// Until the client provides it, reserve CTAs must remain on-site instead of
// sending a prospective customer to a known-dead Stripe-shaped URL.
export const FALLBACK_RESERVE_URL = "/request";

// Reads env via the bracket-based runtime-env pattern, which is safe at
// build/ISR time — this is exactly how app/page.tsx has always resolved the
// href, so the shared header/sticky bar inherit the same behavior without
// reintroducing dynamic rendering.
export function resolveReserveHref() {
  return readWallPrintProReserveUrl()?.trim() || FALLBACK_RESERVE_URL;
}
