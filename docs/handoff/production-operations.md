# Wall Print Pro Production Operations

This is the operator runbook for the public Wall Print Pro release. It names configuration only; never paste secret values into this file, Git, screenshots, tickets, or chat.

## Authoritative production identity

| Surface | Approved identity | Abort condition |
|---|---|---|
| GitHub | `RostyslavDzhohola/andri-wall-print`, base branch `main` | Stop if the release commit is not reachable from the reviewed PR. |
| Sites | Project `appgprj_6a6193cce8e8819180ad8b803559fb80`; canonical URL `https://www.thewallprintpro.com` | Stop if the project ID, custom domain, or version-to-commit mapping differs. |
| Convex production | Deployment `gregarious-kookabura-23` | Stop if CLI/dashboard target differs or the function spec is missing current functions. |
| Convex development | Deployment `nautical-fox-104` | Never treat this development deployment as the production backend. |

## Environment inventory and ownership

| Name/account | Runtime | Class | Purpose | Owner | Validate without exposing values | Rotation or revocation |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Sites | Public | Canonical base URL | Developer during launch | Must resolve to `https://www.thewallprintpro.com` | Update Sites setting when the canonical domain changes. |
| `CONVEX_URL` | Sites server runtime | Public service URL | Server-side Convex calls | Developer | Host must identify approved production Convex, never `nautical-fox-104` | Replace together with `NEXT_PUBLIC_CONVEX_URL`; republish and smoke test. |
| `NEXT_PUBLIC_CONVEX_URL` | Sites browser runtime | Public service URL | Browser Convex client | Developer | Must match `CONVEX_URL` deployment | Replace both Convex URLs atomically; republish and smoke test. |
| `WALL_PRINT_PRO_AI_CONCEPTS_ENABLED` | Sites and Convex | Operational flag | Enables paid concept generation | Developer; client approves spend | Values must be explicit and equal in both runtimes | Set false in both runtimes for incident shutdown; re-enable only after validation. |
| `WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED` | Sites and Convex | Operational flag | Enables consent UI, moderation, and public community reads | Developer; client approves publication | Values must be explicit and equal in both runtimes | Set false in both runtimes to stop new publication and public community reads. |
| `OPENAI_API_KEY` | Convex only | Secret | Generation and moderation | Client owns billing; developer installs | Confirm presence by name/status only; never print value | Create replacement in OpenAI, install in Convex, validate with flags off, then revoke old key. |
| `OPENAI_IMAGE_MODEL` | Convex only | Non-secret config | Intentional image model override | Developer | Compare model name with approved release note | Change only with cost/quality approval and dev validation. |
| `WALL_PRINT_PRO_RESERVE_URL` | Sites | Public URL | Stripe Payment Link | Client owns Stripe; developer installs | Run `node scripts/check-stripe-redirect.mjs <url>` | Deactivate old Payment Link in Stripe, install replacement, then retest. |
| `WALL_PRINT_PRO_PUBLIC_PHONE` | Sites | Public contact | Call/text destination | Client | Compare with approved NAP | Update Sites and public NAP together. |
| `WALL_PRINT_PRO_PUBLIC_CONTACT_URL` | Sites | Public contact | Contact handoff | Client | Open without sending a message | Update Sites and retest destination. |
| `NEXT_PUBLIC_CLIENT_PREVIEW_BASE_URL` / `NEXT_PUBLIC_PUBLIC_PREVIEW_BASE_URL` | Local/dev only | Public URL | Phone preview/tunnel override | Developer | Must not exist in production unless intentionally set to canonical site | Remove after local/staging test. |
| `PHASE0_PREVIEW_LOCAL_FALLBACK` | Local/dev only | Operational flag | Local preview fallback | Developer | Must be absent/false in production | Remove when local fallback is no longer needed. |
| `PHASE0_SEED_TOKEN` | One-time seed process | Secret | Authorizes Phase 0 seeding | Developer | Confirm presence only during approved seed | Delete immediately after the approved seed; create a new random token for a future seed. |
| Convex, Sites, OpenAI, Stripe, registrar accounts | External systems | Privileged accounts | Deployment, billing, payment, DNS | Client must retain owner/admin access | Verify named owner/admins and recovery method | Remove former operators; rotate recovery methods after handoff. |

`NODE_ENV`, `PLAYWRIGHT_BASE_URL`, `WRANGLER_LOG_PATH`, and test-only variables are build/test controls, not production product configuration.

## Exact release procedure

1. Record the candidate commit and prove the tree is intentional:

   ```sh
   git status --short
   git rev-parse HEAD
   git fetch origin main
   git rev-list --left-right --count origin/main...HEAD
   pnpm typecheck
   pnpm test
   pnpm lint
   pnpm build
   pnpm test:e2e
   ```

2. In Sites, open project `appgprj_6a6193cce8e8819180ad8b803559fb80`. Record the candidate version and source commit. Abort if Sites cannot tie the version to the candidate commit.
3. In Convex, select production deployment `gregarious-kookabura-23`. Run the read-only function-spec check and compare it with the candidate:

   ```sh
   pnpm exec convex function-spec --deployment gregarious-kookabura-23
   ```

4. Before backend changes, set both feature flags explicitly false in Sites and Convex. Keep the public site usable for curated designs, uploads, and ordinary estimate requests.
5. Deploy the reviewed schema/functions to the approved production Convex target. Abort on a destructive schema warning, target mismatch, validation error, or unexplained function deletion.
6. Install the names in the environment matrix. Secrets go only to the runtime that consumes them. `CONVEX_URL` and `NEXT_PUBLIC_CONVEX_URL` must both identify `gregarious-kookabura-23`.
7. Publish the Sites version tied to the same reviewed Git commit. Verify the live version/commit link before enabling a paid/publication feature.
8. Smoke-test with both flags false: homepage, gallery curated fallback, upload validation, request capture availability, legal pages, robots, sitemap, and one ready preview.
9. Enable `WALL_PRINT_PRO_AI_CONCEPTS_ENABLED` in both Sites and Convex only after spend ownership and caps are confirmed. Enable `WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED` in both only after the consent/moderation gate below passes. Never leave frontend/backend values mismatched.
10. Record the Sites version, Git commit, Convex deployment, explicit flag values, timestamp, operator, and smoke evidence in the release decision record.

### Mandatory abort conditions

Abort instead of improvising if the Git commit, Sites project/version, Convex deployment, canonical domain, or flag values cannot be proven; if legal routes or approved NAP are wrong; if automated gates fail; if a schema warning is destructive; or if rollback ownership is unavailable.

### Rollback order

1. Set community-gallery false in both runtimes; set AI-generation false too when generation, spend, or backend integrity is involved.
2. Roll Sites back to the last version whose Git commit and Convex target are recorded.
3. For Convex function regressions, deploy the last known compatible backend commit to `gregarious-kookabura-23`. Do not delete production fields/tables as an emergency shortcut.
4. Hide any incorrect public gallery entries while preserving audit evidence.
5. Re-run the false-flag smoke test and record the incident and recovery version.

## Community moderation and removal

Status meanings:

- `pending`: consented generated asset awaiting moderation; not public.
- `published`: moderation passed and public projection is available.
- `held`: flagged, moderation failed after retries, or otherwise requires review; not public.
- `hidden`: deliberately removed from public list/slug lookup; private lead/preview retention is handled separately.

Before publication, confirm the associated AI draft has server-authored `galleryPublicationConsent=true`, consent version, and recorded timestamp; the generation finished AR-ready; moderation passed; and the public projection contains only neutral title/description, print data, and poster/GLB/USDZ assets. Never backfill legacy drafts without explicit consent.

Removal procedure:

1. Record the request, requester verification method, public gallery slug, entry ID, current status, and operator.
2. In the approved production Convex dashboard, locate the exact `galleryEntries` record and change only its status to `hidden`.
3. Verify both the public list and exact slug lookup exclude it. Verify its `g-…` ID cannot resolve through a private `p-…` preview route.
4. Record that hiding removes discovery and slug lookup only: anyone who retained a direct Convex storage URL can still retrieve that asset.
5. If the verified request requires asset revocation, record the poster/GLB/USDZ storage IDs, confirm retention requirements, then delete those exact public storage objects or replace them with access-controlled copies. Verify every old URL returns unavailable before closing the request. Never delete the lead or private preview without separate retention/legal approval.
6. Preserve the pre/post status, timestamp, reason, affected storage IDs, URL checks, and operator evidence.

## Lead operations

The seller checks new leads every business day and responds within one business day. Weekly review is not sufficient.

| Request type | How to identify | Required action |
|---|---|---|
| Existing design | Selected design context/wall description; no AI draft | Confirm design and dimensions, then schedule estimate. |
| Upload | Verified upload metadata; no AI draft/gallery consent | Review printability privately, then schedule estimate. |
| AI concept | AI draft/status and email | Review status; send the durable preview or explain failure/composite-only follow-up. |
| Reserve | Stripe payment evidence plus reserve intent | Verify payment in Stripe, then call/text to schedule. |

Track owner, first-response timestamp, next action, and resolution. Contact data and uploads remain private. Escalate broken notification/delivery immediately and use the Convex lead list as the temporary source of truth.

## OpenAI spend operations

- Client owns OpenAI billing and sets a hard project/monthly limit in the OpenAI dashboard. Application caps are additional protection, not the billing limit.
- Developer checks the dashboard weekly and after every model/traffic change. At 50% of the monthly limit, forecast usage; at 80%, notify the client and disable generation unless continued spend is explicitly approved; at 100% or on an unexplained spike, disable `WALL_PRINT_PRO_AI_CONCEPTS_ENABLED` in both runtimes immediately.
- The app's current global generation cap is 50/day plus per-contact limits. A cap hit must not consume an extra lead quota or OpenAI call.
- While AI is disabled, ordinary uploads, existing-design requests, curated gallery, and estimate capture must continue working.
- Re-enable only after the cause, expected cost, client approval, matching flag values, and a controlled development/staging test are recorded.

## Incident matrix

| Incident | Owner | First safe action | Recovery/verification |
|---|---|---|---|
| Wrong/broken Sites release | Developer | Roll back Sites version | Verify recorded commit, canonical, legal routes, NAP, headers, and smoke routes. |
| Convex schema/function regression | Developer | Disable community and AI flags | Deploy last compatible backend commit; run function spec and false-flag smoke. |
| OpenAI spend spike/key concern | Client billing owner + developer | Disable AI in both runtimes; rotate key if compromised | Confirm non-AI funnel works; review usage; controlled re-enable. |
| Moderation outage | Developer | Disable community flag in both runtimes | Pending/held remain private; validate moderation before re-enable. |
| Incorrect gallery publication/removal request | Privacy operator | Set exact entry to `hidden` | Verify list and slug exclusion; retain audit record. |
| Broken poster/GLB/USDZ | Developer | Hide affected community entry or roll back affected curated release | Recheck 200, MIME, size, CORS, dimensions, iPhone/Android handoff. |
| Stripe/redirect problem | Client Stripe owner + developer | Unset invalid reserve URL so CTA falls back to request flow | Stripe Dashboard/receipt proves payment; test redirect before restoring link. |
| Contact delivery problem | Seller + developer | Review Convex leads directly every business day | Restore channel, reconcile leads, record first responses. |
| Domain/certificate problem | Client registrar owner + developer | Keep working `www` URL as canonical; do not change unrelated DNS | Validate DNS, SSL, apex-to-www redirect, then canonical/robots/sitemap. |

## Log and privacy verification

For this low-volume marketing site, release logging is intentionally simple: write internal lead/draft/entry IDs, timestamps, bounded status codes, and sanitized error class names. Never log contact email/phone, raw prompts, secret values, generated image bytes, or upstream error bodies. Unit tests must prove that private error-message text is discarded.

Cross-vendor correlation through Convex and OpenAI is an incident-response or separately approved paid-generation exercise, not a routine release gate. When it is needed, use one approved record and correlate only its internal ID and timestamp; do not copy private content into tickets, screenshots, or chat.
