# TODOs

## P0: Prove The Static Tall Print On Real Devices

What: Validate the checked-in 45 x 90 cm GLB/USDZ sample from the homepage on iPhone Safari and Android Chrome.

Why: Real wall placement is the first blocking milestone. Browser rendering alone does not prove the AR promise.

Context: Use the homepage native AR sample, Vercel preview URL by default, or the local HTTPS tunnel fallback in `docs/local-https-ar-testing.md`.

Depends on / blocked by: Manual access to target phones and a wall where physical scale can be judged.

## P1: Add Dynamic Image-To-AR Asset Generation

What: Let a user-provided wall-art image become platform AR assets after the static proof works.

Why: The open-source promise is "turn any wall-art image into AR," but the first slice deliberately uses one checked-in static sample so wall placement can be validated first.

Context: Start from the accepted static architecture: a generated tall 1:2 flat print, fixed physical size, checked-in GLB/USDZ assets, model-viewer on the AR homepage, and real-device validation through a local HTTPS tunnel. After that works, decide whether image-to-GLB/USDZ generation should happen client-side, server-side, or at build time.

Depends on / blocked by: Static GLB/USDZ sample must pass the iPhone and Android wall-placement gate.

## P1: Automate AR Asset Optimization And Size Checks

What: Add checks that catch oversized or missing image/model assets before they ship.

Why: Mobile AR can feel broken if GLB, USDZ, poster, or texture assets are too large or invalid.

Context: The first slice should use manually optimized assets and a simple mobile budget. Once more samples or dynamic generation exist, add automated validation for file existence, file size, and possibly model integrity so future assets do not silently slow down phone testing.

Depends on / blocked by: Static sample should work first; this becomes more important when multiple samples or generated assets are added.

## P1: Create A Device Support Matrix

What: Document tested devices, browsers, AR mode used, placement quality, known limits, and fallback behavior.

Why: WebAR behavior differs across iPhone Safari, Android Chrome, desktop browsers, and unsupported devices. The project needs durable device knowledge once testing produces real results.

Context: The first implementation should include lightweight support and fallback UI only. After real-device testing, turn those results into a README support matrix for open-source users and contributors.

Depends on / blocked by: Real iPhone and Android testing must produce enough results to document honestly.
