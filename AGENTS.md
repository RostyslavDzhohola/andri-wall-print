Never use npm. Use pnpm for installs, scripts, lockfiles, and docs.

Terminology:
- "You" means Codex, the builder, or other AI agents.
- "Seller" means the Wall Print Pro business and its people.
- "My client" means the seller or Wall Print Pro business this project is being built for.
- "Clients" or "users" means the leads Wall Print Pro wants to convert for wall-printing services.

Local server rules:
- Before starting a server, check whether one is already running and use it if it matches the task.
- Do not start `pnpm dev` unless the user deliberately asks for an interactive local app server.
- Do not use `next start` as a substitute for development mode during UI, admin, upload, refresh, or browser QA work.
- Use production serving only for smoke/e2e checks after `pnpm build`, and restart it after every rebuild.
