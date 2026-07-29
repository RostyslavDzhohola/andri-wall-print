# Vercel retirement record — 2026-07-29

## Retired production baseline

- Vercel team: `team_v9WDwNXh5b0CBiqCY7GNNS4Y`
- Vercel project: `wallprint-pro`
- Vercel project ID: `prj_uk2e8hNxPWeCQWkjggNoib8MVqrg`
- Final Vercel production deployment ID:
  `dpl_DF6kF2EnvQWqHoW8W8V2AzgkrRqs`
- Final Vercel production source:
  `e790bc8fc085fdf28e2079d085022898032d918e`
- Durable source tag: `archive/vercel-production-2026-07-29`
- Vercel Blob store: `wallprint-pro-work-videos`
  (`store_tU8DyRkPPxcttPj1`, 6 files, 77.83 MB)

The Vercel project did not own `www.thewallprintpro.com` at retirement. Its
remaining domains were Vercel-generated aliases.

## Retirement completion

- The six Blob objects were downloaded and checksummed before deletion.
- Blob store `store_tU8DyRkPPxcttPj1` was emptied and deleted.
- Vercel project `prj_uk2e8hNxPWeCQWkjggNoib8MVqrg` was permanently deleted.
- A follow-up project lookup returned 404 and the project was absent from the
  team's project list.
- The ignored `.vercel` project link was moved to
  `.rollback/vercel-2026-07-29/local-project-link/`.
- While removing the store, the Vercel CLI refreshed the ignored local
  `.env.local` `CONVEX_DEPLOYMENT` entry from the project's development
  environment.
- The Vercel CLI added a development `VERCEL_OIDC_TOKEN` while deleting the
  Blob store; that transient token was removed from `.env.local`.

## Blob backup integrity

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| `work-videos/wall-print-1-poster.jpg` | 113476 | `f04b2e4580b36dc89c781b924fc2c25fda6a6a351b7ccaa6b50c53e14534e96c` |
| `work-videos/wall-print-1.mp4` | 18258569 | `de62ceefd2c68b018f7c0fa1db312c799c999ef5bcce1f6a5c29a37c014dba91` |
| `work-videos/wall-print-2-poster.jpg` | 122801 | `bce61c3d52206b8f95bfeedb055bd212382bd95adc4fca91ead18ac58e862408` |
| `work-videos/wall-print-2.mp4` | 33809684 | `640133a9d3604d81e5405b8337595375eadd60faa8c56bc50e9dd64f9954ae3a` |
| `work-videos/wall-print-3-poster.jpg` | 138540 | `53442af71704502ebadf72b799b45496a5fe57be422c39a7251e69d00d00bbdf` |
| `work-videos/wall-print-3.mp4` | 29167176 | `66604abb28a96b2644f5b4c9ef1cb735993ce872d66f0c8eb25492185fc89a68` |

## Rollback paths

The primary rollback path is Sites version history. Sites version 5, sourced
from `fc7eb0e61621baf0ebd7e9ff2378e4eedf7cc130`, is the current production
version. Sites version 4, sourced from
`e142e9ec6ad7bc127dcad00f93d19f32c78071a0`, remains saved and can be
redeployed without reconstructing Vercel.

For a Vercel reconstruction:

1. Check out `archive/vercel-production-2026-07-29`.
2. Create and link a new Vercel project.
3. Restore the production environment from the ignored, owner-readable local
   snapshot `.env.vercel-production-rollback-2026-07-29.local`.
4. If the archived Vercel Blob media is needed, recreate a Blob store and
   upload the six files preserved under
   `.rollback/vercel-2026-07-29/blob/store_tU8DyRkPPxcttPj1/`.
5. Deploy the archived source and validate its generated Vercel URL.
6. Move the custom domain only if Sites itself cannot be restored.

The local environment snapshot contains secrets, and the Blob copy is a local
recovery artifact. Neither may be committed, shared, or printed.
