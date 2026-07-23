# Preview Picture

Next.js web app for generating and opening wall-art AR preview links.

## What it does

- Opens the homepage as a Wall Print Pro AR sales surface for multiple checked-in real-size prints.
- Adds a Clerk-protected `/admin` workspace for allowlisted admins.
- Lets an admin create a no-auth public preview link from a checked sample or an image upload.
- Stores admin preview records in Convex with private preparing/failed/revoked states and public ready links.
- Uses `@google/model-viewer` for a client-only GLB/USDZ handoff to iPhone Quick Look and Android Scene Viewer.
- Reuses the same native AR launcher on the homepage, admin-created public previews, and Phase 0 seeded previews.
- Removes the old browser-camera overlay and fallback route.

## Admin Preview Flow

An allowlisted admin signs into `/admin`, creates a preview link, and shares `/preview/[slug]`.

- Checked sample links become `ready` immediately and point at the existing checked-in assets.
- PNG uploads are stored in Convex quarantine storage, then a Convex action creates poster, GLB, and USDZ assets with the TypeScript flat-plane generator.
- New public preview links use random `p-...` slugs instead of artwork titles or uploaded file names.
- Public preview lookup checks `previewBundles` first, then falls back to the Phase 0 `arPreviews` table.
- Public pages do not expose artwork metadata until the preview record is `ready`.
- `uploaded`, `validating`, and `generating` preview links render a generic preparing page.
- `failed`, `rejected`, `revoked`, and missing preview links render a generic unavailable page.
- Revoke deletes generated Convex storage assets and marks the public link unavailable. Already-opened native AR viewers may briefly use cached model files.

### Required Clerk and Convex setup

The protected admin workspace needs a dedicated Clerk app before it can run end to end:

```sh
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
CLERK_SECRET_KEY="..."
CLERK_JWT_ISSUER_DOMAIN="https://your-clerk-issuer"
WALL_PRINT_PRO_SELLER_EMAILS="admin@example.com"
```

Set `CLERK_JWT_ISSUER_DOMAIN` in the Convex deployment too:

```sh
pnpm exec convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-clerk-issuer"
```

After the real issuer is set, run:

```sh
pnpm exec convex codegen
```

The current repo intentionally does not contain Clerk secrets. If Clerk is not configured, `/admin` renders a setup blocker and public routes keep working.

## Phone demo

The current demo uses checked-in static samples with real-size GLB/USDZ planes:

- Included samples:
  - Chicago Final 1, 152 x 127 cm: `/ar/chicago-final-1.glb`, `/ar/chicago-final-1.usdz`, `/artworks/chicago-final-1.jpg`.
  - Chicago Final 2, 91 x 152 cm: `/ar/chicago-final-2.glb`, `/ar/chicago-final-2.usdz`, `/artworks/chicago-final-2.jpg`.
  - Chicago Final 3, 122 x 152 cm: `/ar/chicago-final-3.glb`, `/ar/chicago-final-3.usdz`, `/artworks/chicago-final-3.jpg`.

Open the deployed URL on iPhone Safari or Android Chrome. Cycle through the pictures, then tap `Place on wall`. On supported phones, this opens the native AR viewer so you can point at a wall and place the selected print.

## Phase 0 Convex preview seed

The public preview route is `/preview/[slug]`. In production it reads `arPreviews:getPublicPreview` from `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` through the Convex HTTP API. That function now checks admin-created `previewBundles` first and falls back to seeded `arPreviews`.

Manual Chicago proof seed path:

```sh
pnpm assets:phase0:chicago
CONVEX_URL="https://your-deployment.convex.cloud" PHASE0_SEED_TOKEN="..." pnpm convex:seed:phase0
```

The PDF asset builder expects Python packages `Pillow` and `pypdfium2` in the active Python environment.

Set the same `PHASE0_SEED_TOKEN` in the Convex deployment before running the seed script. The PDF sources are only a manual Phase 0 input path; admin uploads stay image-only until first-class PDF upload support is explicitly added.

## Browser limits

The homepage is deliberately a static presentation. Desktop browsers are not the real acceptance path for wall placement.

## Install

```sh
pnpm install
```

## Local commands

```sh
pnpm build
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm exec convex codegen
pnpm assets:phase0:chicago
pnpm convex:seed:phase0
```

Do not run `pnpm dev` unless deliberately requested.

## Phone testing

Use the Vercel production URL on your phone. Desktop verification only confirms the static page and model assets load.

### Fast phone testing with ngrok

Use Vercel as the stable phone test URL. For faster local iteration on a real phone, use the local dev server through an existing authenticated `ngrok` install:

```sh
pnpm dev
ngrok http 3000
```

If Next prints a different local port, tunnel that port instead. For example, if Next prints `http://localhost:3001`, run `ngrok http 3001`.

Open the generated `https://...ngrok...` URL on the phone. Do not open `localhost` on the phone, because `localhost` points at the phone itself, not this Mac.

Page and CSS edits should refresh normally through the ngrok URL. Native AR viewers may cache `.usdz` and `.glb` assets more aggressively, so model changes may need a renamed asset or a versioned URL before the phone shows the new file.
