import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3107",
    trace: "on-first-retry"
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // E2E must exercise worker/index.ts for AR content types and security headers.
        command:
          "node tests/fixtures/fake-convex-gallery-server.mjs & fake_convex_pid=$!; trap 'kill $fake_convex_pid 2>/dev/null || true' 0; CONVEX_URL=http://127.0.0.1:3110 NEXT_PUBLIC_CONVEX_URL= NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= CLERK_PUBLISHABLE_KEY= CLERK_SECRET_KEY= CLERK_JWT_ISSUER_DOMAIN= WALL_PRINT_PRO_SELLER_EMAILS= WALL_PRINT_PRO_AI_CONCEPTS_ENABLED=1 WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED=1 PHASE0_PREVIEW_LOCAL_FALLBACK=1 pnpm build && CONVEX_URL=http://127.0.0.1:3110 NEXT_PUBLIC_CONVEX_URL= NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= CLERK_PUBLISHABLE_KEY= CLERK_SECRET_KEY= CLERK_JWT_ISSUER_DOMAIN= WALL_PRINT_PRO_SELLER_EMAILS= WALL_PRINT_PRO_AI_CONCEPTS_ENABLED=1 WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED=1 PHASE0_PREVIEW_LOCAL_FALLBACK=1 pnpm exec vinext start --port 3107",
        url: "http://127.0.0.1:3107",
        reuseExistingServer: false,
        timeout: 120_000
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-safari-shape",
      use: { ...devices["iPhone 15"] }
    }
  ]
});
