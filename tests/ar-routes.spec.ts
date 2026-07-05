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

async function expectWallPlacementEntryPoint(page: Page, expectedQuickLookHref?: string) {
  const quickLook = page.getByTestId("quick-look-link");
  const shareToPhone = page.getByTestId("share-to-phone");

  await expect
    .poll(async () => {
      if ((await quickLook.count()) > 0) {
        return "quick-look";
      }

      if ((await shareToPhone.count()) > 0) {
        return "share";
      }

      return "none";
    })
    .not.toBe("none");

  if ((await quickLook.count()) > 0) {
    await expect(quickLook).toContainText("Place on wall");
    await expect(quickLook).toHaveAttribute("rel", "ar");

    if (expectedQuickLookHref) {
      await expect(quickLook).toHaveAttribute("href", expectedQuickLookHref);
    }

    await expect(shareToPhone).toHaveCount(0);
    return;
  }

  await expect(shareToPhone).toContainText("Send to iPhone");
  await expect(quickLook).toHaveCount(0);
}

test("homepage renders a static artwork presentation with native AR assets", async ({ page }) => {
  await page.goto("/");

  // Approved C2 homepage: trust/education build, generation is the headline.
  await expect(page.getByRole("heading", { name: "Not wallpaper. Not vinyl. Printed straight onto your wall." })).toBeVisible();
  await expect(page.getByText("Custom wall printing in Chicago.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Gallery" })).toHaveAttribute("href", "/gallery");
  await expect(page.getByRole("link", { name: "Our work" })).toHaveAttribute("href", "/work");
  await expect(page.getByTestId("home-nav-reserve")).toBeVisible();
  // Three-entry chooser: describe is the default active entry; email + prompt visible.
  await expect(page.getByTestId("homepage-entry-choose")).toBeVisible();
  await expect(page.getByTestId("homepage-entry-upload")).toBeVisible();
  await expect(page.getByTestId("homepage-entry-describe")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("homepage-concept-generate")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
  await page.getByLabel("Describe your wall-print idea").fill("Gold leaf logo wall");
  await expect(page.getByLabel("Describe your wall-print idea")).toHaveValue("Gold leaf logo wall");
  await expect(page.getByTestId("homepage-proof-note")).toContainText("Pathways to Success");
  // Binding D10 licensing note appears where generation appears.
  await expect(page.getByText("printability confirmed at your estimate")).toBeVisible();
  // Choose-design entry reveals the gallery handoff with the selected sample.
  await page.getByTestId("homepage-entry-choose").click();
  await expect(page.getByTestId("homepage-selected-design-handoff")).toHaveAttribute("href", "/gallery?designId=chicago-final-1");
  // Upload entry reveals the contact-gated upload handoff.
  await page.getByTestId("homepage-entry-upload").click();
  await expect(page.getByTestId("homepage-upload-handoff")).toHaveAttribute("href", "/request?intent=concept#lead-upload-section");
  await page.getByTestId("homepage-entry-describe").click();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Request wall preview" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Try artwork" })).toHaveCount(0);
  await expect(page.getByTestId("static-artwork-preview")).toBeVisible();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Pathways to Success");
  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Lakefront Day");
  await expect(page.getByTestId("homepage-proof-note")).toContainText("Lakefront Day");
  // Selection propagates to the choose-design handoff.
  await page.getByTestId("homepage-entry-choose").click();
  await expect(page.getByTestId("homepage-selected-design-handoff")).toHaveAttribute("href", "/gallery?designId=chicago-final-2");
  await page.getByTestId("homepage-entry-describe").click();
  await page.getByTestId("previous-artwork").click();
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
  await expectWallPlacementEntryPoint(page, "/ar/chicago-final-1.usdz#allowsContentScaling=0");
  await expect(page.getByTestId("ar-access-tooltip-trigger")).toHaveCount(0);
  await expect(page.getByTestId("ar-launcher-model")).toHaveCount(1);
  await expect(page.getByText("The gallery uses real GLB/USDZ wall-placement assets.")).toHaveCount(0);
  await expect(page.getByText("Camera not started")).toHaveCount(0);
  await expect(page.getByText("Picture mode")).toHaveCount(0);
  await expect(page.getByTestId("sales-pilot-proof")).toHaveCount(0);
  // C2 hierarchy sections.
  await expect(page.getByRole("heading", { name: "Wall printing vs. everything else" })).toBeVisible();
  await expect(page.getByTestId("home-comparison")).toBeVisible();
  await expect(page.getByText("Yes — only us")).toBeVisible();
  await expect(page.getByTestId("home-testimonial")).toBeVisible();
  await expect(page.getByTestId("home-reserve-strip")).toBeVisible();
  await expect(page.getByTestId("home-reserve-cta")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent Chicago wall prints" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "From idea to installed in three steps." })).toBeVisible();
  await expect(page.getByText("Bring the art")).toBeVisible();
  await expect(page.getByTestId("home-process")).toBeVisible();
  await expect(page.getByTestId("home-footer")).toBeVisible();
  await expect(page.getByTestId("work-video")).toHaveCount(3);
  await expect(page.getByTestId("work-video").first()).not.toHaveAttribute("controls", "");
  await expect(page.getByTestId("work-video").first()).toHaveAttribute("muted", "");
  await expect(page.getByTestId("work-video").first()).toHaveAttribute("loop", "");
  await expect(page.locator('[data-testid="work-video"] source')).toHaveCount(3);
  await expect(page.locator('[data-testid="work-video"] source').nth(0)).toHaveAttribute("src", /\/work-videos\/wall-print-1\.mp4(?:\?.*)?$/);
  await expect(page.locator('[data-testid="work-video"] source').nth(1)).toHaveAttribute("src", /\/work-videos\/wall-print-2\.mp4(?:\?.*)?$/);
  await expect(page.locator('[data-testid="work-video"] source').nth(2)).toHaveAttribute("src", /\/work-videos\/wall-print-3\.mp4(?:\?.*)?$/);
  await expect(page.getByRole("link", { name: "Watch on Instagram" })).toHaveCount(0);
  await expectNoBannedRenderedTerms(page);
});

test("homepage concept flow polls until generated AR assets are ready", async ({ page }) => {
  const calls: Array<{ method: string; url: string; body?: unknown }> = [];

  await page.route("**/api/concept-art**", async (route) => {
    const request = route.request();
    calls.push({
      method: request.method(),
      url: request.url(),
      body: request.method() === "POST" ? request.postDataJSON() : undefined
    });

    if (request.method() === "POST") {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          code: "QUEUED",
          leadRequestId: "lead_hero_123",
          message: "Request saved. The concept draft is being prepared for seller review."
        })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        leadRequestId: "lead_hero_123",
        draftId: "draft_hero_123",
        status: "ready",
        message: "Artwork preview is ready for wall placement.",
        title: "Generated skyline concept",
        description: "Concept draft generated from a client request.",
        print: {
          aspectRatio: "6:5",
          widthMeters: 1.524,
          heightMeters: 1.27,
          label: "5 ft x 4.2 ft"
        },
        assets: {
          poster: "/artworks/chicago-final-1.png",
          glb: "/ar/chicago-final-1.glb",
          usdz: "/ar/chicago-final-1.usdz"
        }
      })
    });
  });

  await page.goto("/");
  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByLabel("Describe your wall-print idea").fill("Chicago skyline for a school lobby");
  await page.getByTestId("homepage-concept-generate").click();

  await expect(page.getByTestId("homepage-concept-status")).toContainText("Artwork preview is ready for wall placement.");
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Generated skyline concept");
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-1.png");
  await expectWallPlacementEntryPoint(page, "/ar/chicago-final-1.usdz#allowsContentScaling=0");
  expect(calls.map((call) => call.method)).toEqual(["POST", "GET"]);
  expect(calls[0].body).toMatchObject({
    contactEmail: "buyer@example.com",
    prompt: "Chicago skyline for a school lobby",
    selectedDesignId: "chicago-final-1"
  });
  expect(calls[1].url).toContain("leadRequestId=lead_hero_123");
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
  await expect(page.getByTestId("gallery-request-selected-design")).toHaveAttribute("href", "/request?intent=concept&designId=chicago-final-1");
  await expect(page.getByText("Try this artwork")).toHaveCount(0);
  await expect(page.getByText("Selected", { exact: true })).toHaveCount(0);
  await expectWallPlacementEntryPoint(page, "/ar/chicago-final-1.usdz#allowsContentScaling=0");

  await page.getByTestId("gallery-next-artwork").click();
  await expect(page.getByTestId("gallery-selected-artwork-title")).toHaveText("Lakefront Day");
  await expect(page.getByTestId("gallery-selected-artwork")).toHaveAttribute("src", "/artworks/chicago-final-2.png");
  await expect(page.getByTestId("gallery-selected-print-size")).toHaveText("3 ft x 5 ft");
  await expect(page.getByTestId("gallery-request-selected-design")).toHaveAttribute("href", "/request?intent=concept&designId=chicago-final-2");

  await page.getByTestId("gallery-previous-artwork").click();
  await expect(page.getByTestId("gallery-selected-artwork-title")).toHaveText("Pathways to Success");

  await page.getByRole("button", { name: /Ember Dragon/ }).click();

  await expect(page.getByTestId("gallery-selected-artwork-title")).toHaveText("Ember Dragon");
  await expect(page.getByTestId("gallery-selected-artwork")).toHaveAttribute("src", "/artworks/dragon-wall-print.png");
  await expect(page.getByTestId("gallery-selected-print-size")).toHaveText("1.5 ft x 3 ft");
  await expect(page.getByTestId("gallery-request-selected-design")).toHaveAttribute("href", "/request?intent=concept&designId=dragon-wall-print");
  await expect(page.locator('[data-artwork-id="dragon-wall-print"]')).toHaveAttribute("aria-pressed", "true");
  await expectNoBannedRenderedTerms(page);
});

test("homepage selected design opens the public gallery before the request gate", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("next-artwork").click();

  await page.getByTestId("homepage-entry-choose").click();
  await page.getByTestId("homepage-selected-design-handoff").click();

  await expect(page).toHaveURL(/\/gallery\?designId=chicago-final-2$/);
  await expect(page.getByRole("heading", { name: "Choose artwork to see on your wall." })).toBeVisible();
  await expect(page.getByTestId("gallery-selected-artwork-title")).toHaveText("Lakefront Day");
  await expectWallPlacementEntryPoint(page, "/ar/chicago-final-2.usdz#allowsContentScaling=0");
  await expect(page.getByTestId("gallery-request-selected-design")).toHaveAttribute("href", "/request?intent=concept&designId=chicago-final-2");
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
  await expectWallPlacementEntryPoint(page, "/ar/chicago-final-2.usdz#allowsContentScaling=0");

  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("River Train Crossing");
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-3.png");

  await page.getByTestId("previous-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Lakefront Day");
  await expectWallPlacementEntryPoint(page, "/ar/chicago-final-2.usdz#allowsContentScaling=0");
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
  await expectWallPlacementEntryPoint(page, "/ar/chicago-final-1.usdz#allowsContentScaling=0");
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
  await expect(page.getByRole("heading", { name: "Not wallpaper. Not vinyl. Printed straight onto your wall." })).toBeVisible();
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
