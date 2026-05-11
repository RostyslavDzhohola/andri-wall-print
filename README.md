# Preview Picture

Next.js web app for previewing printed wall art from a standalone client link.

## What it does

- Runs as a browser link with no authentication and no install.
- Opens the homepage as a native AR proof using a checked-in static 1:2 tall print.
- Uses `@google/model-viewer` for a client-only GLB/USDZ handoff to iPhone Quick Look and Android Scene Viewer.
- Keeps the older browser-camera/photo experience at `/picture-mode`.
- Accepts artwork from the built-in samples, local uploads, or URL query parameters.
- Opens Picture mode with live camera, wall photo, or sample wall preview.
- Requires a scan/calibration step before wall placement.
- Lets the client tap the wall to anchor one or more paintings.
- Uses device orientation when available to keep placed paintings visually stuck to the wall as the phone pans left/right/up/down.
- Uses a distance calibration control so the preview gets smaller farther away and larger closer up.

## Link images

Client-specific artwork can be passed in a URL:

```txt
/?images=https%3A%2F%2Fexample.com%2Fone.jpg,https%3A%2F%2Fexample.com%2Ftwo.jpg
```

You can also repeat `art`:

```txt
/?art=https%3A%2F%2Fexample.com%2Fone.jpg&art=https%3A%2F%2Fexample.com%2Ftwo.jpg
```

## Static AR proof

The first AR sample is intentionally fixed:

- Print: 45 x 90 cm, 1:2 aspect ratio.
- GLB: `/ar/static-tall-print.glb`.
- USDZ: `/ar/static-tall-print.usdz`.
- Poster: `/ar/static-tall-print-poster.svg`.

Dynamic image-to-AR generation is deferred until the static phone proof works on real devices.

## Browser limits

A no-install website cannot access native iPhone ARKit anchors. This app implements the web path: camera/photo preview, scan confidence, manual wall lock, orientation-based perspective, and distance calibration. Browsers that expose stronger tracking APIs can be layered in later without changing the client-facing flow.

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

Use a Vercel preview URL by default. For faster local phone iteration, see `docs/local-https-ar-testing.md`.
