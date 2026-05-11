# Local HTTPS AR Testing

Native AR handoff is easiest to validate from a public HTTPS URL. Use a Vercel preview URL for the default phone loop. Use a local tunnel only when deployment latency is slowing down iteration.

## Default Phone Loop

1. Build the app with `pnpm build`.
2. Deploy or open a Vercel preview URL.
3. Visit the homepage on the phone.
4. Tap `Open AR sample`.
5. Confirm the native AR viewer opens with the static 45 x 90 cm tall print.

## Local Tunnel Fallback

Use this when you need faster local iteration on a phone.

```sh
pnpm build
pnpm start
cloudflared tunnel --url http://127.0.0.1:3000
```

Then open the generated HTTPS tunnel URL on the phone. The homepage must load from HTTPS before iPhone Quick Look or Android Scene Viewer testing is meaningful.

Do not use `pnpm dev` for this project unless explicitly requested.

## Acceptance Notes

- Homepage is the native AR proof.
- `/picture-mode` remains the browser-camera/photo fallback.
- The AR sample uses checked-in GLB and USDZ files.
- The print has one fixed real-world size: 45 x 90 cm.
