# Wall Print Pro: Public Funnel + Chicago Local SEO — Implementation Plan

## Context

The client sells custom large-format wall prints in the Chicago area, word-of-mouth, side-business until September. He has interest but leads die at two points: before the estimate happens and at price reveal. The deliverable is a client-ready website by ~2026-07-10 that he posts to Facebook/Google Maps/Instagram and runs passively: it anchors price expectations, delivers the wow moment (generate an AI image → see it on your own wall in AR), collects a $100 Stripe deposit from serious buyers, shows all his work, and builds Chicago local-SEO ranking until he goes all-in in September.

Source of truth: approved design doc `~/.gstack/projects/preview-picture/Rostyslav-codex-client-direction-20260702-design-20260702-182711.md` (APPROVED, 3 adversarial rounds, 8/10). This plan locks the engineering execution after /plan-eng-review (decisions D1–D7).

**The funnel:** anchor ("from $X") → wow (generate/upload/reuse + AR) → commit ($100 Payment Link deposit credited to the print) → `/reserved` scheduling page. Zero payment code: `session_id` is analytics-only; the Stripe dashboard is the client's ledger.

## Locked engineering decisions (from this review)

1. **One gated generation path (1A).** `app/api/concept-art/route.ts` is today an unmetered anonymous OpenAI endpoint (POST goes straight from prompt validation to `generateOpenAiConceptImage`). Unify: a single generation entry requiring an email, enforcing the existing per-contact `reserveAiRateLimit` (convex/leadRequests.ts:82) PLUS a new global daily cap (Convex per-day counter, friendly "at capacity" message). Homepage hero and `/request` both use it.
2. **Generated concept → AR via the existing bundle spine, async (2A).** The route currently returns `assets: { poster: base64, glb: "", usdz: "" }` — generated art cannot launch AR. Fix: store the generated PNG in Convex storage → existing validated PNG→GLB/USDZ generator (`lib/ar-asset-generator.ts`, `convex/bundleGeneration.ts`) → existing AR launcher; UI polls status (same pattern as previewBundles). Failure path: 2D composite + "email me the AR link when it's ready."
3. **Portfolio content lives in the repo (3A).** One JSON/MDX file per job + images; `/work` and `/work/[slug]` render static with hourly `revalidate`. No new Convex table, no admin editor needed. Adding a job over the summer = one commit.
4. **Paid-but-lost mitigation via Stripe config + SOP (4A).** Payment Link confirmation email + custom message carry the `/reserved` URL and next steps; client SOP in the handoff doc: respond to every Stripe payment notification within 24h; client installs the Stripe mobile app for push notifications as the backup channel.

## Outside-voice amendments (Codex cross-model review, all user-approved)

5. **Input-agnostic hero (D8).** The homepage CTA is "See it on your wall" with three equal entries: choose our art / upload yours / generate new. The buying theory: seeing the end result on their own wall raises intent → reserve a spot, first in line for the printing job. Generation is still built first (riskiest), but a flaky generate path degrades to the other two entries with zero homepage rework. **Day-4 production-device gate:** by ~day 4, AR must pass on the production domain on real iPhone Safari (Quick Look) + Android Chrome (Scene Viewer), explicitly including Convex-storage asset URL headers, MIME types, and file sizes.
6. **Clerk dormant at launch (D9).** Launch deletes the visible surfaces (admin/seller/builder/account/dashboard/sign-in/up routes, experiment dirs) but leaves Clerk plumbing dormant (providers, proxy, env untouched, nothing gated). Full teardown is fast-follow week 2 with its regression tests. No auth-wiring surgery in launch week.
7. **Deposit = job reservation (D10).** The $100 reserves the print-job slot (credited to the final price) — it never purchases artwork or the generated concept. Copy at generate + reserve says so, plus "custom artwork must be licensed or original; printability confirmed at your estimate." OpenAI guardrails + the estimate visit are the content gates; no moderation pipeline.
8. **Hardening bundle (D11, all nine).** (1) Global cap day keyed to America/Chicago + hard usage limit set in the OpenAI dashboard; (2) Stripe mobile app push as backup notification; (3) QA share-surface checklist: FB personal post, FB business page, GBP website link, IG bio — each verified to unfurl; (4) handoff secrets-ownership checklist (OpenAI, Convex, Stripe, Vercel, domain registrar); (5) public upload hardening promoted to P1 launch scope; (6) AR asset-serving checks inside the day-4 gate; (7) no email-sender at launch — the asset-generation failure path says "leave this open / scan QR / come back" and the captured email routes to the client as a lead for manual follow-up; (8) the Stripe live-redirect checker is copied into this repo as a local script, not imported cross-repo; (9) **real floor price is a launch gate** — the site is not submitted for indexing with "$X" placeholders.

## Workstreams (build in this order — riskiest launch-critical first)

### W1: Gated generation + concept→AR pipeline (the hero path; top schedule risk)
- New Convex public mutation `startConceptGeneration` (or refactor of `submitLeadRequest`'s AI branch): requires email; checks `reserveAiRateLimit` (contact-keyed, exists) AND new `globalGenerationCap` counter table (per-UTC-day row, launch requirement); records a lead + funnel event; schedules generation.
- Rework `convex/aiConcepts.ts` output: store generated PNG via `ctx.storage.store` (already does), then chain into the GLB/USDZ generation used by `convex/bundleGeneration.ts` (reuse `lib/ar-asset-generator.ts` with its server-side byte validation — trust-boundary learning).
- Replace/retire the open `app/api/concept-art/route.ts` POST: either delete it or reduce it to a thin caller of the gated Convex path. No second unmetered path may survive.
- Homepage hero UI: prompt + email → "generating" state → poster preview → AR button when assets ready (poll status); asset-generation failure → 2D composite + "leave this open / scan QR / come back" (captured email routes to the client as a lead — no email-sender at launch, per D11.7); non-AR browsers → 2D composite + QR/share link ("open on your phone").
- Files: `convex/aiConcepts.ts`, `convex/leadRequests.ts` (or new `convex/conceptGeneration.ts`), `convex/schema.ts` (cap table + concept AR fields), `components/promotion/homepage-demo-actions.tsx`, `app/api/concept-art/route.ts` (retire), `lib/openai-image-provider.ts` (unchanged), AR launcher components (reused).

### W2: Preview app supporting paths
- Upload-your-own path: reuse invite/bundle upload plumbing as a public flow with the existing `uploadValidation.ts` + hardening from TODOS P1 (dimension sniffing, malformed rejection; JPEG/PNG/WebP only — no PDF, per phase0 learning).
- Gallery-reuse path: `/gallery` survives as route + "reuse existing artwork" entry; existing AR launcher unchanged.

### W3: Homepage redesign + SEO foundation
- Redesign `/` on the settled "before → during → after" concept: anchor "from $X" (real number is a LAUNCH GATE for indexing, per D11.9), hero CTA "See it on your wall" with three equal entries (our art / your art / generated art, per D8), reserve copy "reserve your spot — first in line for the printing job", work videos/photos proof, secondary CTA to `/work`.
- Remove `export const dynamic = "force-dynamic"` from `app/layout.tsx:22`; audit each page previously relying on it (`account`, `dashboard`, `invite`, `request`, `preview/[slug]` are dynamic or deleted). **Regression risk:** Turbopack prod builds fold static `process.env` reads on newly-static pages — keep dynamic bracket-based env reads (`lib/runtime-env.ts` pattern).
- Replace root metadata (`app/layout.tsx:12-14`, currently "Admin workspace for wall preview links.") with public marketing title/description/OG defaults + `metadataBase`.
- Rewrite `lib/product-copy.ts` (the no-AI-copy rule is retired; generation is the headline).

### W4: Reserve flow
- Stripe Payment Link (client's account) with deposit amount, "credited toward your final print price", success URL `https://<domain>/reserved?session_id={CHECKOUT_SESSION_ID}`.
- `/reserved` page: what-happens-next + scheduling (booking link or short form that emails the client — client's pick, open question); logs `session_id` as a funnel event (analytics-only, no verification).
- Stripe dashboard config (no code): confirmation email text + payment-page custom message carry `/reserved` and next steps. Client SOP paragraph in handoff doc.
- Port the `stripe:verify-attribution`-style live-redirect check script from Learn Anything as a manual verification step.

### W5: Portfolio + SEO scaffolding
- `content/work/*.json` (or MDX) — 5 jobs at launch (photos, area, size, surface, one-paragraph story). Launch gate: exactly 5; cut line #1: drop to 3 if the week overruns.
- `app/work/page.tsx` + `app/work/[slug]/page.tsx`: static + hourly `revalidate`, `generateMetadata` per job, `next/image`.
- `app/sitemap.ts`, `app/robots.ts` (Next built-ins), canonical URLs, `LocalBusiness` JSON-LD on `/` (launch), `CreativeWork`/`ImageObject` JSON-LD (launch-if-time).
- OG cards on every public page; verify Facebook/Instagram unfurl.
- Chicago-area copy targets ("wall printing Chicago", "custom wall murals Chicago") across `/`, `/work`, `/gallery`.

### W6: Deletions at launch; Clerk teardown deferred to week 2 (per D9)
- **Launch scope:** delete routes `app/admin/*`, `app/seller/*`, `app/account`, `app/dashboard`, `app/builder/[token]`, `app/invite/[token]` (as seller-managed), `app/sign-in`, `app/sign-up`; components `seller/`, `buyer/`, `builder/`, `auth/` (as applicable); Convex modules that only serve them (`sellerAuth.ts`, `buyerAccounts.ts`, `builderInvites.ts` + tables); experiment debris `variation/`, `output/`, `artifacts/`, stale `tmp/` (~27MB); dead tests (seller/buyer/builder/pricing suites). Re-push Convex functions.
- **Launch scope:** the `ctx.auth` audit — neutralize auth branches in surviving `convex/previewBundles.ts` and `convex/sellerPricing.ts` so they behave correctly with a null identity NOW (they must work for logged-out users regardless of Clerk's presence). `/preview/[slug]` stays as the public share surface.
- **Dormant at launch (NOT touched):** `convex/auth.config.ts`, `proxy.ts` Clerk matcher, Clerk branches in `components/app-providers.tsx`, `readClerkPublishableKey`/`lib/runtime-env.ts` readers, Clerk env vars in Vercel + Convex. Nothing public is gated; the plumbing idles.
- **Fast-follow week 2:** full Clerk teardown of the dormant surface above, with proxy regression tests, `ConvexProviderWithClerk` → `ConvexProvider`, env cleanup in both clouds, dependency removal.

### W7: QA + handoff
- `pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e` green.
- Real iPhone Safari + Android Chrome: homepage, generate→AR (hero acceptance test), gallery AR, Payment Link round-trip to `/reserved`.
- Domain wired, Google Search Console verified, sitemap submitted, Google Business Profile linked.
- Handoff doc for client: SOP (Stripe notifications, deposit refund terms), how to send new job content.

## Data flow (hero path)

```
Visitor (phone)
   │  prompt + email
   ▼
startConceptGeneration (Convex mutation, public)
   ├─ reserveAiRateLimit(contact)  ──limit hit──► "try tomorrow" message
   ├─ globalGenerationCap(day)     ──cap hit────► "at capacity today" message
   ├─ insert lead + funnel event
   └─ schedule generateConceptDraft (internalAction)
          │ OpenAI image → ctx.storage.store(PNG)
          ▼
     chain: AR asset generation (lib/ar-asset-generator)
          ├─ validate bytes (trust boundary) ──fail──► status=composite_only
          └─ GLB + USDZ stored, status=ready
   ▲
   │ UI polls status
Homepage hero ── ready ──► AR launcher (Quick Look / Scene Viewer)
              ── composite_only ──► 2D composite + "email me the AR link"
              ── desktop/unsupported ──► 2D composite + QR to phone
```

## Test coverage plan

```
CODE PATHS                                                USER FLOWS
[+] startConceptGeneration (Convex)                       [+] Hero: generate → wall
  ├── [GAP] no/invalid email → rejected                     ├── [GAP] [→E2E] prompt+email → poster → AR link visible
  ├── [GAP] contact limit hit → friendly error              ├── [GAP] double-submit while generating
  ├── [GAP] global cap hit → "at capacity"                  ├── [GAP] provider timeout → user sees retry message
  ├── [GAP] success → lead + event + scheduled              └── [GAP] asset-gen failure → composite + email capture
  └── [GAP] provider failure codes propagate              [+] Reserve
[+] concept→AR chain                                        ├── [GAP] [→E2E] CTA → Payment Link URL correct
  ├── [GAP] valid PNG → GLB/USDZ ready                      ├── [GAP] /reserved with session_id → event logged
  ├── [GAP] malformed bytes → composite_only                └── [GAP] /reserved without session_id → still renders
  └── [GAP] oversized bytes → rejected                    [+] Portfolio/SEO
[+] /work + /work/[slug]                                    ├── [GAP] sitemap lists /, /work/*, /gallery
  ├── [GAP] renders all content files                       ├── [GAP] robots allows all public routes
  ├── [GAP] unknown slug → 404                              └── [GAP] LocalBusiness JSON-LD present on /
  └── [GAP] generateMetadata per job                      [+] REGRESSIONS (CRITICAL, iron rule)
[+] proxy.ts (post-Clerk)                                   ├── [GAP] env reads survive static build (env-folding)
  └── [GAP] public routes pass without Clerk                ├── [GAP] getPublicPreview works with null identity
                                                            └── [GAP] deleted routes 404/redirect cleanly
COVERAGE TODAY: 0/22 new paths  |  TARGET: 22/22 written alongside implementation
Existing suites kept: ar-asset-generator, upload-validation, runtime-env.regression-1, concept-art (rewritten)
```

E2E (Playwright, provider stubbed like existing openai-image-provider tests): hero flow, reserve flow. Unit (vitest): everything else.

## What already exists (reused, not rebuilt)

- `reserveAiRateLimit` + `leadRateLimits` table (contact-keyed limiting) — reused as-is; only the global cap is new.
- `generateConceptDraft` internalAction + OpenAI provider + prompt builder — reused; output chained onward.
- PNG→GLB/USDZ generator with byte validation (`lib/ar-asset-generator.ts`, `convex/bundleGeneration.ts`) — reused for generated + uploaded art.
- AR launcher components + `/gallery` + work-videos sections — reused.
- `/request` + `PublicRequestForm` (contact capture → generation) — basis for the gated path.
- Chicago phase0 asset scripts (`assets:phase0:chicago`, `convex:seed:phase0`) — seed gallery/portfolio imagery.
- Playwright + vitest infrastructure, 26 existing test files (≈6 deleted with their features).
- Stripe Payment-Link-with-redirect pattern + live-check script — ported from Learn Anything (new to this repo).

## NOT in scope (considered, deferred)

- Server-side Stripe session verification (SDK + secret key + endpoint) — fast-follow only if `/reserved` ever gates value; `session_id` stays analytics-only.
- Webhooks, custom checkout, refund automation — Stripe dashboard is the ledger.
- Fully anonymous generation (IP/session-keyed limits) — stretch; email gate is the launch design.
- Convex-backed portfolio CMS — repo content chosen (3A); revisit only if the client wants self-serve editing in September.
- `CreativeWork`/`ImageObject` JSON-LD — launch-if-time, else first fast-follow.
- Native measurement / precise sizing claims — browser AR is visualization only.
- PDF upload support — JPEG/PNG/WebP only (phase0 learning).
- Buyer accounts, invite management, admin dashboards — deleted, not rebuilt.

## Failure modes (new codepaths)

| Codepath | Realistic failure | Test | Handling | User sees |
|---|---|---|---|---|
| startConceptGeneration | global cap race at day boundary | unit | counter check in mutation (transactional) | "at capacity today" |
| OpenAI call | timeout/refusal | unit (exists pattern) | failure codes → status | clear retry message |
| concept→AR chain | malformed/oversized PNG | unit (reuse validator tests) | composite_only status | 2D composite + email capture |
| AR asset serving | slow generation on phone | e2e + manual | polling + progress state | progress, never dead spinner |
| Stripe redirect | tab closed after payment | manual + SOP | Stripe email w/ /reserved link; client SOP | email with next steps |
| Static env reads | Turbopack env folding | CRITICAL regression test | bracket-based runtime env | n/a (build-time) |
| proxy post-Clerk | public route blocked | CRITICAL regression test | matcher rewrite + test | pages load logged-out |

Critical-gap check: every silent-failure candidate above has a test or SOP; none ships silent.

## Worktree parallelization

| Step | Modules touched | Depends on |
|---|---|---|
| W1 hero pipeline | convex/, components/promotion/, app/api/ | — |
| W2 supporting paths | convex/ (upload), components/ar/ | W1 (shares convex generation spine) |
| W3 homepage + SEO foundation | app/, lib/ | — (copy references W1 UI last) |
| W4 reserve flow | app/reserved/, Stripe dashboard | — |
| W5 portfolio | content/, app/work/, app/sitemap.ts | — |
| W6 deletions/teardown | app/, convex/, proxy.ts | ctx.auth audit; after W1–W5 stabilize |
| W7 QA + handoff | — | all |

Lanes: **A:** W1 → W2 (sequential, shared convex spine). **B:** W5 (independent). **C:** W4 (independent). W3 after A lands its UI hooks (or parallel with placeholder hero). W6 strictly last before W7. Launch A + B + C in parallel; conflict flag: W3 and W1 both touch `components/promotion/` — coordinate or sequence.

## Implementation Tasks

- [ ] **T1 (P1, human: ~2d / CC: ~3-4h)** — convex — Build gated generation entry: email required, contact limit + NEW global daily cap, lead + funnel event, schedule generation; retire open `/api/concept-art` POST (D4/1A)
  - Surfaced by: Architecture — unmetered public generation endpoint (confidence 9/10)
  - Files: convex/schema.ts, convex/leadRequests.ts or convex/conceptGeneration.ts, app/api/concept-art/route.ts
  - Verify: unit tests for all 5 branches; grep confirms no ungated generateOpenAiConceptImage caller
- [ ] **T2 (P1, human: ~2d / CC: ~3-4h)** — convex+ar — Chain generated PNG into validated GLB/USDZ pipeline, async with status polling; composite_only failure path (D5/2A)
  - Surfaced by: Architecture — `glb: "", usdz: ""` on generated concepts (confidence 9/10)
  - Files: convex/aiConcepts.ts, convex/bundleGeneration.ts, lib/ar-asset-generator.ts (reuse), components/promotion/homepage-demo-actions.tsx
  - Verify: e2e hero flow with stubbed provider; malformed-bytes unit test → composite_only
- [ ] **T3 (P1, human: ~1d / CC: ~1-2h)** — app — Homepage redesign (before/during/after), root metadata replacement, `force-dynamic` removal + env-folding regression test (design doc + code quality notes)
  - Surfaced by: Design doc reviewer round 1-2 (force-dynamic, stale admin metadata); pitfall next-runtime-env-folding
  - Files: app/layout.tsx, app/page.tsx, lib/product-copy.ts, lib/runtime-env.ts
  - Verify: pnpm build; regression test asserts env reads in prod build; metadata snapshot test
- [ ] **T4 (P1, human: ~1d / CC: ~1-2h)** — app — /reserved page + Payment Link config + client SOP text (D7/4A)
  - Surfaced by: Architecture — paid-but-lost silent failure (confidence 7/10)
  - Files: app/reserved/page.tsx, docs/handoff (SOP), Stripe dashboard (manual), scripts (port verify-attribution)
  - Verify: manual Payment Link round-trip on phone; /reserved renders with and without session_id
- [ ] **T5 (P1, human: ~1.5d / CC: ~2h)** — content+app — /work + /work/[slug] from repo content (5 jobs), sitemap.ts, robots.ts, LocalBusiness JSON-LD, OG cards (D6/3A)
  - Surfaced by: Architecture — portfolio content home (confidence 8/10); design doc SEO section
  - Files: content/work/*.json, app/work/**, app/sitemap.ts, app/robots.ts
  - Verify: sitemap lists all pages; Rich Results test on /; FB sharing debugger unfurl
- [ ] **T6 (P1, human: ~1d / CC: ~1-2h)** — convex+app — ctx.auth audit + neutralize previewBundles/sellerPricing, then LAUNCH deletions (routes, dead convex modules, experiment dirs, dead tests). Clerk plumbing stays dormant (D9); full teardown is fast-follow week 2
  - Surfaced by: Design doc reviewer round 3; Test review regressions (iron rule); Codex tension 2
  - Files: convex/previewBundles.ts, convex/sellerPricing.ts, app/* (deletions), convex/sellerAuth.ts (delete)
  - Verify: pnpm typecheck/test/build; getPublicPreview null-identity test; deleted routes 404; public pages load logged-out
- [ ] **T7 (P1, human: ~1d / CC: ~1-2h)** — upload — Public upload path hardening: dimension sniffing, malformed rejection, JPEG/PNG/WebP only (TODOS P1 bundled; promoted P2→P1 per D11.5 — upload is public at launch)
  - Surfaced by: Step 0 TODOS cross-reference; pitfall preview-upload-metadata-trust-boundary
  - Files: convex/uploadValidation.ts, lib/ar-asset-generator.ts, tests/upload-validation.test.ts
  - Verify: unit tests for malformed/oversized/wrong-type uploads
- [ ] **T8 (P2, human: ~0.5d / CC: ~1h)** — qa — Real-device QA pass + GSC/sitemap submission + handoff doc
  - Surfaced by: design doc verification gate
  - Files: docs/handoff, device matrix notes
  - Verify: iPhone Safari + Android Chrome hero flow; Search Console verified

## TODOS.md entries to add at implementation start (approved D12–D14)

1. **P1: Clerk full teardown (week 2 after launch)** — remove dormant surface: `convex/auth.config.ts`, `proxy.ts` matcher, `ConvexProviderWithClerk` branches in `components/app-providers.tsx`, runtime-env Clerk readers, Clerk env in Vercel + Convex, package deps; proxy regression tests. Blocked by: launch stable a few days. Context: nothing public is gated; survivors already null-identity-safe.
2. **P2: September local-SEO ops plan (off-site)** — GBP posts fed by portfolio photos, review collection, NAP citation consistency, service-area settings. On-site SEO alone won't rank by September; these are the heavier local levers. Blocked by: launch live + client GBP access.
3. **P3: Automated AR-link email sender (evidence-gated)** — Resend + retry job restoring the "email me the AR link" promise cut at launch (D11.7). Only if real usage shows manual follow-up leaking. Context: lead email is already captured and visible to the client.

Also at implementation start: retire completed/obsolete TODOS.md items (P0 Clerk setup, P2 Clerk brand fix, P2 size overrides — all mooted by deletions; P1 PNG hardening — absorbed as T7).

## Verification (end-to-end)

1. `pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e` — all green.
2. Stubbed-provider e2e: hero flow (prompt+email → poster → AR link), reserve flow (CTA → Payment Link URL → /reserved).
3. Real iPhone Safari: generate → "place on wall" in Quick Look; real Android Chrome: Scene Viewer. One uploaded-art and one gallery-art AR check.
4. Stripe: live Payment Link round-trip with a $1 test (or test mode), confirmation email contains /reserved link.
5. SEO: `curl` sitemap/robots; Google Rich Results test for LocalBusiness; Facebook Sharing Debugger unfurl on / and one /work page.
6. Client sign-off checklist: floor price + deposit amount inserted (placeholders tracked until then; indexing gated on real price per D11.9), domain live, GBP linked.

## Design Specification (from /plan-design-review, all sections user-approved)

**Approved direction (FINAL — user chose C2 on the round-5 board after 5 exploration rounds including competitor research):** the TRUST/EDUCATION build in the existing site design language. Hero: "Not wallpaper. Not vinyl. Printed straight onto your wall." + the existing three-entry chooser (Choose design / Upload art/logo / Describe idea) + "See it on your wall →" CTA, with the art-example card (real artwork, Send to Phone / open-in-AR) on the right. Below the hero: a SPECS BAND (1200 DPI · dries instantly · 0 seams · ~1 day install) and a "Wall printing vs. everything else" COMPARISON TABLE (vs vinyl wrap and hand-painted) where the "See it on YOUR wall first (AR)" row reads "Yes — only us" — no competitor anywhere offers AR preview (verified: Surface Ink, Pixel & Plaster, Alpha Murals). Then testimonial slot, dark reserve strip ("Reserve your spot — $100, credited"), work photos, process, portfolio teaser. Reference mockup: `wpp-comp-C2.png`. Competitor patterns deliberately NOT adopted for now: Surface Ink's live price estimator (C1) and the lead-gen form hero (C3) — kept in the mockup history as future iterations. All earlier directions (Fraunces/burnt-orange, A2 minimal) superseded.

**Tokens (→ create `DESIGN.md` from this in W3; these ARE the current `app/globals.css` values, documented rather than invented):** bg `#fafafa` · fg `#18181b` · card `#ffffff` · primary `#1c4f59` deep teal · muted `#71717a` · border `#e4e4e7` · radius `0.625rem` cards + rounded-full buttons/pills · warm shadow `0 24px 70px rgba(35,31,25,.12)` · type: existing sans (Geist) stays for launch — no font swap (D6 Fraunces decision superseded by final C2 approval) · motion: exactly 3 intentional (hero fade-up, art-card hover lift, tab crossfade), all behind `prefers-reduced-motion`.

**Homepage hierarchy (1st → last), per approved C2 mockup:** round brand mark + nav ("Gallery · Our work · Reserve a spot — $100" pill) → Chicago badge ("wall prints from $600") → headline "Not wallpaper. Not vinyl. Printed straight onto your wall." → three-entry chooser (Choose design / Upload art/logo / Describe idea) + "See it on your wall →" CTA → RIGHT: art-example card (real artwork, carousel, Send to Phone/open-in-AR) → SPECS BAND (1200 DPI · dries instantly · 0 seams · ~1 day) → "Wall printing vs. everything else" comparison table (AR row = "Yes — only us") → testimonial → dark reserve strip ("Reserve your spot — $100, credited to your print") → work photos → process steps → portfolio teaser → footer NAP (Chicago address/phone, feeds LocalBusiness JSON-LD). Real photography + real client stats are launch blockers; comparison-table numbers must be verified with the client before publishing.

**Interaction states (what the user sees):**

| Feature | State | Treatment |
|---|---|---|
| Generate | loading | tool card morphs to progress + rotating real-job thumbnails, "Drafting your concept — about 30s" |
| Generate | at capacity | warm full-card message, "leave your email — you're first tomorrow" |
| AR assets | not ready/failed | 2D composite over neutral room photo + QR + "leave this open / come back" |
| Upload | rejected | inline reason + accepted formats (JPEG/PNG/WebP) |
| /work/[slug] | unknown slug | redirect to /work |
| /reserved | no session_id | same page, receipt line omitted |

**Journey beat:** `/reserved` opens with confirmation warmth ("You're in line. Here's exactly what happens next") + 3 numbered steps + schedule action — the post-payment anxiety moment is designed, not defaulted.

**Responsive/a11y:** 375px hero stacks badge → 40px headline → tool card → art-example card below, with a sticky bottom reserve bar; 44px minimum touch targets; tabs arrow-key navigable with visible 2px focus ring; body contrast ≥4.5:1 (teal `#1c4f59` on white passes at all sizes); descriptive alt on all job photos; visible form labels, never placeholder-only.

**AI-slop guards:** no 3-column icon grids, no centered-everything, real photography mandatory (per user's own board note: gradient placeholders made variants "hard to understand" — real art is comprehension, not decoration).

**Pending second opinion (user-requested):** once the homepage outline/mockup exists during the build, run one copy + structure pass through the user's Alex Hormozi AI (open in browser; GStack Browser connect flow works) before locking copy.

## Approved Mockups

| Screen/Section | Mockup Path | Direction | Notes |
|----------------|-------------|-----------|-------|
| **Funnel homepage (BUILD FROM THIS)** | ~/.gstack/projects/preview-picture/designs/shotgun-homepage-20260703/wpp-comp-C2.png | C2: trust/education build in existing teal/zinc language | User's round-5 choice ("Option B"); real photography + real client stats required before launch |
| Live original (reference) | ~/.gstack/projects/preview-picture/designs/shotgun-homepage-20260703/wpp-localhost-home.png | Client-liked current homepage | The DNA every variant preserved |
| Future iteration candidates | wpp-comp-C1.png (price estimator hero), wpp-comp-C3.png (lead-gen form) | Competitor-pattern alternates | Revisit post-launch / September; estimator = Surface Ink's strongest pattern |
| Exploration history (5 rounds) | ~/.gstack/projects/preview-picture/designs/*-20260703/ | 14 comps + boards + feedback JSONs | approved.json holds the C2 decision record |
