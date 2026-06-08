# TODOs

## P0: Finish Clerk/Convex Auth Setup

What: Finish the remaining local Clerk app credentials for Wall Print Pro by setting `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `WALL_PRINT_PRO_SELLER_EMAILS`.

Why: Convex now has `CLERK_JWT_ISSUER_DOMAIN`; the admin UI still needs the Clerk frontend/backend keys, and admin mutations require an authenticated allowlisted identity.

Context: Do not commit secrets. The Wall Print Pro Clerk development issuer is `https://sacred-shrimp-11.clerk.accounts.dev`, and it is already set locally and in the Convex dev deployment.

Depends on / blocked by: Clerk publishable key, Clerk secret key, and admin allowlist choice.

## P0: Push Convex Functions After Clerk Issuer Exists

What: Keep Convex functions deployed after auth or schema changes.

Why: The local implementation uses generic Convex references so the repo can typecheck without generated API updates, but the deployment still needs new schema/functions pushed when auth or backend code changes.

Context: `pnpm exec convex codegen` has succeeded once with the real Clerk issuer and pushed `previewBundles`, `bundleGeneration`, `sellerAuth`, and Clerk `auth.config.ts` to the dev deployment.

Depends on / blocked by: Future backend changes.

## P1: Validate Admin Preview Links On Real Devices

What: Create a ready sample preview link from `/admin/new`, open its `/preview/[slug]` link on iPhone Safari and Android Chrome, and tap `Place on wall`.

Why: Browser tests prove routing and AR handoff markup, but native wall placement is the actual acceptance path.

Context: Test both an immediate checked-sample preview link and a generated PNG-upload preview link.

Depends on / blocked by: Clerk setup, Convex function push, deployed URL, and real phones.

## P1: Harden Uploaded PNG Generation

What: Add image dimension sniffing, optional PNG normalization, and stricter malformed-image rejection before generation.

Why: The current TypeScript generator builds GLB/USDZ from PNG bytes and enforces byte budgets, but it does not yet resize, crop, or decode arbitrary PNGs.

Context: Keep PDFs manual. The first uploaded path is PNG-only.

Depends on / blocked by: Real admin-upload QA and decision on server-side image library.

## P2: Revisit Advanced Physical-Size Overrides After Phone QA

What: Decide whether the admin create flow needs an advanced print-size override after testing real saved-artwork and uploaded-artwork client previews on phones.

Why: The EOD flow now uses saved artwork metadata or the current default print size so sellers can create preview links without extra fields.

Context: Only add the override if real phone placement shows that the simplified flow is not accurate enough for client handoff.

Depends on / blocked by: Real iPhone and Android `Place on wall` results for one saved-artwork preview and one uploaded-artwork preview.

## P1: Add Convex Function Harness Tests

What: Add mocked Convex identity/database tests for unauthenticated, non-allowlisted, allowlisted, stale completion, retry, revoke, and ownership paths.

Why: Current tests cover shared validators, generator structure, public adapter behavior, and route behavior. Function-level auth/state coverage is still a gap.

Context: Use a focused Convex test harness instead of broad UI-only coverage.

Depends on / blocked by: Choosing the test harness for Convex generic functions.

## P2: Add Device Support Matrix

What: Document tested devices, browsers, AR mode used, placement quality, known limits, and fallback behavior.

Why: WebAR behavior differs across iPhone Safari, Android Chrome, desktop browsers, and unsupported devices.

Context: Fill this only from real phone results, not desktop assumptions.

Depends on / blocked by: Real iPhone and Android testing.
