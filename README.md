# Preview Picture

Next.js web app for previewing printed wall art from a standalone client link.

## What it does

- Runs as a browser link with no authentication and no install.
- Opens the homepage as a static phone demo for multiple checked-in real-size prints.
- Uses `@google/model-viewer` for a client-only GLB/USDZ handoff to iPhone Quick Look and Android Scene Viewer.
- Shows one pre-AR interaction: cycle through pictures, then place the selected real-size print on a wall through the phone's native AR viewer.
- Removes the old browser-camera overlay and fallback route.

## Phone demo

The current demo uses checked-in static samples with real-size GLB/USDZ planes:

- Included samples:
  - Chicago Final 1, 152 x 127 cm: `/ar/chicago-final-1.glb`, `/ar/chicago-final-1.usdz`, `/artworks/chicago-final-1.png`.
  - Chicago Final 2, 91 x 152 cm: `/ar/chicago-final-2.glb`, `/ar/chicago-final-2.usdz`, `/artworks/chicago-final-2.png`.
  - Chicago Final 3, 122 x 152 cm: `/ar/chicago-final-3.glb`, `/ar/chicago-final-3.usdz`, `/artworks/chicago-final-3.png`.
  - Dragon Wall Print, 45 x 90 cm: `/ar/dragon-wall-print.glb`, `/ar/dragon-wall-print.usdz`, `/artworks/dragon-wall-print.png`.
  - Terra Forms, 45 x 90 cm: `/ar/terra-forms.glb`, `/ar/terra-forms.usdz`, `/artworks/terra-forms.png`.
  - Coastal Blocks, 45 x 90 cm: `/ar/coastal-blocks.glb`, `/ar/coastal-blocks.usdz`, `/artworks/coastal-blocks.png`.
  - Botanical Study, 45 x 90 cm: `/ar/botanical-study.glb`, `/ar/botanical-study.usdz`, `/artworks/botanical-study.png`.
  - Elven Portrait, 45 x 90 cm: `/ar/elven-wall-print.glb`, `/ar/elven-wall-print.usdz`, `/artworks/elven-wall-print.png`.
  - Cyberpunk Skyline, 45 x 90 cm: `/ar/cyberpunk-wall-print.glb`, `/ar/cyberpunk-wall-print.usdz`, `/artworks/cyberpunk-wall-print.png`.

Open the deployed URL on iPhone Safari or Android Chrome. Cycle through the pictures, then tap `Place on wall`. On supported phones, this opens the native AR viewer so you can point at a wall and place the selected print.

## Phase 0 Convex preview seed

The public preview route is `/preview/[slug]`. In production it reads `arPreviews:getPublicPreview` from `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` through the Convex HTTP API and expects Convex storage URLs for poster, GLB, and USDZ.

Manual Chicago proof seed path:

```sh
pnpm assets:phase0:chicago
CONVEX_URL="https://your-deployment.convex.cloud" PHASE0_SEED_TOKEN="..." pnpm convex:seed:phase0
```

The PDF asset builder expects Python packages `Pillow` and `pypdfium2` in the active Python environment.

Set the same `PHASE0_SEED_TOKEN` in the Convex deployment before running the seed script. The PDF sources are only a manual Phase 0 input path; public uploads stay image-only until first-class PDF upload support is explicitly added.

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
