import { expect, test, type APIResponse, type Page } from "@playwright/test";

const BANNED_RENDERED_TERMS = [
  /\bConvex\b/i,
  /\bClerk\b/i,
  /\btoken\b/i,
  /\bbundle\b/i,
  /\bbuilder\b/i,
  /\bslug\b/i,
  /\bGLB\b/i,
  /\bUSDZ\b/i,
  /\bmetadata\b/i,
  /\bassets\b/i,
  /\bQA\b/i,
  /\bvalidation\b/i,
  /\bnormalized\b/i,
  /\brequested preview\b/i,
  /\bpublic lead link\b/i,
  /\braw token\b/i,
  /\bAR preview\b/i,
  /\bbuyer\b/i,
  /\bcustomer\b/i,
  /\buploaded\b/i,
  /\bgenerating\b/i,
  /\brejected\b/i,
  /\brevoked\b/i
];

async function assetByteLength(response: APIResponse) {
  const contentLength = response.headers()["content-length"];

  if (contentLength) {
    return Number(contentLength);
  }

  return (await response.body()).length;
}

async function expectNoBannedRenderedTerms(page: Page) {
  const bodyText = await page.locator("body").innerText();

  for (const bannedTerm of BANNED_RENDERED_TERMS) {
    expect.soft(bodyText).not.toMatch(bannedTerm);
  }
}

test("homepage renders a static artwork presentation with native AR assets", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "See how a print looks on your wall before you buy." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create preview" })).toHaveAttribute("href", "/admin/new");
  await expect(page.getByTestId("static-artwork-preview")).toBeVisible();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Chicago Final 1");
  await expect(page.getByText(/\d+\s*x\s*\d+\s*cm/i)).toHaveCount(0);
  await expect(page.getByText(/\d+\s*cm wide x \d+\s*cm tall/i)).toHaveCount(0);
  await expect(page.getByText("AR diagnostics")).toHaveCount(0);
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("src", "/ar/chicago-final-1.glb");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ios-src", "/ar/chicago-final-1.usdz");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-placement", "wall");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-scale", "fixed");
  await expect(page.getByTestId("ar-launcher-model")).not.toHaveAttribute("camera-controls", "");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/chicago-final-1.usdz#allowsContentScaling=0");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("rel", "ar");
  await expect(page.locator('[data-testid="quick-look-link"] > img')).toHaveAttribute("src", "/artworks/chicago-final-1.png");
  await expect(page.locator('[data-testid="quick-look-link"] > img')).toHaveClass(/sr-only/);
  await expect(page.getByTestId("ar-access-tooltip-trigger")).toHaveCount(0);
  await expect(page.getByTestId("ar-launcher-model")).toHaveCount(1);
  await expect(page.getByText("The gallery uses real GLB/USDZ wall-placement assets.")).toHaveCount(0);
  await expect(page.getByText("Camera not started")).toHaveCount(0);
  await expect(page.getByText("Picture mode")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Check out work" })).toBeVisible();
  await expect(page.getByTestId("work-video")).toHaveCount(3);
  await expect(page.locator('[data-testid="work-video"] source')).toHaveCount(3);
  await expect(page.locator('[data-testid="work-video"] source').nth(0)).toHaveAttribute("src", "/work-videos/wall-print-1.mp4");
  await expect(page.locator('[data-testid="work-video"] source').nth(1)).toHaveAttribute("src", "/work-videos/wall-print-2.mp4");
  await expect(page.locator('[data-testid="work-video"] source').nth(2)).toHaveAttribute("src", "/work-videos/wall-print-3.mp4");
  await expect(page.getByRole("link", { name: "Watch on Instagram" })).toHaveCount(0);
  await expectNoBannedRenderedTerms(page);
});

test.describe("mobile homepage layout", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 }
  });

  test("keeps the header and artwork controls spaced without covering the print", async ({ page }) => {
    await page.goto("/");

    const metrics = await page.evaluate(() => {
      const artwork = document.querySelector('[data-testid="static-artwork-preview"]');
      const controls = document.querySelector('[data-testid="artwork-controls"]');
      const header = document.querySelector("header");
      const heading = document.querySelector("h1");

      if (!artwork || !controls || !header || !heading) {
        throw new Error("Expected mobile hero elements were not rendered.");
      }

      const artworkRect = artwork.getBoundingClientRect();
      const controlsRect = controls.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(artworkRect.bottom, controlsRect.bottom) - Math.max(artworkRect.top, controlsRect.top));

      return {
        controlsTop: controlsRect.top,
        headerLeft: headerRect.left,
        headerRight: headerRect.right,
        headingLeft: headingRect.left,
        headingRight: headingRect.right,
        overlap,
        printBottom: artworkRect.bottom,
        viewportWidth: window.innerWidth
      };
    });

    expect(metrics.overlap).toBeLessThanOrEqual(1);
    expect(metrics.controlsTop).toBeGreaterThan(metrics.printBottom);
    expect(metrics.headerLeft).toBeGreaterThanOrEqual(12);
    expect(metrics.headerRight).toBeLessThanOrEqual(metrics.viewportWidth - 12);
    expect(metrics.headingLeft).toBeGreaterThanOrEqual(12);
    expect(metrics.headingRight).toBeLessThanOrEqual(metrics.viewportWidth - 12);
  });
});

test("bottom controls cycle the selected picture and native AR target", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Chicago Final 2");
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-2.png");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("src", "/ar/chicago-final-2.glb");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ios-src", "/ar/chicago-final-2.usdz");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/chicago-final-2.usdz#allowsContentScaling=0");
  await expect(page.locator('[data-testid="quick-look-link"] > img')).toHaveAttribute("src", "/artworks/chicago-final-2.png");
  await expect(page.locator('[data-testid="quick-look-link"] > img')).toHaveClass(/sr-only/);

  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Chicago Final 3");
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-3.png");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/chicago-final-3.usdz#allowsContentScaling=0");

  await page.getByTestId("previous-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Chicago Final 2");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/chicago-final-2.usdz#allowsContentScaling=0");
});

test.describe("AR launcher access guidance", () => {
  test.describe("desktop browser", () => {
    test.use({
      hasTouch: false,
      isMobile: false,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 }
    });

    test("warns desktop users to open the link on iPhone or iPad Safari", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByTestId("ar-access-tooltip-trigger")).toHaveCount(0);
      await expect(page.getByTestId("quick-look-link")).not.toHaveAttribute("aria-disabled", "true");
      await expect(page.getByTestId("quick-look-link")).toHaveAttribute("title", "Requires iPhone Safari.");
      await expect(page.locator('[data-testid="quick-look-link"] > img')).toHaveAttribute("src", "/artworks/chicago-final-1.png");
      await expect(page.locator('[data-testid="quick-look-link"] > img')).toHaveClass(/sr-only/);
      await page.getByTestId("quick-look-link").hover();
      await expect(page.getByTestId("ar-access-warning")).toContainText("Requires iPhone Safari.");

      await page.getByTestId("quick-look-link").click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Open this on iPhone Safari" })).toBeVisible();
      await expect(page.getByText("This wall placement only works on iPhone in Safari.")).toBeVisible();
      await page.getByRole("button", { name: "Dismiss" }).click();
      await expect(page.getByRole("heading", { name: "Open this on iPhone Safari" })).toHaveCount(0);
    });
  });

  test.describe("iPhone Safari browser", () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 }
    });

    test("shows placement reset guidance before continuing to AR", async ({ page }) => {
      await page.goto("/");

      await page.getByTestId("quick-look-link").click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Before you place it" })).toBeVisible();
      await expect(page.getByText("If the print disappears or drifts, tap Object, then AR to reset the placement view.")).toBeVisible();
      await expect(page.locator("strong").filter({ hasText: "Object" })).toBeVisible();
      await expect(page.locator("strong").filter({ hasText: "AR" })).toBeVisible();
      await expect(page.getByTestId("continue-to-ar-link")).toHaveAttribute("href", "/ar/chicago-final-1.usdz#allowsContentScaling=0");
      await expect(page.getByTestId("continue-to-ar-link")).toHaveAttribute("rel", "ar");
      await expect(page.locator('[data-testid="continue-to-ar-link"] > img')).toHaveAttribute("src", "/artworks/chicago-final-1.png");
      await expect(page.locator('[data-testid="continue-to-ar-link"] > img')).toHaveClass(/sr-only/);
    });
  });

  test.describe("iPhone non-Safari browser", () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/143.0.0.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 }
    });

    test("tells iPhone Chrome users to switch to Safari", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByTestId("ar-access-tooltip-trigger")).toHaveCount(0);
      await expect(page.getByTestId("quick-look-link")).not.toHaveAttribute("aria-disabled", "true");
      await expect(page.getByTestId("quick-look-link")).toHaveAttribute("title", "Use Safari on iPhone.");
      await expect(page.locator('[data-testid="quick-look-link"] > img')).toHaveAttribute("src", "/artworks/chicago-final-1.png");
      await expect(page.locator('[data-testid="quick-look-link"] > img')).toHaveClass(/sr-only/);
      await page.getByTestId("quick-look-link").hover();
      await expect(page.getByTestId("ar-access-warning")).toContainText("Use Safari on iPhone.");

      await page.getByTestId("quick-look-link").click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Use Safari on this iPhone" })).toBeVisible();
      await expect(page.getByText("This wall placement only works on iPhone in Safari.")).toBeVisible();
      await page.getByRole("button", { name: "Dismiss" }).click();
      await expect(page.getByRole("heading", { name: "Use Safari on this iPhone" })).toHaveCount(0);
    });
  });

  test.describe("unknown touch browser", () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      userAgent: "Mozilla/5.0 (Linux; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Mobile",
      viewport: { width: 820, height: 1180 }
    });

    test("shows an uncertainty warning when the browser cannot be confirmed", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByTestId("ar-access-tooltip-trigger")).toHaveCount(0);
      await expect(page.getByTestId("quick-look-link")).not.toHaveAttribute("aria-disabled", "true");
      await expect(page.getByTestId("quick-look-link")).toHaveAttribute("title", "Browser not confirmed.");
      await page.getByTestId("quick-look-link").hover();
      await expect(page.getByTestId("ar-access-warning")).toContainText("Browser not confirmed.");

      await page.getByTestId("quick-look-link").click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Browser not confirmed" })).toBeVisible();
      await expect(page.getByText("We could not confirm that this is iPhone Safari.")).toBeVisible();
    });
  });
});

test("old picture mode route is removed", async ({ page }) => {
  const response = await page.goto("/picture-mode");

  expect(response?.status()).toBe(404);
});

test("public preview route renders a ready seeded artwork", async ({ page }) => {
  await page.goto("/preview/chicago-final-1");

  await expect(page.getByRole("heading", { name: "See it on your wall." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Wall Print Pro" })).toHaveAttribute("href", "/");
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Chicago Final 1");
  await expect(page.getByTestId("previous-artwork")).toHaveCount(0);
  await expect(page.getByTestId("next-artwork")).toHaveCount(0);
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute(
    "href",
    /(?:\/ar\/chicago-final-1\.usdz|\/api\/storage\/|https?:\/\/[^#]+\/api\/storage\/)[^#]*#allowsContentScaling=0/
  );
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-placement", "wall");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-scale", "fixed");
  await expect(page.getByText("ready to place at")).toHaveCount(0);
  await expect(page.getByText(/\d+\s*x\s*\d+\s*cm/i)).toHaveCount(0);
  await expect(page.getByText(/\d+\s*cm wide x \d+\s*cm tall/i)).toHaveCount(0);
  await expect(page.getByText("no-auth public lead page")).toHaveCount(0);
  await expect(page.getByText("AR diagnostics")).toHaveCount(0);
  await expect(page.getByText("Generate client link")).toHaveCount(0);
  await expect(page.getByText("Upload new picture")).toHaveCount(0);
  await expect(page.getByTestId("work-videos-section")).toHaveCount(0);
  await expectNoBannedRenderedTerms(page);

  await page.getByRole("link", { name: "Wall Print Pro" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "See how a print looks on your wall before you buy." })).toBeVisible();
});

test("public preview route renders an unavailable state for missing Convex assets", async ({ page }) => {
  await page.goto("/preview/not-seeded");

  await expect(page.getByText("This client preview is not available.")).toBeVisible();
  await expect(page.getByTestId("preview-unavailable-reason")).toContainText("This client preview is unavailable. Ask for a fresh invite link.");
  await expect(page.getByText("Requested preview")).toHaveCount(0);
  await expectNoBannedRenderedTerms(page);
});

test("admin routes block anonymous dashboard access", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByText(/The admin workspace is unavailable\.|Sign in to Wall Print Pro|Sign in to Wallprintpro/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Client preview links" })).toHaveCount(0);
  if (await page.getByText("The admin workspace is unavailable.").isVisible()) {
    await expectNoBannedRenderedTerms(page);
  }
});

test("invite upload routes show a setup blocker until setup is available", async ({ page }) => {
  await page.goto("/invite/not-a-real-token");

  await expect(page.getByText("This invite page is unavailable.")).toBeVisible();
  await expect(page.getByText("Ask the admin to refresh the setup before using this invite link.")).toBeVisible();
  await expect(page.getByText("Admin workspace")).toHaveCount(0);
  await expectNoBannedRenderedTerms(page);
});

test("legacy route aliases redirect to admin and invite language", async ({ page }) => {
  await page.goto("/seller");
  await expect(page).toHaveURL(/\/admin$|\/sign-in\?redirect_url=.*%2Fadmin/);

  await page.goto("/builder/not-a-real-token");
  await expect(page).toHaveURL(/\/invite\/not-a-real-token$/);
});

test("static Phase 0 asset routes expose expected AR headers and size budgets", async ({ page }) => {
  const glb = await page.request.get("/ar/chicago-final-1.glb");
  const usdz = await page.request.get("/ar/chicago-final-1.usdz");
  const poster = await page.request.get("/artworks/chicago-final-1.png");

  expect(glb.status()).toBe(200);
  expect(glb.headers()["content-type"]).toContain("model/gltf-binary");
  expect(await assetByteLength(glb)).toBeLessThanOrEqual(4_250_000);

  expect(usdz.status()).toBe(200);
  expect(usdz.headers()["content-type"]).toContain("model/vnd.usdz+zip");
  expect(await assetByteLength(usdz)).toBeLessThanOrEqual(4_250_000);

  expect(poster.status()).toBe(200);
  expect(poster.headers()["content-type"]).toContain("image/png");
  expect(await assetByteLength(poster)).toBeLessThanOrEqual(4_250_000);
});
