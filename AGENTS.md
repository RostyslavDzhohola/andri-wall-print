Never use npm. Use pnpm for installs, scripts, lockfiles, and docs. Convex CLI work is the exception: use `npx convex dev` for Convex dev sync/watch commands.

Convex deploy rule:
- The Convex deployment does not update itself. After ANY change under `convex/` (functions, schema) or to `lib/` modules imported by Convex functions, push it with `npx convex dev --once` before testing — otherwise the app calls stale or missing functions and features fail with misleading "unavailable" errors.
- During longer local sessions, prefer keeping `npx convex dev` running in watch mode; it re-pushes automatically on every change.

Terminology:
- "You" means Codex, the builder, or other AI agents.
- "Seller" means the Wall Print Pro business and its people.
- "My client" means the seller or Wall Print Pro business this project is being built for.
- "Clients" or "users" means the leads Wall Print Pro wants to convert for wall-printing services.

Local server rules:
- Before starting a server, check whether one is already running and use it if it matches the task.
- Do not start `pnpm dev` unless the user deliberately asks for an interactive local app server.
- When testing this project locally, run the full local stack: the app on localhost, an ngrok tunnel for phone testing, and Convex dev with `npx convex dev`.
- Do not use `next start` as a substitute for development mode during UI, admin, upload, refresh, or browser QA work.
- Use production serving only for smoke/e2e checks after `pnpm build`, and restart it after every rebuild.
- Before presenting preview examples or asking for review, verify the preview URL is live, renders meaningful content, and the relevant interaction works.
