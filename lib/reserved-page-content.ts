// Pure, node-testable content + logic for the post-payment /reserved page.
// Keeping copy and the session-id handling here (mirroring lib/*-page-defaults.ts)
// lets vitest guard the D10 deposit copy and the receipt-line behavior without a
// DOM renderer.

export type ReservedSearchParamsInput = {
  session_id?: string | string[];
};

export type ReservedStep = {
  title: string;
  body: string;
};

// D10 deposit copy — asserted by tests to guard against regressions.
export const RESERVED_DEPOSIT_HEADLINE = "You're in line. Here's exactly what happens next.";

export const RESERVED_DEPOSIT_COPY =
  "Your $100 deposit reserves your print-job slot and is credited toward your final print price — it never purchases artwork.";

export const RESERVED_LICENSING_COPY =
  "Custom artwork must be licensed or original; printability is confirmed at your estimate.";

export const RESERVED_STEPS: readonly ReservedStep[] = [
  {
    title: "Estimate visit scheduled",
    body: "We reach out to book a visit (or a video walkthrough) so we can measure your wall and quote the real project."
  },
  {
    title: "Design confirmed & printability checked",
    body: "We lock your artwork and confirm it will print sharp at wall scale — resolution, color, and finish all checked before anything goes to the printer."
  },
  {
    title: "Print day",
    body: "We print and install your custom wall mural. Your deposit comes off the final price when we settle up."
  }
] as const;

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Stripe checkout session ids look like `cs_live_a1b2c3...`. We never verify or
// call Stripe — this is analytics-only display.
export function normalizeSessionId(value: string | string[] | undefined): string | undefined {
  const raw = firstSearchParam(value)?.trim();

  if (!raw) {
    return undefined;
  }

  // Defensive allow-list: Stripe session ids are [A-Za-z0-9_]. Reject anything
  // else so the receipt line can never render attacker-controlled markup/text.
  if (!/^[A-Za-z0-9_]{1,255}$/.test(raw)) {
    return undefined;
  }

  return raw;
}

// A short, human-readable receipt tail so buyers can match it to their Stripe
// email without exposing the full id in the UI.
export function formatSessionReceipt(sessionId: string): string {
  const tail = sessionId.slice(-6);

  return `Receipt ref …${tail}`;
}

export type ReservedPageModel = {
  sessionId?: string;
  receiptLine?: string;
};

export function resolveReservedPageModel(searchParams: ReservedSearchParamsInput | undefined): ReservedPageModel {
  const sessionId = normalizeSessionId(searchParams?.session_id);

  if (!sessionId) {
    return {};
  }

  return { sessionId, receiptLine: formatSessionReceipt(sessionId) };
}
