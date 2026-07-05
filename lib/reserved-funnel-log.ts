// Fire-and-forget funnel logging for a reserved-page visit.
//
// CROSS-TASK WIRING: The Convex funnel spine (convex/leadRequests.ts +
// convex/schema.ts `funnelEvents`) is owned by another task and today requires a
// `leadRequestId` — there is NO public mutation that accepts a session-only
// reserved visit. So this is intentionally a no-op stub.
//
// TODO(cross-task): once the gated-generation task exposes a public mutation that
// records a session-only funnel event (e.g. `api.leadRequests.logReservedVisit`
// keyed by Stripe `session_id` instead of `leadRequestId`), replace the body here
// with that call. Do NOT add a new Convex table from this task — the spine is
// owned elsewhere.
//
// Kept `console`-free on purpose (per brief): a no-op must not spam logs.

export function logReservedVisit(_sessionId?: string): void {
  // No-op until the public session-keyed funnel mutation exists.
}
