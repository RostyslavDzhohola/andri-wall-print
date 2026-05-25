# Preview Picture

Next.js web app for previewing printed wall art from a standalone client link.

## What it does

- Runs as a browser link with no authentication and no install.
- Opens the homepage as a static phone demo for multiple checked-in 1:2 tall prints.
- Uses `@google/model-viewer` for a client-only GLB/USDZ handoff to iPhone Quick Look and Android Scene Viewer.
- Shows one pre-AR interaction: cycle through pictures, then place the selected real-size print on a wall through the phone's native AR viewer.
- Removes the old browser-camera overlay and fallback route.

## Phone demo

The current demo is intentionally fixed to one physical size:

- Print: 45 x 90 cm, 1:2 aspect ratio.
- Included samples:
  - Dragon Wall Print: `/ar/dragon-wall-print.glb`, `/ar/dragon-wall-print.usdz`, `/artworks/dragon-wall-print.png`.
  - Terra Forms: `/ar/terra-forms.glb`, `/ar/terra-forms.usdz`, `/artworks/terra-forms.png`.
  - Coastal Blocks: `/ar/coastal-blocks.glb`, `/ar/coastal-blocks.usdz`, `/artworks/coastal-blocks.png`.
  - Botanical Study: `/ar/botanical-study.glb`, `/ar/botanical-study.usdz`, `/artworks/botanical-study.png`.
  - Elven Portrait: `/ar/elven-wall-print.glb`, `/ar/elven-wall-print.usdz`, `/artworks/elven-wall-print.png`.
  - Cyberpunk Skyline: `/ar/cyberpunk-wall-print.glb`, `/ar/cyberpunk-wall-print.usdz`, `/artworks/cyberpunk-wall-print.png`.

Open the deployed URL on iPhone Safari or Android Chrome. Cycle through the pictures, then tap `Place on wall`. On supported phones, this opens the native AR viewer so you can point at a wall and place the selected print.

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
