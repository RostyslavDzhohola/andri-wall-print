# Static AR Test Plan

## Automated

Run before a manual device pass:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

The automated checks cover:

- `AR_SAMPLE` manifest paths and fixed physical dimensions.
- Presence and non-empty size of checked-in GLB, USDZ, and poster assets.
- Homepage rendering of the native AR sample.
- `/picture-mode` rendering as the fallback route.
- Navigation from the homepage to the fallback route.

## Manual Device Gate

The real acceptance gate is phone placement quality.

1. Open the HTTPS preview or tunnel URL on iPhone Safari.
2. Tap `Open AR sample`.
3. Confirm Quick Look opens.
4. Place the sample against a wall.
5. Confirm it reads as a tall, flat 1:2 print and appears close to 45 x 90 cm.
6. Repeat on Android Chrome and confirm Scene Viewer or the supported native AR handoff opens.
7. If native AR is unavailable, confirm the homepage still renders the model preview and `/picture-mode` works as fallback.

Record device, OS/browser, AR viewer, placement quality, and known issues once enough real-device results exist for a support matrix.
