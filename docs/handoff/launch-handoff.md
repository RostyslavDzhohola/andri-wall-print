# Wall Print Pro Launch Handoff

## What This Site Does

Wall Print Pro is a Des Plaines and Cook County wall-printing funnel that sets a starting anchor with "wall prints from $500" before a buyer gets deep into the page. The buyer can see a print on their own wall by choosing a saved design, uploading art or a logo, or generating a concept, then opening the AR preview on a phone. Serious buyers reserve a print-job slot with a $100 Stripe deposit that is credited toward the final print price. After payment, `/reserved` explains the next steps and asks the buyer to text or call so the estimate visit can be scheduled.

## Launch Gates - Fill These Before Submitting For Indexing

Do not submit the site for indexing until every item below is confirmed with the client and updated in the named file.

| File | What's Needed | Current Repo Evidence |
|---|---|---|
| `lib/product-copy.ts` | Confirm the public floor price. | Public anchor currently says `wall prints from $500`; client approval remains a launch gate. |
| `docs/plans/2026-07-03-public-funnel-launch.md` | Confirm the real floor price before indexing. | Plan calls the anchor price and real floor price a launch gate. |
| `lib/local-business.ts` | Keep approved NAP synchronized everywhere. | `1453 E Walnut Ave, Des Plaines, IL 60016`; `(708) 543-3826`; `thewallprintpro@gmail.com`; Cook County. |
| `app/page.tsx` | Footer NAP must stay aligned with `lib/local-business.ts`. | Footer renders from `LOCAL_BUSINESS_NAP`. |
| `lib/site-url.ts` | Keep the canonical production domain. | Fallback and approved value are `https://www.thewallprintpro.com`; env key is `NEXT_PUBLIC_SITE_URL`. |
| `scripts/check-stripe-redirect.mjs` | Keep the Stripe redirect checklist aligned with the real production domain. | Expected redirect is `https://<domain>/reserved?session_id={CHECKOUT_SESSION_ID}`. |
| `app/page.tsx` | Set the live Stripe Payment Link URL. | Reserve CTA reads `WALL_PRINT_PRO_RESERVE_URL`; fallback is `/request?intent=reserve`. |
| `app/reserved/page.tsx` | Keep the approved public phone for post-payment scheduling. Use E.164 format in env. | Env override is `WALL_PRINT_PRO_PUBLIC_PHONE`; fallback is the approved 708 NAP. |
| `lib/runtime-env.ts` | Confirm launch env vars are present in hosting. | Reads `WALL_PRINT_PRO_RESERVE_URL`, `WALL_PRINT_PRO_PUBLIC_PHONE`, `WALL_PRINT_PRO_PUBLIC_CONTACT_URL`, `WALL_PRINT_PRO_AI_CONCEPTS_ENABLED`, `WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED`, `OPENAI_API_KEY`, `CONVEX_URL`, and `NEXT_PUBLIC_CONVEX_URL`. |
| `app/page.tsx` and `lib/product-copy.ts` | Verify comparison-table numbers with the client. | Rows include `1200 DPI`, `~1 day`, `$600`, `$450+`, and `$2,500+`; component comments mark these as plausible placeholders. |
| `content/work/ember-dragon-statement-wall.json` | Confirm portfolio job facts and replace placeholder install details. | `needsClientConfirmation: true`; note asks for real client, address/neighborhood, install photography, and true story. |
| `content/work/lakefront-day-mural.json` | Confirm portfolio job facts and replace placeholder install details. | `needsClientConfirmation: true`; note asks for real client, address/neighborhood, install photography, and true story. |
| `content/work/moonlit-elven-portrait.json` | Confirm portfolio job facts and replace placeholder install details. | `needsClientConfirmation: true`; note asks for real client, address/neighborhood, install photography, and true story. |
| `content/work/pathways-to-success-mural.json` | Confirm portfolio job facts and replace placeholder install details. | `needsClientConfirmation: true`; note asks for real client name, exact address/neighborhood, install photography, and true story. |
| `content/work/river-train-crossing-mural.json` | Confirm portfolio job facts and replace placeholder install details. | `needsClientConfirmation: true`; note asks for real client, address/neighborhood, install photography, and true story. |

## Stripe Reserve SOP

Use `docs/handoff/stripe-reserve-sop.md` as the client operating procedure for the $100 reserve deposit. It covers the one-time Stripe Payment Link setup, the `/reserved?session_id={CHECKOUT_SESSION_ID}` redirect, the phone test, daily Stripe mobile notifications, refund handling, and the local checker command.

## Secrets Ownership Checklist

The complete names-only inventory, validation, rotation/revocation procedure, target identities, deployment order, rollback, moderation/removal, lead SLA, spend response, and incident matrix are in `docs/handoff/production-operations.md`. The current blocker/deferred split is in `docs/handoff/release-decision.md`.

| Secret or Account | What It Is | Who Owns It | Where The Key Lives |
|---|---|---|---|
| OpenAI | API key for AI concept image generation; a hard usage limit must be set in the OpenAI dashboard before launch. | Client owns billing; developer installs env. | `OPENAI_API_KEY` in Convex/Sites env as needed; dashboard usage limit is required by plan D11.1. |
| Convex deployment | Backend data, storage, public mutations, funnel events, and generated AR asset URLs. | Developer owns deployment access during launch; client should have owner/admin access before handoff. | Convex project dashboard; app reads `CONVEX_URL` / `NEXT_PUBLIC_CONVEX_URL`. |
| Stripe account | Payment Link, reserve-deposit ledger, refunds, and mobile payment notifications. | Client. | Stripe dashboard; public site uses only `WALL_PRINT_PRO_RESERVE_URL`. |
| ChatGPT Sites project | Production hosting and public env vars. | Developer during launch; client should retain owner/admin access. | Sites project settings; include `NEXT_PUBLIC_SITE_URL`, `WALL_PRINT_PRO_RESERVE_URL`, `WALL_PRINT_PRO_PUBLIC_PHONE`, `WALL_PRINT_PRO_PUBLIC_CONTACT_URL`, and Convex public URL. |
| Domain registrar | DNS and domain ownership for the production domain. | Client. | Registrar account; DNS points `www.thewallprintpro.com` to the Sites custom-domain target. |

## Deploy + Post-Deploy Checklist

- Push Convex functions after the schema changes: `globalGenerationCap`, `funnelEvents`, concept AR fields on `aiConceptDrafts`, `galleryEntries`, and the launch-deleted tables. Use Convex dev/sync/deploy flow only after confirming the target deployment.
- Set env vars in Sites and Convex: `NEXT_PUBLIC_SITE_URL`, `CONVEX_URL`, `NEXT_PUBLIC_CONVEX_URL`, `WALL_PRINT_PRO_RESERVE_URL`, `WALL_PRINT_PRO_PUBLIC_PHONE`, `WALL_PRINT_PRO_PUBLIC_CONTACT_URL`, `WALL_PRINT_PRO_AI_CONCEPTS_ENABLED`, and `OPENAI_API_KEY` where generation runs.
- Keep `WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED` unset or false in both Sites and Convex for the initial schema/functions and website rollout. While it is off, existing generation behavior remains available and public community queries fail closed.
- With the flag still off, verify generation keeps its existing private behavior, the curated gallery still renders if Convex is unavailable, public community queries return no entries, and no legacy draft appears in `galleryEntries`.
- Before production enablement, turn the flag on in both a development or staging Sites runtime and its matching Convex deployment. Verify both generation entry points show an unchecked required consent box and that a missing-consent request is rejected before lead/quota work. Verify one newly consented safe result reaches `published`, then hide that test entry.
- Enable `WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED=1` in production Convex and Sites only after the development or staging checks pass. Do not backfill legacy drafts. Flagged, moderation-error, failed, and `composite_only` results must remain private.
- To remove a community item, set its `galleryEntries.status` to `hidden` in the Convex dashboard. The public list and published-slug query exclude hidden entries immediately; no public admin route exists in V1.
- Day-4 production-device gate: on the production domain, test real iPhone Safari Quick Look and Android Chrome Scene Viewer. Include generated concept AR, gallery AR, Convex-storage asset URL headers, MIME types, and file sizes.
- Payment Link phone round-trip: on a phone, open the Stripe Payment Link, pay in test mode or live/refund, land on `/reserved?session_id=...`, confirm the receipt reference appears, then reopen `/reserved` from the Stripe email link without `session_id`.
- During the Payment Link phone round-trip, confirm a `reserved_visit` funnel event appears in the Convex dashboard (data → `funnelEvents`).
- Share-surface unfurl checklist: Facebook personal post, Facebook business page, Google Business Profile website link, and Instagram bio.
- Google Search Console: verify the production domain and submit the sitemap.
- Google Business Profile: link the production website and confirm the displayed NAP matches `lib/local-business.ts`.

## Device Support Matrix

Fill this from real-device QA only.

| Device | Browser | AR Mode | Placement Quality | Notes |
|---|---|---|---|---|
| iPhone | Safari | Quick Look | Fill from real-device QA | Include generated, uploaded or chosen, and gallery AR checks. |
| Android | Chrome | Scene Viewer | Fill from real-device QA | Include generated, uploaded or chosen, and gallery AR checks. |
| Desktop | Desktop browser | QR handoff | Fill from real-device QA | Confirm desktop shows a usable phone handoff instead of pretending AR is available. |
| Unsupported device | Any unsupported browser | 2D composite | Fill from real-device QA | Confirm fallback copy and reserve path still work. |

## How To Add A New Portfolio Job

One commit should contain the new content file and any new public images.

- Copy one JSON file in `content/work/`, rename it to the new slug, and make `slug` match the filename.
- Add photos under `public/`, then reference them with root-relative paths such as `/artworks/example.png` or `/work-videos/example-poster.jpg`.
- `title`: public project title.
- `neighborhood`: Chicago neighborhood or service area label.
- `area`: city and state label.
- `size`: installed print size shown on the job page.
- `surface`: wall or material the print was installed on.
- `story`: one plain-language paragraph explaining what the client wanted and what was printed.
- `photos`: ordered image list with `src` and descriptive `alt`.
- `needsClientConfirmation`: keep `true` until the client confirms the facts and photography.
- `clientConfirmationNote`: short internal note describing what still needs confirmation.

## Weekly Ops

- Respond to Stripe reserve notifications within 24 hours. The Stripe mobile app push notification is the fastest signal.
- Check Convex leads every business day and respond within one business day; distinguish existing-design, upload, AI, and reserve requests as documented in `production-operations.md`.
- Monthly: review OpenAI usage against the client-adjustable 50/day cap constant in `convex/leadRequests.ts` (`GLOBAL_CONCEPT_GENERATION_DAILY_CAP`).
