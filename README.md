# Wall Print Pro

Public marketing and lead-generation site for Wall Print Pro, a Chicago wall-printing
business. There is no login and no admin surface — every route is public. A visitor
picks a design, uploads their own art, or describes an idea for an AI concept, previews
it on their own wall with phone AR, then requests an estimate or reserves a print-job
slot with a $100 deposit.

## Routes

| Route | What it does |
| --- | --- |
| `/` | Homepage hero: choose a saved design, upload art, or describe an AI concept; AR preview; comparison table; reserve CTA. |
| `/gallery` | Browse the full artwork catalog and open the AR preview for any design. |
| `/preview/[slug]` | Public AR preview for a specific bundle (chosen design, upload, or generated concept). No auth; unready/failed/revoked previews render a generic status page. |
| `/request` | Estimate request form (contact details, selected design/upload/concept, optional AI concept prompt). |
| `/reserved` | Post-payment confirmation after the $100 Stripe deposit; explains next steps and asks the buyer to text/call to schedule. |
| `/work`, `/work/[slug]` | Approved portfolio ("Our Work") gallery; `/work/[slug]` redirects to `/work` (legacy job-page slugs are retired). |
| `/robots.ts`, `/sitemap.ts` | Generated robots and sitemap output. |
| `/api/concept-art` | Proxies an AI concept-generation request to Convex (rate-capped). |
| `/api/homepage-artwork` | Proxies homepage artwork data from Convex. |
| `/api/preview-confirmations` | Submits a buyer's confirmation note on a preview bundle. |
| `/api/reserved-visit` | Logs a `reserved_visit` funnel event after a Stripe redirect. |
| `/api/dev-public-origin` | Local-dev only: resolves the current ngrok public URL for phone testing. |

The AR handoff uses `@google/model-viewer`: USDZ Quick Look on iPhone Safari, GLB Scene
Viewer on Android Chrome, with a QR/2D fallback on desktop and unsupported devices.

## Local development

Use pnpm only — never npm (see `AGENTS.md`).

```sh
pnpm install
pnpm dev          # vinext dev server (Vite-based)
npx convex dev     # Convex sync/watch — Convex CLI is the one place npx is expected
```

For phone AR testing you need the full local stack running together: the app on
localhost, `npx convex dev`, and an ngrok tunnel, since AR viewers on a phone can't
reach `localhost` on your Mac:

```sh
pnpm dev
ngrok http 3000   # or whatever port vinext prints
```

Open the `https://...ngrok...` URL on the phone, not `localhost`. Page/CSS edits
refresh normally through the tunnel; native AR viewers can cache `.glb`/`.usdz` more
aggressively, so model changes may need a renamed or versioned asset URL before the
phone picks up the change.

Do not start `pnpm dev` unless the task actually needs an interactive local server, and
don't use `vinext start` (production serving) as a substitute for dev mode during UI,
upload, or browser QA work — see `AGENTS.md` for the full local-server rules.

## Testing

```sh
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest unit tests (tests/*.test.ts)
pnpm test:e2e    # Playwright e2e (tests/*.spec.ts)
```

## Deployment

Production is `https://www.thewallprintpro.com`, served entirely by ChatGPT Sites (a
Cloudflare Worker build) — Vercel hosting was fully retired on 2026-07-29
(`docs/vercel-retirement-2026-07-29.md`). `pnpm build` (vinext/Cloudflare) is the only
production build target; see `docs/sites-migration.md` for the migration record and
media-approval process.

Environment variables live in the Sites project dashboard (and Convex, for
backend-only values) — not in this repo. At minimum: `NEXT_PUBLIC_SITE_URL`,
`CONVEX_URL` / `NEXT_PUBLIC_CONVEX_URL`, `WALL_PRINT_PRO_RESERVE_URL`,
`WALL_PRINT_PRO_PUBLIC_PHONE`, `WALL_PRINT_PRO_PUBLIC_CONTACT_URL`,
`WALL_PRINT_PRO_AI_CONCEPTS_ENABLED`, and `OPENAI_API_KEY`. Full list, owners, and the
deploy/post-deploy checklist are in `docs/handoff/launch-handoff.md`.

Push Convex functions/schema after backend changes with the Convex CLI's
dev/deploy flow (`npx convex dev` locally; deploy to the target Convex deployment
once confirmed).

## Backend

Convex holds all backend state: `leadRequests`, `previewBundles`, `aiConceptDrafts`,
`arPreviews` (legacy seed samples), `previewConfirmations`, `funnelEvents`, and
rate/cap tables (`leadRateLimits`, `globalGenerationCap`). A cron
(`convex/crons.ts`) recovers stale in-flight preview generations every minute. AI
concept image generation goes through OpenAI (`lib/openai-image-provider.ts`) and is
rate-capped per lead and globally per day (`convex/leadRequests.ts`,
`convex/dailyCaps.ts`).

## Repo map

- `app/` — Next.js 16 App Router routes and API routes (see table above).
- `components/` — UI, split by domain: `ar/`, `preview/`, `promotion/`, `request/`,
  `reserved/`, `seo/`, `site/`, `ui/`.
- `convex/` — backend functions, schema, and crons.
- `lib/` — shared logic: contracts/validators, pricing, site URL, runtime env, AR asset
  generation, product copy, local-business NAP.
- `worker/` — the Cloudflare Worker entry point that serves the Sites build.
- `scripts/` — asset/media build scripts (Phase 0 AR assets, approved media catalog,
  Stripe redirect checker).
- `tests/` — Vitest unit tests (`*.test.ts`) and Playwright e2e specs (`*.spec.ts`).
- `docs/` — migration records, launch handoff, and plans.

Node version is pinned in `.nvmrc` (22.14.0); the framework runs on `vinext` (a
Vite-based Next.js-compatible dev/build tool), not the Next.js CLI directly.

## Further reading

- `DESIGN.md` — the current design system (colors, type, motion, a11y baseline).
- `TODOS.md` — open work and post-launch polish items. Clerk authentication has been
  fully removed along with the pre-launch admin architecture.
- `docs/handoff/launch-handoff.md` — launch gates, secrets ownership, deploy checklist,
  and how to add a new portfolio job.
