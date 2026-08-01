# TODOs

## P0: Push Convex Functions After Backend Changes

What: Keep Convex functions deployed after auth or schema changes.

Why: The local implementation uses generic Convex references so the repo can typecheck without generated API updates, but the deployment still needs new schema/functions pushed when auth or backend code changes.

Context: `pnpm exec convex codegen` has succeeded once and pushed `previewBundles` and `bundleGeneration` to the dev deployment. The launch plan (docs/plans/2026-07-03-public-funnel-launch.md) adds new schema (global generation cap, concept AR fields) that must be pushed.

Depends on / blocked by: Future backend changes.

## P1: Add Convex Function Harness Tests

What: Add mocked Convex identity/database tests for the surviving public function paths (public preview access, gated generation branches, stale completion, retry).

Why: Current tests cover shared validators, generator structure, public adapter behavior, and route behavior. Function-level state coverage is still a gap.

Context: Use a focused Convex test harness instead of broad UI-only coverage. Seller/admin auth paths were deleted at launch; only public-path coverage remains relevant.

Depends on / blocked by: Choosing the test harness for Convex generic functions.

## P2: September Local-SEO Ops Plan (off-site)

What: Plan and run the off-site local-SEO levers: Google Business Profile posts fed by portfolio photos, review collection, NAP citation consistency, and service-area settings.

Why: On-site SEO alone won't rank "wall printing Chicago" by September; these are the heavier local levers.

Context: Approved as D13 in the launch plan review. Portfolio photos in `content/work/` feed GBP posts.

Depends on / blocked by: Launch live + client GBP access.

## P2: Add Device Support Matrix

What: Document tested devices, browsers, AR mode used, placement quality, known limits, and fallback behavior.

Why: WebAR behavior differs across iPhone Safari, Android Chrome, desktop browsers, and unsupported devices.

Context: Fill this only from real phone results, not desktop assumptions. Feeds the day-4 production-device gate (D8) and T8 QA pass.

Depends on / blocked by: Real iPhone and Android testing.

## P2: Week-2 Polish Batch (from final whole-branch review triage, 2026-07-04)

What: Small quality items triaged WEEK-2 by the final launch review: failed-status retry-message UI test + double-submit rendered test; 429+Retry-After for both limit paths; aiConceptsEnabled guard inside queueConceptDraftForLead; GET concept-art 400 on malformed id; shared test fixture helpers + tightened wrong-type assertions; prune uploadValidation re-export barrel; tabpanel/aria-controls pairing on the chooser; keep chooser panels mounted mid-generation; consolidate duplicate session-id validators and trailing-slash trimmers; verify /request upload-rejected inline styling on real devices; rate/abuse guards on generateLeadUploadUrl and logReservedVisit.

Why: None block launch; together they harden coverage, a11y, and abuse surfaces.

Depends on / blocked by: Launch shipped; fold alongside other post-launch backend maintenance.

## P3: Automated AR-Link Email Sender (evidence-gated)

What: Resend + retry job restoring the "email me the AR link" promise cut at launch (D11.7).

Why: At launch the asset-generation failure path says "leave this open / scan QR / come back" and the captured email routes to the client as a manual lead. Automate only if real usage shows manual follow-up leaking.

Context: Lead email is already captured and visible to the client. Approved as D14 in the launch plan review.

Depends on / blocked by: Evidence from real post-launch usage.

---

## Retired at implementation start (2026-07-03, per launch plan D12)

- P0 Finish Clerk/Convex Auth Setup — mooted: admin/seller surfaces deleted at launch (D9)
- P1 Validate Admin Preview Links On Real Devices — superseded by the public hero-path day-4 device gate (T8)
- P1 Run Authenticated Seller Design Review — mooted: seller surfaces deleted
- P1 Harden Uploaded PNG Generation — absorbed into launch scope as T7 (public upload hardening)
- P2 Revisit Advanced Physical-Size Overrides — mooted: admin create flow deleted
- P2 Fix Clerk Widget Brand Name — mooted: sign-in/up screens deleted
- P2 Create DESIGN.md For Brand Baseline — absorbed into launch scope (W3/T3 creates DESIGN.md from approved C2 tokens)
