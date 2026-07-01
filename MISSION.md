# Mission: Safari ARKit Basics for Preview Picture

## Why
Learn the browser-facing AR basics behind Preview Picture so the Wall Print Pro preview flow can be built, debugged, and explained clearly. The immediate goal is to understand what Safari, AR Quick Look, USDZ assets, and native ARKit each own in the customer "Place on wall" experience.

## Success looks like
- Explain the Safari AR flow from `/preview/[slug]` to the native AR Quick Look viewer.
- Know which project files affect the iPhone Safari handoff, asset delivery, and fixed-size behavior.
- Decide when learning native iOS ARKit is useful versus when the web-based Quick Look path is enough.
- Debug basic failures such as wrong browser, wrong asset type, missing USDZ, incorrect content type, or resizable wall art.

## Constraints
- Keep lessons short, visual, and tied to this project.
- Prefer primary Apple, WebKit, and official library sources.
- Do not run `pnpm dev` unless explicitly requested.
- Use `pnpm` for project commands when commands are needed.

## Out of scope
- Building a native iOS app during the first lessons.
- Deep 3D modeling, advanced USD authoring, and Reality Composer Pro workflows until the Safari handoff is comfortable.
