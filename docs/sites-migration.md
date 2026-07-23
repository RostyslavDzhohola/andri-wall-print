# Wall Print Pro Sites migration

## Scope and outputs

This migration moves the public Wall Print Pro site from its existing Vercel
deployment to ChatGPT Sites without disabling the existing Vercel deployment
during the cutover.

The migration produces:

- a Sites-compatible Cloudflare Worker build in `dist/`;
- `.openai/hosting.json` containing only the Sites project ID;
- browser-ready derivatives under `public/media/wall-print-pro/`;
- `public/media/wall-print-pro/manifest.json`, including source names, public
  derivative paths, byte sizes, and SHA-256 hashes;
- a public production Sites URL;
- a validated route, interaction, responsive-layout, and media checklist; and
- a manual DNS/domain cutover note if the custom Wall Print Pro domain cannot
  be transferred automatically.

## Existing public application audit

The pre-migration application is a Next.js public marketing and lead-generation
site with:

- Homepage, Gallery/AR, Request, Reserved, Preview, Our Work, robots, and
  sitemap routes;
- Convex-backed lead requests, upload preparation, preview records, and
  lightweight reserved-visit logging;
- client-side AR handoff through checked-in GLB/USDZ assets;
- optional AI-concept request/status APIs that proxy Convex;
- optional Instagram Graph API and Meta embeds for public project media;
- Clerk wiring left from an earlier protected-admin architecture, although no
  admin/account/dashboard pages are present on this branch; and
- an ignored local `.vercel/` link, with no tracked `vercel.json` or Vercel
  runtime package.

The Sites build keeps the public/Convex and AR behavior, removes unused Clerk
runtime coupling from the public shell, and replaces external Meta project
media plus placeholder Our Work photography with the approved local media.

## Approved project-media policy

The approval authority is
`assets/wall-print-pro-media-decisions-2026-07-23.json`. The derivative builder
fails unless its Homepage and Our Work arrays exactly match that export in the
same order.

Raw originals remain under `assets/wall-print-pro-media/originals/` and are not
copied into `public/`, `dist/`, or the Sites deployment archive. Existing brand
marks, favicon assets, and AR model/artwork dependencies are functional product
assets, not client project-media additions.

Homepage project media:

1. `IMG_1646.HEIC`
2. `IMG_1598.HEIC`
3. `IMG_1595.HEIC`
4. `IMG_0024.MOV`

Our Work project media:

1. `IMG_1591.HEIC`
2. `IMG_1594.HEIC`
3. `IMG_0028.MOV`
4. `IMG_1635.MOV`
5. `IMG_1096.HEIC`
6. `IMG_1084.MOV`
7. `IMG_69553977-6292-4757-8270-14DD2E01CA21.JPEG`
8. `IMG_0773.MOV`
9. `IMG_1001.HEIC`
10. `IMG_0996.MOV`
11. `IMG_0229.MOV`
12. `IMG_0196.HEIC`
13. `IMG_0187.MOV`

All video/process examples that are not presented as completed installed work
are visibly labeled “Workshop demonstration.”
