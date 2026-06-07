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
        command:
          "CONVEX_URL= NEXT_PUBLIC_CONVEX_URL= PHASE0_PREVIEW_LOCAL_FALLBACK=1 pnpm build && CONVEX_URL= NEXT_PUBLIC_CONVEX_URL= PHASE0_PREVIEW_LOCAL_FALLBACK=1 pnpm exec next start -p 3107",
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
