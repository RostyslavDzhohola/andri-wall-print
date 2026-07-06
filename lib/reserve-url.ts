import { readWallPrintProReserveUrl } from "@/lib/runtime-env";

// LAUNCH GATE: real Stripe Payment Link for the $100 print-job-slot deposit.
// The env override (WALL_PRINT_PRO_RESERVE_URL) wins when set; this placeholder
// is a dead Stripe-shaped URL on purpose — the site must not ship to indexing
// until the client's real Payment Link replaces it (see docs/handoff).
export const PLACEHOLDER_RESERVE_URL = "https://buy.stripe.com/REPLACE_WITH_REAL_PAYMENT_LINK";

// Reads env via the bracket-based runtime-env pattern, which is safe at
// build/ISR time — this is exactly how app/page.tsx has always resolved the
// href, so the shared header/sticky bar inherit the same behavior without
// reintroducing dynamic rendering.
export function resolveReserveHref() {
  return readWallPrintProReserveUrl()?.trim() || PLACEHOLDER_RESERVE_URL;
}
