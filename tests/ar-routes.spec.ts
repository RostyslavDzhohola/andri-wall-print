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

  await expect(page.getByRole("heading", { name: "See the final result before you put down your credit card." })).toBeVisible();
  await expect(page.getByText("You do not have to imagine it. Put your art on your wall right now")).toBeVisible();
  await expect(page.getByRole("link", { name: "Gallery" })).toHaveAttribute("href", "/gallery");
  await expect(page.getByRole("link", { name: "Request", exact: true })).toHaveAttribute("href", "/request");
  await expect(page.getByRole("link", { name: "Request a demo" })).toHaveAttribute("href", "/request");
  await expect(page.getByRole("link", { name: "Request wall preview" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Try artwork" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Reserve interest" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Call" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/dashboard");
  await expect(page.getByRole("link", { name: "Create preview" })).toHaveCount(0);
  await expect(page.getByText("Home and business walls")).toHaveCount(0);
  await expect(page.getByText("Seller-reviewed visuals")).toHaveCount(0);
  await expect(page.getByText("Human follow-up before quote")).toHaveCount(0);
  await expect(page.getByTestId("static-artwork-preview")).toBeVisible();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Pathways to Success");
  await expect(page.getByTestId("artwork-width-guide")).toHaveCount(0);
  await expect(page.getByTestId("artwork-height-guide")).toHaveCount(0);
  await expect(page.getByTestId("selected-artwork-size")).toHaveCount(0);
  await expect(page.getByText(/\d+\s*x\s*\d+\s*cm/i)).toHaveCount(0);
  await expect(page.getByText(/\d+\s*cm wide x \d+\s*cm tall/i)).toHaveCount(0);
  await expect(page.getByText("AR diagnostics")).toHaveCount(0);
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("src", "/ar/chicago-final-1.glb");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ios-src", "/ar/chicago-final-1.usdz");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-placement", "wall");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-scale", "fixed");
  await expect(page.getByTestId("ar-launcher-model")).not.toHaveAttribute("camera-controls", "");
  await expect(page.getByTestId("quick-look-link")).toHaveCount(0);
  await expect(page.getByTestId("share-to-phone")).toContainText("Send to iPhone");
  await expect(page.getByTestId("ar-access-tooltip-trigger")).toHaveCount(0);
  await expect(page.getByTestId("ar-launcher-model")).toHaveCount(1);
  await expect(page.getByText("The gallery uses real GLB/USDZ wall-placement assets.")).toHaveCount(0);
  await expect(page.getByText("Camera not started")).toHaveCount(0);
  await expect(page.getByText("Picture mode")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Built for the first wall-print conversation." })).toHaveCount(0);
  await expect(page.getByTestId("sales-pilot-proof")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Our work in the Chicago area" })).toBeVisible();
  await expect(page.getByText("Short clips from finished walls help leads connect the preview with the finished space.")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Turn the artwork into a wall demo before the estimate." })).toBeVisible();
  await expect(page.getByText("Bring the art")).toBeVisible();
  await expect(page.getByText("Demo it on your wall")).toBeVisible();
  await expect(page.getByText("Book an estimate")).toBeVisible();
  await expect(page.getByTestId("sales-pilot-process")).toBeVisible();
  await expect(page.getByTestId("work-video")).toHaveCount(3);
  await expect(page.getByTestId("work-video").first()).not.toHaveAttribute("controls", "");
  await expect(page.getByTestId("work-video").first()).toHaveAttribute("muted", "");
  await expect(page.getByTestId("work-video").first()).toHaveAttribute("loop", "");
  await expect(page.locator('[data-testid="work-video"] source')).toHaveCount(3);
  await expect(page.locator('[data-testid="work-video"] source').nth(0)).toHaveAttribute("src", /\/work-videos\/wall-print-1\.mp4$/);
  await expect(page.locator('[data-testid="work-video"] source').nth(1)).toHaveAttribute("src", /\/work-videos\/wall-print-2\.mp4$/);
  await expect(page.locator('[data-testid="work-video"] source').nth(2)).toHaveAttribute("src", /\/work-videos\/wall-print-3\.mp4$/);
  await expect(page.getByRole("link", { name: "Watch on Instagram" })).toHaveCount(0);
  await expectNoBannedRenderedTerms(page);
});

test("gallery route lets users choose existing artwork for wall placement", async ({ page }) => {
  await page.goto("/gallery");

  await expect(page.getByRole("heading", { name: "Choose artwork to see on your wall." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Go back" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/dashboard");
  await expect(page.getByRole("link", { name: "Saved previews" })).toHaveCount(0);
  await expect(page.getByTestId("gallery-artwork-card")).toHaveCount(6);
  await expect(page.getByTestId("gallery-selected-artwork-title")).toHaveText("Pathways to Success");
  await expect(page.getByTestId("gallery-selected-artwork")).toHaveAttribute("src", "/artworks/chicago-final-1.png");
  await expect(page.getByTestId("gallery-selected-print-size")).toHaveText("5 ft x 4.2 ft");
  await expect(page.getByText("Try this artwork")).toHaveCount(0);
  await expect(page.getByText("Selected", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("share-to-phone")).toContainText("Send to iPhone");

  await page.getByTestId("gallery-next-artwork").click();
  await expect(page.getByTestId("gallery-selected-artwork-title")).toHaveText("Lakefront Day");
  await expect(page.getByTestId("gallery-selected-artwork")).toHaveAttribute("src", "/artworks/chicago-final-2.png");
  await expect(page.getByTestId("gallery-selected-print-size")).toHaveText("3 ft x 5 ft");

  await page.getByTestId("gallery-previous-artwork").click();
  await expect(page.getByTestId("gallery-selected-artwork-title")).toHaveText("Pathways to Success");

  await page.getByRole("button", { name: /Ember Dragon/ }).click();

  await expect(page.getByTestId("gallery-selected-artwork-title")).toHaveText("Ember Dragon");
  await expect(page.getByTestId("gallery-selected-artwork")).toHaveAttribute("src", "/artworks/dragon-wall-print.png");
  await expect(page.getByTestId("gallery-selected-print-size")).toHaveText("1.5 ft x 3 ft");
  await expect(page.locator('[data-artwork-id="dragon-wall-print"]')).toHaveAttribute("aria-pressed", "true");
  await expectNoBannedRenderedTerms(page);
});

test.describe("mobile gallery layout", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 }
  });

  test("keeps the gallery header controls inside the viewport", async ({ page }) => {
    await page.goto("/gallery");

    await expect(page.getByRole("button", { name: "Go back" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/dashboard");

    const metrics = await page.evaluate(() => {
      const header = document.querySelector("header");
      const heading = document.querySelector("h1");

      if (!header || !heading) {
        throw new Error("Expected gallery header elements were not rendered.");
      }

      const headerRect = header.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();

      return {
        headerLeft: headerRect.left,
        headerRight: headerRect.right,
        headingLeft: headingRect.left,
        headingRight: headingRect.right,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth
      };
    });

    expect(metrics.headerLeft).toBeGreaterThanOrEqual(12);
    expect(metrics.headerRight).toBeLessThanOrEqual(metrics.viewportWidth - 12);
    expect(metrics.headingLeft).toBeGreaterThanOrEqual(12);
    expect(metrics.headingRight).toBeLessThanOrEqual(metrics.viewportWidth - 12);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  });
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

  test("uses tap press to play and pause work videos on touch screens", async ({ page }) => {
    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);

      window.matchMedia = ((query: string) => {
        if (query.includes("(hover: hover)") || query.includes("(pointer: fine)")) {
          return {
            matches: false,
            media: query,
            onchange: null,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent: () => true
          } as MediaQueryList;
        }

        return originalMatchMedia(query);
      }) as typeof window.matchMedia;

      Object.defineProperty(HTMLMediaElement.prototype, "paused", {
        configurable: true,
        get: function (this: HTMLMediaElement) {
          return this.dataset.testPlaying !== "true";
        }
      });

      HTMLMediaElement.prototype.play = function () {
        this.dataset.testPlaying = "true";
        this.dispatchEvent(new Event("play"));
        return Promise.resolve();
      };

      HTMLMediaElement.prototype.pause = function () {
        this.dataset.testPlaying = "false";
        this.dispatchEvent(new Event("pause"));
      };
    });

    await page.goto("/");

    const card = page.getByTestId("work-video-card").first();
    const video = page.getByTestId("work-video").first();

    await card.hover({ force: true });
    await expect(video).not.toHaveAttribute("data-test-playing", "true");

    await card.click();
    await expect(video).toHaveAttribute("data-test-playing", "true");
    await expect(card).toHaveAttribute("aria-label", "Pause Chicago wall print work clip 1");

    await card.click();
    await expect(video).toHaveAttribute("data-test-playing", "false");
    await expect(card).toHaveAttribute("aria-label", "Play Chicago wall print work clip 1");
  });
});

test("bottom controls cycle the selected picture and native AR target", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Lakefront Day");
  await expect(page.getByTestId("selected-artwork-size")).toHaveCount(0);
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-2.png");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("src", "/ar/chicago-final-2.glb");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ios-src", "/ar/chicago-final-2.usdz");
  await expect(page.getByTestId("share-to-phone")).toContainText("Send to iPhone");

  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("River Train Crossing");
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-3.png");

  await page.getByTestId("previous-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Lakefront Day");
  await expect(page.getByTestId("share-to-phone")).toContainText("Send to iPhone");
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

    test("shows only the phone-share action for desktop users", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByTestId("ar-access-tooltip-trigger")).toHaveCount(0);
      await expect(page.getByTestId("quick-look-link")).toHaveCount(0);
      await expect(page.getByTestId("share-to-phone")).toBeVisible();
      await expect(page.getByTestId("share-to-phone")).toContainText("Send to iPhone");
      await page.getByTestId("share-to-phone").hover();
      await expect(page.getByText("Send this page to your iPhone.")).toBeVisible();
    });

    test("shares the active ngrok URL from localhost", async ({ page }) => {
      await page.route("**/api/dev-public-origin", async (route) => {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ origin: "https://wall-demo.ngrok-free.dev", source: "ngrok" })
        });
      });
      await page.addInitScript(() => {
        Object.defineProperty(window.navigator, "share", {
          configurable: true,
          value: async (data: ShareData) => {
            (window as Window & { __sharedData?: ShareData }).__sharedData = data;
          }
        });
      });

      await page.goto("/gallery");
      await page.getByTestId("share-to-phone").click();

      await expect
        .poll(() => page.evaluate(() => (window as Window & { __sharedData?: ShareData }).__sharedData?.url))
        .toBe("https://wall-demo.ngrok-free.dev/gallery");
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

    test("keeps iPhone Safari on the direct Quick Look link", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/chicago-final-1.usdz#allowsContentScaling=0");
      await expect(page.getByTestId("quick-look-link")).toHaveAttribute("rel", "ar");
      await expect(page.getByTestId("quick-look-link")).toContainText("Place on wall");
      await expect(page.getByTestId("share-to-phone")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Before you place it" })).toHaveCount(0);
      await expect(page.getByTestId("continue-to-ar-link")).toHaveCount(0);
    });

    test("warns if a Safari-looking iPhone browser does not launch Quick Look", async ({ page }) => {
      await page.addInitScript(() => {
        const originalSupports = DOMTokenList.prototype.supports;

        Object.defineProperty(DOMTokenList.prototype, "supports", {
          configurable: true,
          value(this: DOMTokenList, token: string) {
            if (token === "ar") {
              return true;
            }

            return originalSupports?.call(this, token) ?? false;
          }
        });

        window.addEventListener(
          "click",
          (event) => {
            const target = event.target;

            if (target instanceof Element && target.closest('[data-testid="quick-look-link"]')) {
              event.preventDefault();
            }
          },
          true
        );
      });

      await page.goto("/");

      await expect(page.getByTestId("quick-look-link")).toHaveAttribute("title", "Place this print on a wall");

      await page.getByTestId("quick-look-link").click();

      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Open in Safari to place on wall" })).toBeVisible();
      await expect(page.getByText("Wall placement did not start from this browser.")).toBeVisible();
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
      await expect(page.getByTestId("quick-look-link")).toContainText("Open in Safari");
      await expect(page.locator('[data-testid="quick-look-link"] > img')).toHaveClass(/sr-only/);
      await page.getByTestId("quick-look-link").hover();
      await expect(page.getByTestId("ar-access-warning")).toContainText("Use Safari on iPhone.");

      await page.getByTestId("quick-look-link").click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Use Safari on this iPhone" })).toBeVisible();
      await expect(page.getByText("This browser is not Safari, so wall placement will not start here.")).toBeVisible();
      await page.getByRole("button", { name: "Dismiss" }).click();
      await expect(page.getByRole("heading", { name: "Use Safari on this iPhone" })).toHaveCount(0);
    });
  });

  test.describe("iPhone Telegram browser", () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Telegram/10.15",
      viewport: { width: 390, height: 844 }
    });

    test("tells in-app browser users to switch to Safari", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByTestId("quick-look-link")).toHaveAttribute("title", "Use Safari on iPhone.");
      await expect(page.getByTestId("quick-look-link")).toContainText("Open in Safari");

      await page.getByTestId("quick-look-link").click();

      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Use Safari on this iPhone" })).toBeVisible();
      await expect(page.getByText("This browser is not Safari, so wall placement will not start here.")).toBeVisible();
    });
  });

  test.describe("unknown touch browser", () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      userAgent: "Mozilla/5.0 (Linux; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Mobile",
      viewport: { width: 820, height: 1180 }
    });

    test("shows only the phone-share action when the device is not an iPhone", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByTestId("ar-access-tooltip-trigger")).toHaveCount(0);
      await expect(page.getByTestId("quick-look-link")).toHaveCount(0);
      await expect(page.getByTestId("share-to-phone")).toContainText("Send to iPhone");
    });
  });
});

test("old picture mode route is removed", async ({ page }) => {
  const response = await page.goto("/picture-mode");

  expect(response?.status()).toBe(404);
});

test("public preview route renders a ready seeded artwork", async ({ page }) => {
  await page.goto("/preview/chicago-final-1");

  await expect(page.getByRole("heading", { name: "Open on iPhone Safari." })).toBeVisible();
  await expect(page.getByText("To see the wall preview, open this same link in Safari on an iPhone.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Wall Print Pro" })).toHaveAttribute("href", "/");
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Pathways to Success");
  await expect(page.getByText("File name")).toBeVisible();
  await expect(page.getByTestId("public-confirmation-file-name")).toHaveText("Pathways to Success");
  await expect(page.getByTestId("public-confirmation-dimensions")).toHaveCount(0);
  await expect(page.getByTestId("previous-artwork")).toHaveCount(0);
  await expect(page.getByTestId("next-artwork")).toHaveCount(0);
  await expect(page.getByTestId("quick-look-link")).toHaveCount(0);
  await expect(page.getByTestId("share-to-phone")).toContainText("Send to iPhone");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-placement", "wall");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-scale", "fixed");
  await expect(page.getByTestId("artwork-width-guide")).toHaveCount(0);
  await expect(page.getByTestId("artwork-height-guide")).toHaveCount(0);
  await expect(page.getByTestId("selected-artwork-size")).toHaveCount(0);
  await expect(page.getByTestId("selected-print-size")).toHaveCount(0);
  await expect(page.getByTestId("selected-print-area")).toHaveCount(0);
  await expect(page.getByText("is ready. Use Place on wall to judge the fit in the real room.")).toHaveCount(0);
  await expect(page.getByText("ready to place at")).toHaveCount(0);
  await expect(page.getByText("no-auth public lead page")).toHaveCount(0);
  await expect(page.getByText("AR diagnostics")).toHaveCount(0);
  await expect(page.getByText("Generate client link")).toHaveCount(0);
  await expect(page.getByText("Upload new picture")).toHaveCount(0);
  await expect(page.getByTestId("work-videos-section")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/\$\d/);
  await expectNoBannedRenderedTerms(page);

  await page.getByRole("link", { name: "Wall Print Pro" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "See the final result before you put down your credit card." })).toBeVisible();
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

test("buyer account route shows a setup blocker until account runtime is available", async ({ page }) => {
  await page.goto("/account");

  await expect(page.getByRole("heading", { name: "Saved previews are unavailable." })).toBeVisible();
  await expect(page.getByText("Ask Wall Print Pro to refresh the account setup before saving previews.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Client preview links" })).toHaveCount(0);
  await expect(page.getByText("Admin workspace")).toHaveCount(0);
  await expectNoBannedRenderedTerms(page);
});

test("dashboard dispatcher shows a setup blocker until account sign-in is available", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Account routing is unavailable." })).toBeVisible();
  await expect(page.getByText("Ask Wall Print Pro to refresh the account setup before opening a dashboard.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open gallery" })).toHaveAttribute("href", "/gallery");
  await expect(page.getByText("Admin workspace")).toHaveCount(0);
  await expectNoBannedRenderedTerms(page);
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
