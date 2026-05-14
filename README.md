# Preview Picture

Next.js web app for previewing printed wall art from a standalone client link.

## What it does

- Runs as a browser link with no authentication and no install.
- Opens the homepage as the working phone demo for one checked-in 1:2 tall print.
- Uses `@google/model-viewer` for a client-only GLB/USDZ handoff to iPhone Quick Look and Android Scene Viewer.
- Shows one action: place the real-size print on a wall through the phone's native AR viewer.
- Removes the old browser-camera overlay and fallback route.

## Phone demo

The current demo is intentionally fixed:

- Print: 45 x 90 cm, 1:2 aspect ratio.
- GLB: `/ar/static-tall-print.glb`.
- USDZ: `/ar/static-tall-print.usdz`.
- Poster: `/ar/static-tall-print-poster.svg`.

Open the deployed URL on iPhone Safari or Android Chrome. Tap `Place print on wall`. On supported phones, this opens the native AR viewer so you can point at a wall and place the print.

## Browser limits

Desktop browsers may only show the model preview. They are not the real acceptance path for wall placement.

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

Use the Vercel production URL on your phone. Desktop verification only confirms the page and model assets load.

### Fast phone testing with ngrok

Use Vercel as the stable phone test URL. For faster local iteration on a real phone, use the local dev server through an existing authenticated `ngrok` install:

```sh
pnpm dev
ngrok http 3000
```

If Next prints a different local port, tunnel that port instead. For example, if Next prints `http://localhost:3001`, run `ngrok http 3001`.

Open the generated `https://...ngrok...` URL on the phone. Do not open `localhost` on the phone, because `localhost` points at the phone itself, not this Mac.

Page and CSS edits should refresh normally through the ngrok URL. Native AR viewers may cache `.usdz` and `.glb` assets more aggressively, so model changes may need a renamed asset or a versioned URL before the phone shows the new file.
