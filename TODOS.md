# TODOs

## P0: Prove The Static Print Gallery On Real Devices

What: Validate the checked-in GLB/USDZ samples from the homepage on iPhone Safari and Android Chrome.

Why: Real wall placement is the first blocking milestone. Browser rendering alone does not prove the AR promise.

Context: Use the homepage on the Vercel production URL. The old browser-camera overlay has been removed; this should be judged only by native AR placement on a phone.

Depends on / blocked by: Manual access to target phones and a wall where physical scale can be judged.

## P1: Validate Convex-Backed Public Preview Links

What: Serve a single artwork from `/preview/[slug]` using Convex storage URLs for poster, GLB, and USDZ.

Why: Phone QA should validate the real customer link shape, not only a raw asset URL or local homepage gallery.

Context: Start with the checked-in Chicago Phase 0 assets and Convex storage URLs. Do not add Clerk, seller uploads, or runtime AR generation yet.

Depends on / blocked by: Convex deployment with seeded Phase 0 records and phone checks against deployed Vercel URLs.

## P2: Keep PDF Handling Manual For Phase 0 Seeds

What: Use `pnpm assets:phase0:chicago` only for known local Chicago proof PDFs, then seed the generated files with `pnpm convex:seed:phase0`.

Why: The Phase 0 public path is proving native AR and asset delivery, not accepting arbitrary PDFs from sellers.

Context: Public v2 uploads should remain image-only until the PDF extraction, validation, and preview failure modes are designed.

Depends on / blocked by: Local Chicago PDF proof files and a configured Convex `PHASE0_SEED_TOKEN`.

## P3: Add First-Class PDF Upload Support Later

What: Design PDF uploads as a separate v2 feature with validation, preview extraction, size limits, and clear seller-facing failure states.

Why: PDFs have different page, crop, transparency, and font/image embedding behavior than plain images.

Context: Do not blend this into the Phase 0 public preview proof.

Depends on / blocked by: Static AR and image-only upload path decisions.

## Later: Add Dynamic Image-To-AR Asset Generation

What: Let a user-provided wall-art image become platform AR assets after the static proof works.

Why: The open-source promise is "turn any wall-art image into AR," but the first slice deliberately uses checked-in static samples so wall placement can be validated first.

Context: Start from the static homepage demo: generated flat prints, checked-in GLB/USDZ assets, and real-device validation from the Vercel production URL. After that works, decide whether image-to-GLB/USDZ generation should happen client-side, server-side, or at build time.

Depends on / blocked by: Static GLB/USDZ samples must pass the iPhone and Android wall-placement gate.

## P1: Automate AR Asset Optimization And Size Checks

What: Add checks that catch oversized or missing image/model assets before they ship.

Why: Mobile AR can feel broken if GLB, USDZ, poster, or texture assets are too large or invalid.

Context: The first slice should use manually optimized assets and a simple mobile budget. Once more samples or dynamic generation exist, add automated validation for file existence, file size, and possibly model integrity so future assets do not silently slow down phone testing.

Depends on / blocked by: Static sample should work first; this becomes more important when multiple samples or generated assets are added.

## P1: Create A Device Support Matrix

What: Document tested devices, browsers, AR mode used, placement quality, known limits, and fallback behavior.

Why: WebAR behavior differs across iPhone Safari, Android Chrome, desktop browsers, and unsupported devices. The project needs durable device knowledge once testing produces real results.

Context: Keep the demo narrow until real-device testing proves what works. After real-device testing, turn those results into a README support matrix for open-source users and contributors.

Depends on / blocked by: Real iPhone and Android testing must produce enough results to document honestly.
