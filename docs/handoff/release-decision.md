# Wall Print Pro Release Decision

## Current candidate

- Decision: **NO-GO until the PR is reviewed, merged, and deployed as one recorded Sites/Convex pair.**
- Candidate scope: five existing local commits plus production-readiness hardening in the current PR.
- Production identities: Sites `appgprj_6a6193cce8e8819180ad8b803559fb80`; Convex production `gregarious-kookabura-23`.
- Product scope: a low-volume marketing website. Release QA prioritizes the public marketing funnel on phones, iPads, and desktops in Chrome and Safari; broad browser-lab and synthetic production-volume exercises are not release gates.
- Client approval: the current business claims, portfolio media, and public marketing copy are authorized for release as of 2026-08-12.

## Release blockers

- Record one reviewed Git commit against the exact Sites version and Convex production deployment.
- Deploy the current schema/functions to production Convex and point Sites at that deployment.
- Set AI/community flags explicitly and identically in Sites and Convex, then run the staged enablement checks.
- Publish and verify legal routes, approved NAP, self-canonical URLs, deterministic sitemap metadata, and security headers.
- Complete approved production-write/credit checks and real iPhone/Android AR checks in their separately owned checklist items.
- Complete client approval of pricing, payment policy, and go-live.

## Deferred non-blocking work

- Browser QA outside Chrome and Safari is excluded by owner decision.
- Deterministic local fixtures cover gallery pagination beyond 24 entries; fake public production records are unnecessary for this low-volume marketing release.
- The missing-Convex friendly failure component is covered by a regression test; a separately hosted intentionally disconnected runtime is unnecessary.
- Review whether Convex's platform-level public-storage CORS policy can be narrowed without breaking public AR assets.
- Schedule dependency upgrades separately from this tested release.
- Visual polish and future gallery enhancements must not be treated as release evidence.

Every release attempt must update this record with candidate commit, Sites version, Convex deployment, flag values, operator, timestamp, automated results, manual smoke evidence, and rollback version.
