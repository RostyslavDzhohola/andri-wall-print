import { expect, test, type APIResponse, type Page } from "@playwright/test";
import path from "node:path";

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

function expectedExperimentalSafariHref(page: Page) {
  return page.url().replace(/^https:/, "x-safari-https:").replace(/^http:/, "x-safari-http:");
}

async function expectNoBannedRenderedTerms(page: Page) {
  const bodyText = await page.locator("body").innerText();

  for (const bannedTerm of BANNED_RENDERED_TERMS) {
    expect.soft(bodyText).not.toMatch(bannedTerm);
  }
}

async function enableQuickLookRelSupport(page: Page) {
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
  });
}

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.name === "mobile-safari-shape") {
    await enableQuickLookRelSupport(page);
  }
});

async function expectWallPlacementEntryPoint(page: Page, expectedQuickLookHref?: string) {
  const quickLook = page.getByTestId("quick-look-link");
  const shareToPhone = page.getByTestId("share-to-phone");

  await expect
    .poll(async () => {
      if ((await quickLook.isVisible().catch(() => false)) && (await quickLook.getAttribute("aria-label")) !== "Checking") {
        return "quick-look";
      }

      if (await shareToPhone.isVisible().catch(() => false)) {
        return "share";
      }

      return "none";
    })
    .not.toBe("none");

  if ((await quickLook.isVisible().catch(() => false)) && (await quickLook.getAttribute("aria-label")) !== "Checking") {
    await expect(quickLook).toHaveAccessibleName("Place on wall");
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
  await expect(page.getByRole("heading", { name: "Custom murals printed directly on your wall in Chicago." })).toBeVisible();
  await expect(
    page.getByText(
      "Turn any plain wall into a custom mural in about a day, without wallpaper or vinyl. See it on your wall first with a free digital preview."
    )
  ).toBeVisible();
  await expect(page.getByText("Offices · restaurants · home feature walls.")).toBeVisible();
  const siteHeader = page.getByTestId("site-header");
  await expect(siteHeader.getByRole("link", { name: "Gallery", exact: true })).toHaveAttribute("href", "/gallery");
  await expect(siteHeader.getByRole("link", { name: "Our work", exact: true })).toHaveAttribute("href", "/work");
  await expect(page.getByTestId("home-nav-reserve")).toBeVisible();
  // Three-entry chooser: Describe opens on the compact email-first step.
  await expect(page.getByTestId("homepage-entry-choose")).toBeVisible();
  await expect(page.getByTestId("homepage-entry-upload")).toBeVisible();
  await expect(page.getByTestId("homepage-entry-describe")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(/Step [12] of 2/)).toHaveCount(0);
  await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
  await expect(page.getByTestId("homepage-describe-continue")).toHaveText("Continue");
  await expect(page.getByLabel("Describe your wall print")).toHaveCount(0);
  await expect(page.getByTestId("homepage-concept-generate")).toHaveCount(0);
  await page.getByLabel("Email", { exact: true }).fill("buyer@example.com");
  await page.getByTestId("homepage-describe-continue").click();
  await expect(page.getByText(/Step [12] of 2/)).toHaveCount(0);
  await page.getByLabel("Describe your wall print").fill("Gold leaf logo wall");
  await expect(page.getByLabel("Describe your wall print")).toHaveValue("Gold leaf logo wall");
  await expect(page.getByTestId("homepage-gallery-consent")).toBeVisible();
  await expect(page.getByLabel(/publicly display the AI-generated artwork anonymously/)).not.toBeChecked();
  await expect(page.getByLabel(/publicly display the AI-generated artwork anonymously/)).toHaveAttribute("required", "");
  await expect(page.getByTestId("homepage-proof-note")).toHaveCount(0);
  await expect(page.getByText("printability confirmed at your estimate")).toHaveCount(0);
  // Choose-design entry reveals the gallery handoff with the selected sample.
  await page.getByTestId("homepage-entry-choose").click();
  await expect(page.getByTestId("homepage-selected-design-handoff")).toHaveAttribute("href", "/gallery?designId=chicago-final-1");
  await expect(page.getByTestId("homepage-selected-design-handoff")).toContainText("Open gallery");
  // Upload entry stays on the homepage and reveals a direct file picker.
  await page.getByTestId("homepage-entry-upload").click();
  await expect(page.getByTestId("homepage-artwork-file")).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
  await expect(page.getByTestId("homepage-upload-handoff")).toHaveCount(0);
  await page.getByTestId("homepage-entry-describe").click();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Request wall preview" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Try artwork" })).toHaveCount(0);
  await expect(page.getByTestId("static-artwork-preview")).toBeVisible();
  await expect(page.getByTestId("selected-artwork-title")).toHaveCount(0);
  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-2.jpg");
  // Selection propagates to the choose-design handoff.
  await page.getByTestId("homepage-entry-choose").click();
  await expect(page.getByTestId("homepage-selected-design-handoff")).toHaveAttribute("href", "/gallery?designId=chicago-final-2");
  await page.getByTestId("homepage-entry-describe").click();
  await page.getByTestId("previous-artwork").click();
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-1.jpg");
  await expect(page.getByTestId("artwork-width-guide")).toHaveCount(0);
  await expect(page.getByTestId("artwork-height-guide")).toHaveCount(0);
  await expect(page.getByTestId("selected-artwork-size")).toHaveCount(0);
  await expect(page.getByText(/\d+\s*x\s*\d+\s*cm/i)).toHaveCount(0);
  await expect(page.getByText(/\d+\s*cm wide x \d+\s*cm tall/i)).toHaveCount(0);
  await expect(page.getByText("AR diagnostics")).toHaveCount(0);
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("src", "/api/ar/chicago-final-1.glb");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ios-src", "/api/ar/chicago-final-1.usdz");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-placement", "wall");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-scale", "fixed");
  await expect(page.getByTestId("ar-launcher-model")).not.toHaveAttribute("camera-controls", "");
  await expectWallPlacementEntryPoint(page, "/api/ar/chicago-final-1.usdz#allowsContentScaling=0");
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
  await expect(page.getByTestId("home-client-review")).toBeVisible();
  await expect(page.getByTestId("home-testimonial")).toBeVisible();
  await expect(page.getByTestId("home-testimonial")).toContainText(
    "Thanks guys! You guys did such an amazing job. Can’t wait to work with you again."
  );
  await expect(page.getByTestId("home-testimonial")).toContainText("@houseofhanainteriors");
  await expect(page.getByTestId("home-client-review").getByRole("blockquote")).toHaveCount(1);
  await expect(page.getByText("About 1 day")).toBeVisible();
  await expect(page.getByText("Free before you commit")).toBeVisible();
  await expect(page.getByText("Typical turnkey project")).toHaveCount(0);
  await expect(page.getByText("$500+ turnkey")).toHaveCount(0);
  await expect(page.getByText("Design, installation & cleanup")).toBeVisible();
  await expect(page.getByTestId("social-proof-homepage")).toHaveCount(0);
  await expect(page.getByTestId("facebook-proof-embed")).toHaveCount(0);
  await expect(page.getByTestId("instagram-proof-container")).toHaveCount(0);
  await expect(page.locator('iframe[src*="facebook.com"], iframe[src*="instagram.com"], blockquote.instagram-media')).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Feature" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Wall Print Pro" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Vinyl wrap" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Hand painted" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Wall print option comparison" })).toBeVisible();
  await expect(page.getByText("Wall Print Pro compared with vinyl wrap and hand-painted murals.")).toHaveCount(0);
  await expect(page.getByText("Customer testimonial coming soon.")).toHaveCount(0);
  await expect(page.getByText("Public project evidence")).toHaveCount(0);
  await expect(page.getByTestId("home-reserve-strip")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reserve your spot — $100" })).toBeVisible();
  await expect(page.getByTestId("home-reserve-strip").locator("strong")).toHaveText("credited to your print");
  await expect(page.getByTestId("home-reserve-cta")).toBeVisible();
  await expect(page.getByTestId("home-reserve-cta")).toContainText("Reserve spot — $100");
  await expect(page.getByRole("heading", { name: "From idea to print in three steps." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose the art" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Request an estimate" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "We make the print" })).toBeVisible();
  await expect(page.getByTestId("home-process")).toBeVisible();
  await expect(page.getByTestId("home-process").getByRole("listitem")).toHaveCount(3);
  await expect(page.getByTestId("home-process").getByText("1", { exact: true })).toHaveCount(1);
  await expect(page.getByTestId("home-process").getByText("2", { exact: true })).toHaveCount(1);
  await expect(page.getByTestId("home-process").getByText("3", { exact: true })).toHaveCount(1);
  await expect(page.getByTestId("home-faq")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Questions before your estimate" })).toBeVisible();
  await expect(page.getByTestId("home-final-quote")).toBeVisible();
  await expect(page.getByTestId("home-final-quote-cta")).toHaveAttribute("href", "/request");
  await expect(page.getByTestId("home-final-quote-cta")).toContainText("Free preview");
  const footer = page.getByTestId("site-footer");
  await expect(footer).toBeVisible();
  await expect(footer.getByTestId("site-footer-facebook")).toHaveAttribute(
    "href",
    "https://www.facebook.com/profile.php?id=61587045900230"
  );
  await expect(footer.getByTestId("site-footer-instagram")).toHaveAttribute("href", "https://www.instagram.com/wall_printpro/");
  await expect(footer.getByTestId("site-footer-facebook")).toHaveAttribute("target", "_blank");
  await expect(footer.getByTestId("site-footer-instagram")).toHaveAttribute("target", "_blank");
  await expect(page.locator('source[src*="work-videos"]')).toHaveCount(0);
  await expectNoBannedRenderedTerms(page);
});

test("homepage upload renders immediately, stays in place, and shares the durable iPhone preview", async ({ page }, testInfo) => {
  let releaseUploadUrl!: () => void;
  const uploadUrlGate = new Promise<void>((resolve) => {
    releaseUploadUrl = resolve;
  });
  let createInput: Record<string, unknown> | null = null;

  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        (window as Window & { __homepageSharedData?: ShareData }).__homepageSharedData = data;
      }
    });
  });
  await page.route("**/api/dev-public-origin", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ origin: "https://wall-preview.ngrok-free.dev" }) });
  });
  await page.route("**/api/homepage-test-upload", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ storageId: "storage-homepage-test" }) });
  });
  await page.route("**/api/homepage-artwork**", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "p-homepage-test",
          slug: "p-homepage-test",
          title: "Pathways to Success",
          description: "Uploaded homepage artwork",
          print: { aspectRatio: "6:5", widthMeters: 1.524, heightMeters: 1.27, label: "5 ft × 4 ft 2 in" },
          assets: {
            poster: "/artworks/chicago-final-1.jpg",
            glb: "/api/ar/chicago-final-1.glb",
            usdz: "/api/ar/chicago-final-1.usdz"
          },
          status: "ready"
        })
      });
      return;
    }

    const body = request.postDataJSON() as { action?: string; input?: Record<string, unknown> };

    if (body.action === "upload_url") {
      await uploadUrlGate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, uploadUrl: `${new URL(request.url()).origin}/api/homepage-test-upload` })
      });
      return;
    }

    createInput = body.input ?? null;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        preview: { publicSlug: "p-homepage-test", publicUrl: "/preview/p-homepage-test", status: "uploaded" }
      })
    });
  });

  await page.goto("/");
  const initialUrl = page.url();
  await page.getByTestId("homepage-entry-upload").click();
  await page.getByTestId("homepage-artwork-file").setInputFiles(path.join(process.cwd(), "public/artworks/chicago-final-1.jpg"));

  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", /^blob:/);
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("alt", "chicago final 1 wall print");
  expect(page.url()).toBe(initialUrl);

  releaseUploadUrl();

  if (testInfo.project.name === "mobile-safari-shape") {
    await expect(page.getByTestId("quick-look-link")).toBeVisible();
    await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/api/ar/chicago-final-1.usdz#allowsContentScaling=0");
    await expect(page.getByTestId("share-to-phone")).toHaveCount(0);
    expect(createInput).toMatchObject({ sourceStorageId: "storage-homepage-test", contentType: "image/png" });
    expect(page.url()).toBe(initialUrl);
    return;
  }

  await expect(page.getByTestId("share-to-phone")).toBeVisible();
  expect(createInput).toMatchObject({ sourceStorageId: "storage-homepage-test", contentType: "image/png" });
  expect(page.url()).toBe(initialUrl);
  await page.getByTestId("share-to-phone").click();
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __homepageSharedData?: ShareData }).__homepageSharedData?.url))
    .toBe("https://wall-preview.ngrok-free.dev/preview/p-homepage-test");
});

test("homepage Describe flow preserves both steps and submits from the keyboard", async ({ page }) => {
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
          poster: "/artworks/chicago-final-1.jpg",
          glb: "/api/ar/chicago-final-1.glb",
          usdz: "/api/ar/chicago-final-1.usdz"
        }
      })
    });
  });

  await page.goto("/");
  const initialUrl = page.url();
  const email = page.getByLabel("Email");

  await expect(page.getByTestId("homepage-describe-email-step")).toBeVisible();
  await expect(page.getByText(/Step [12] of 2/)).toHaveCount(0);
  await expect(page.getByLabel("Describe your wall print")).toHaveCount(0);
  await email.fill("not-an-email");
  await email.press("Enter");
  await expect(page.getByText("Enter a valid email address to continue.", { exact: true })).toBeVisible();
  await expect(email).toBeFocused();

  await email.fill("buyer@example.com");
  await email.press("Enter");

  const description = page.getByLabel("Describe your wall print");
  await expect(page.getByTestId("homepage-describe-description-step")).toBeVisible();
  await expect(page.getByText(/Step [12] of 2/)).toHaveCount(0);
  await expect(description).toBeFocused();
  await description.fill("Chicago skyline");
  await description.press("Shift+Enter");
  await description.type("for a school lobby");
  await expect(description).toHaveValue("Chicago skyline\nfor a school lobby");
  expect(calls).toHaveLength(0);

  await page.getByTestId("homepage-describe-back").click();
  await expect(email).toBeFocused();
  await expect(email).toHaveValue("buyer@example.com");
  await email.press("Enter");
  await expect(description).toBeFocused();
  await expect(description).toHaveValue("Chicago skyline\nfor a school lobby");
  const consent = page.getByLabel(/publicly display the AI-generated artwork anonymously/);
  await expect(consent).not.toBeChecked();
  await expect(page.getByTestId("homepage-concept-generate")).toBeDisabled();
  await consent.check();
  await description.press("Enter");

  await expect(page.getByTestId("homepage-concept-status")).toContainText("Artwork preview is ready for wall placement.");
  await expect(page.getByTestId("selected-artwork-title")).toHaveCount(0);
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-1.jpg");
  await expectWallPlacementEntryPoint(page, "/api/ar/chicago-final-1.usdz#allowsContentScaling=0");
  expect(calls.map((call) => call.method)).toEqual(["POST", "GET"]);
  expect(calls[0].body).toMatchObject({
    contactEmail: "buyer@example.com",
    prompt: "Chicago skyline\nfor a school lobby",
    galleryPublicationConsent: true,
    selectedDesignId: "chicago-final-1"
  });
  expect(calls[1].url).toContain("leadRequestId=lead_hero_123");
  expect(page.url()).toBe(initialUrl);
});

test("homepage entry cards keep one compact responsive footprint", async ({ page }) => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "tablet", width: 838, height: 900 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    const heights: number[] = [];

    for (const entry of ["choose", "upload", "describe"] as const) {
      await page.getByTestId(`homepage-entry-${entry}`).click();
      heights.push((await page.getByTestId("homepage-entry-panel").boundingBox())?.height ?? 0);
    }

    const emailBox = await page.getByLabel("Email").boundingBox();
    const continueBox = await page.getByTestId("homepage-describe-continue").boundingBox();
    const entryPanelBox = await page.getByTestId("homepage-entry-panel").boundingBox();

    expect(continueBox?.y ?? 0, `${viewport.name} Continue bottom row`).toBeGreaterThanOrEqual(
      (emailBox?.y ?? 0) + (emailBox?.height ?? 0) + 8
    );
    expect(
      Math.abs((entryPanelBox?.x ?? 0) + (entryPanelBox?.width ?? 0) - ((continueBox?.x ?? 0) + (continueBox?.width ?? 0))),
      `${viewport.name} Continue right alignment`
    ).toBeLessThanOrEqual(18);

    await page.getByLabel("Email").fill(`${viewport.name}@example.com`);
    await page.getByLabel("Email").press("Enter");
    expect(Math.max(...heights) - Math.min(...heights), `${viewport.name} card-height difference`).toBeLessThanOrEqual(2);

    const metrics = await page.getByTestId("homepage-demo-actions").evaluate((root) => {
      const rootRect = root.getBoundingClientRect();
      const targets = Array.from(root.querySelectorAll<HTMLElement>('button, input:not([type="file"]):not([type="checkbox"]), textarea'))
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => element.getBoundingClientRect().height);

      return {
        minTargetHeight: Math.min(...targets),
        rootLeft: rootRect.left,
        rootRight: rootRect.right,
        viewportWidth: window.innerWidth
      };
    });

    expect(metrics.minTargetHeight, `${viewport.name} minimum touch target`).toBeGreaterThanOrEqual(44);
    expect(metrics.rootLeft, `${viewport.name} left edge`).toBeGreaterThanOrEqual(0);
    expect(metrics.rootRight, `${viewport.name} right edge`).toBeLessThanOrEqual(metrics.viewportWidth);
  }
});

test("request form requires unchecked publication consent for AI concepts", async ({ page }) => {
  await page.goto("/request?intent=concept&conceptPrompt=Gold%20leaf%20logo%20wall");

  const consent = page.getByLabel(/publicly display the AI-generated artwork anonymously/);
  await expect(consent).toBeVisible();
  await expect(consent).not.toBeChecked();
  await expect(consent).toHaveAttribute("required", "");
  await page.getByLabel("Name", { exact: true }).fill("Buyer");
  await page.getByLabel("Email", { exact: true }).fill("buyer@example.com");
  await expect(page.getByRole("button", { name: "Get estimate" })).toBeDisabled();
  await consent.check();
  await expect(page.getByRole("button", { name: "Get estimate" })).toBeEnabled();
  await expect(page.getByTestId("request-gallery-consent")).toContainText("Free AI generation is offered in exchange");
});

test("gallery route lets users choose existing artwork for wall placement", async ({ page }) => {
  await page.goto("/gallery");

  await expect(page.getByRole("heading", { name: "Wall print gallery" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Go back" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "/");
  // Shared site chrome renders on the gallery route: brand + nav + reserve CTA.
  await expect(page.getByRole("link", { name: "Gallery" })).toHaveAttribute("href", "/gallery");
  await expect(page.getByRole("link", { name: "Our work" })).toHaveAttribute("href", "/work");
  await expect(page.getByTestId("home-nav-reserve")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Saved previews" })).toHaveCount(0);
  await expect(page.getByTestId("gallery-artwork-list").getByTestId("gallery-artwork-card")).toHaveCount(8);
  await expect(page.getByTestId("gallery-artwork-list")).not.toContainText(/Pathways to Success|Lakefront Day|River Train Crossing/);
  await expect(page.getByTestId("gallery-artwork-list")).not.toContainText(/Chicago skyline|Chicago lakefront|Chicago train/);
  await expect(page.getByTestId("gallery-artwork-list")).not.toContainText(/\d+(?:\.\d+)?\s*ft/);
  await expect(page.getByTestId("gallery-selected-artwork-title")).toHaveCount(0);
  await expect(page.getByTestId("gallery-selected-print-size")).toHaveCount(0);
  await expect(page.getByTestId("gallery-selected-print-area")).toHaveCount(0);
  await expect(page.getByTestId("gallery-selected-artwork")).toHaveAttribute("src", "/artworks/chicago-final-1.jpg");
  await expect(page.getByTestId("gallery-request-selected-design")).toHaveAttribute("href", "/request?intent=concept&designId=chicago-final-1");
  await expect(page.getByText("Try this artwork")).toHaveCount(0);
  await expect(page.getByText("Selected", { exact: true })).toHaveCount(0);
  await expectWallPlacementEntryPoint(page, "/api/ar/chicago-final-1.usdz#allowsContentScaling=0");

  await page.getByTestId("gallery-next-artwork").click();
  await expect(page.getByTestId("gallery-selected-artwork")).toHaveAttribute("src", "/artworks/chicago-final-2.jpg");
  await expect(page.getByTestId("gallery-request-selected-design")).toHaveAttribute("href", "/request?intent=concept&designId=chicago-final-2");

  await page.getByTestId("gallery-previous-artwork").click();
  await expect(page.getByTestId("gallery-selected-artwork")).toHaveAttribute("src", "/artworks/chicago-final-1.jpg");

  await page.locator('[data-artwork-id="chicago-final-3"]').click();

  await expect(page.getByTestId("gallery-selected-artwork")).toHaveAttribute("src", "/artworks/chicago-final-3.jpg");
  await expect(page.getByTestId("gallery-request-selected-design")).toHaveAttribute("href", "/request?intent=concept&designId=chicago-final-3");
  await expect(page.locator('[data-artwork-id="chicago-final-3"]')).toHaveAttribute("aria-pressed", "true");
  await expectNoBannedRenderedTerms(page);
});

test("community gallery selects AR artwork, loads more, and resolves the request from its published slug", async ({ page }) => {
  await page.goto("/gallery");

  await expect(page.getByTestId("community-gallery-section")).toBeVisible();
  await expect(page.getByTestId("community-gallery-list").getByTestId("gallery-artwork-card")).toHaveCount(1);
  await page.locator('[data-artwork-id="g-community-one"]').click();
  await expect(page.getByTestId("gallery-selected-artwork")).toHaveAttribute("src", "/artworks/chicago-final-1.jpg");
  await expect(page.getByTestId("gallery-request-selected-design")).toHaveAttribute(
    "href",
    "/request?intent=concept&gallerySlug=g-community-one"
  );
  await expectWallPlacementEntryPoint(page, "/api/ar/chicago-final-1.usdz#allowsContentScaling=0");

  await page.getByTestId("community-gallery-load-more").click();
  await expect(page.getByTestId("community-gallery-list").getByTestId("gallery-artwork-card")).toHaveCount(2);
  await expect(page.getByTestId("community-gallery-load-more")).toHaveCount(0);

  await page.getByTestId("gallery-request-selected-design").click();
  await expect(page).toHaveURL(/\/request\?intent=concept&gallerySlug=g-community-one$/);
  await expect(page.getByTestId("request-selected-design-context")).toContainText("Community AI concept");
  await expect(page.getByTestId("request-gallery-consent")).toHaveCount(0);
  await page.getByLabel("Name", { exact: true }).fill("Buyer");
  await page.getByLabel("Email", { exact: true }).fill("buyer@example.com");
  await expect(page.getByRole("button", { name: "Get estimate" })).toBeEnabled();
});

test("uploaded artwork does not require AI gallery publication consent", async ({ page }) => {
  await page.goto("/request?intent=concept&conceptPrompt=Use%20my%20uploaded%20logo&focus=upload");

  await expect(page.getByTestId("request-gallery-consent")).toBeVisible();
  await page.locator("#lead-upload").setInputFiles("public/artworks/chicago-final-1.jpg");
  await expect(page.getByTestId("request-gallery-consent")).toHaveCount(0);
  await page.getByLabel("Name", { exact: true }).fill("Buyer");
  await page.getByLabel("Email", { exact: true }).fill("buyer@example.com");
  await expect(page.getByRole("button", { name: "Get estimate" })).toBeEnabled();
});

test("homepage selected design opens the public gallery before the request gate", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("next-artwork").click();

  await page.getByTestId("homepage-entry-choose").click();
  await page.getByTestId("homepage-selected-design-handoff").click();

  await expect(page).toHaveURL(/\/gallery\?designId=chicago-final-2$/);
  await expect(page.getByRole("heading", { name: "Wall print gallery" })).toHaveCount(1);
  await expect(page.getByTestId("gallery-selected-artwork")).toHaveAttribute("src", "/artworks/chicago-final-2.jpg");
  await expect(page.getByTestId("gallery-selected-artwork-title")).toHaveCount(0);
  await expectWallPlacementEntryPoint(page, "/api/ar/chicago-final-2.usdz#allowsContentScaling=0");
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

    await expect(page.getByRole("button", { name: "Go back" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);

    const metrics = await page.evaluate(() => {
      const header = document.querySelector("header");
      const list = document.querySelector('[data-testid="gallery-artwork-list"]');

      if (!header || !list) {
        throw new Error("Expected gallery elements were not rendered.");
      }

      const headerRect = header.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();

      return {
        headerLeft: headerRect.left,
        headerRight: headerRect.right,
        listLeft: listRect.left,
        listRight: listRect.right,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth
      };
    });

    expect(metrics.headerLeft).toBeGreaterThanOrEqual(12);
    expect(metrics.headerRight).toBeLessThanOrEqual(metrics.viewportWidth - 12);
    expect(metrics.listLeft).toBeGreaterThanOrEqual(12);
    expect(metrics.listRight).toBeLessThanOrEqual(metrics.viewportWidth - 12);
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

});

test("bottom controls cycle the selected picture and native AR target", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveCount(0);
  await expect(page.getByTestId("selected-artwork-size")).toHaveCount(0);
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-2.jpg");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("src", "/api/ar/chicago-final-2.glb");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ios-src", "/api/ar/chicago-final-2.usdz");
  await expectWallPlacementEntryPoint(page, "/api/ar/chicago-final-2.usdz#allowsContentScaling=0");

  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-3.jpg");

  await page.getByTestId("previous-artwork").click();
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-2.jpg");
  await expectWallPlacementEntryPoint(page, "/api/ar/chicago-final-2.usdz#allowsContentScaling=0");
});

test("homepage hides artwork names and places picture navigation on the bottom row at narrow widths", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 538, height: 785 });
  await page.goto("/");

  await expect(page.getByTestId("selected-artwork-title")).toHaveCount(0);
  await expect(page.getByText("Pathways to Success", { exact: true })).toHaveCount(0);

  const phoneAction = testInfo.project.name === "mobile-safari-shape" ? page.getByTestId("quick-look-link") : page.getByTestId("share-to-phone");
  const shareBox = await phoneAction.boundingBox();
  const nextBox = await page.getByTestId("next-artwork").boundingBox();
  const controlsBox = await page.getByTestId("artwork-controls").boundingBox();

  expect(nextBox?.y ?? 0).toBeGreaterThanOrEqual((shareBox?.y ?? 0) + (shareBox?.height ?? 0) + 8);
  expect(
    Math.abs((controlsBox?.x ?? 0) + (controlsBox?.width ?? 0) - ((shareBox?.x ?? 0) + (shareBox?.width ?? 0)))
  ).toBeLessThanOrEqual(16);
  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-2.jpg");
});

test("homepage keeps the hero in two columns at tablet width without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 838, height: 785 });
  await page.goto("/");

  const layout = await page.evaluate(() => {
    const heroCopy = document.querySelector(".ar-hero-reveal");
    const artCard = document.querySelector(".ar-art-card");

    if (!heroCopy || !artCard) {
      throw new Error("Expected homepage hero surfaces.");
    }

    const copyRect = heroCopy.getBoundingClientRect();
    const artRect = artCard.getBoundingClientRect();

    return {
      copyRight: copyRect.right,
      artLeft: artRect.left,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    };
  });

  expect(layout.copyRight).toBeLessThanOrEqual(layout.artLeft);
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
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
      await enableQuickLookRelSupport(page);
      await page.goto("/");

      await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/api/ar/chicago-final-1.usdz#allowsContentScaling=0");
      await expect(page.getByTestId("quick-look-link")).toHaveAttribute("rel", "ar");
      await expect(page.getByTestId("quick-look-link")).toHaveAccessibleName("Place on wall");
      await expect(page.getByTestId("quick-look-label")).toHaveText("Place on wall");
      await expect(page.getByTestId("quick-look-link")).toHaveJSProperty("childElementCount", 1);
      await expect(page.locator('[data-testid="quick-look-link"] > img:only-child')).toHaveCount(1);
      await expect
        .poll(() =>
          page.getByTestId("quick-look-link").evaluate((anchor) =>
            [...anchor.childNodes].every(
              (node) => node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "IMG"
            )
          )
        )
        .toBe(true);
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
      await page.getByTestId("ar-launcher-model").evaluate((modelViewer) => {
        Object.defineProperty(modelViewer, "activateAR", {
          configurable: true,
          value: async () => {
            (window as Window & { __modelViewerActivateArCalled?: boolean }).__modelViewerActivateArCalled = true;
          }
        });
      });

      await expect(page.getByTestId("quick-look-link")).toHaveAttribute("title", "Place this print on a wall");

      await page.getByTestId("quick-look-link").click();

      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Open in Safari to place on wall" })).toBeVisible();
      await expect(page.getByText("Wall placement did not start from this browser.")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => (window as Window & { __modelViewerActivateArCalled?: boolean }).__modelViewerActivateArCalled))
        .not.toBe(true);
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
      await expect(page.getByTestId("quick-look-link")).toHaveAccessibleName("Open in Safari");
      await expect(page.getByTestId("quick-look-label")).toHaveText("Open in Safari");
      await expect(page.locator('[data-testid="quick-look-link"] > img')).toHaveClass(/sr-only/);
      await page.getByTestId("quick-look-link").hover();
      await expect(page.getByTestId("ar-access-warning")).toContainText("Use Safari on iPhone.");

      await page.getByTestId("quick-look-link").click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Use Safari on this iPhone" })).toBeVisible();
      await expect(page.getByText("This browser cannot reliably start wall placement.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Open in Safari (experimental)" })).toHaveAttribute(
        "href",
        expectedExperimentalSafariHref(page)
      );
      await expect(page.getByRole("button", { name: "Copy link" })).toHaveCount(0);
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
      await expect(page.getByTestId("quick-look-link")).toHaveAccessibleName("Open in Safari");
      await expect(page.getByTestId("quick-look-label")).toHaveText("Open in Safari");

      await page.getByTestId("quick-look-link").click();

      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Use Safari on this iPhone" })).toBeVisible();
      await expect(page.getByText("This browser cannot reliably start wall placement.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Open in Safari (experimental)" })).toHaveAttribute(
        "href",
        expectedExperimentalSafariHref(page)
      );
    });
  });

  test.describe("iPhone Arc browser", () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1 ArcSearch/1.45.0",
      viewport: { width: 390, height: 844 }
    });

    test("guides Arc users to Safari instead of silently resolving AR activation", async ({ page }) => {
      await page.goto("/gallery?designId=chicago-final-4");

      await expect(page.getByTestId("quick-look-link")).toHaveAccessibleName("Open in Safari");
      await page.getByTestId("quick-look-link").click();

      await expect(page).toHaveURL(/\/gallery\?designId=chicago-final-4$/);
      await expect(page.getByRole("heading", { name: "Use Safari on this iPhone" })).toBeVisible();
      await expect(page.getByText("The button below uses an experimental Safari link.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Open in Safari (experimental)" })).toHaveAttribute(
        "href",
        expectedExperimentalSafariHref(page)
      );
      await expect(page.getByRole("button", { name: "Copy link" })).toHaveCount(0);
    });
  });

  test.describe("Android Chrome", () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      userAgent:
        "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
      viewport: { width: 412, height: 915 }
    });

    test("exposes the native AR launch path without an iPhone-share control", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-modes", "quick-look scene-viewer");
      await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/api/ar/chicago-final-1.usdz#allowsContentScaling=0");
      await expect(page.getByTestId("quick-look-link")).toHaveAttribute("rel", "ar");
      await expect(page.getByTestId("share-to-phone")).toHaveCount(0);
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

test("shared site header + reserve CTA render on the Our work routes", async ({ page }) => {
  await page.goto("/work");

  await expect(page.getByRole("link", { name: "Wall Print Pro" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Gallery" })).toHaveAttribute("href", "/gallery");
  await expect(page.getByRole("link", { name: "Our work" }).first()).toHaveAttribute("href", "/work");
  await expect(page.getByTestId("home-nav-reserve")).toBeVisible();
  await expect(page.getByTestId("social-proof-library")).toHaveCount(0);
  await expect(page.getByTestId("facebook-proof-embed")).toHaveCount(0);
  await expect(page.getByTestId("instagram-proof-container")).toHaveCount(0);
  await expect(page.locator('iframe[src*="facebook.com"], iframe[src*="instagram.com"], blockquote.instagram-media')).toHaveCount(0);

  await page.goto("/work/pathways-to-success-mural");
  await expect(page.getByRole("link", { name: "Wall Print Pro" })).toHaveAttribute("href", "/");
  await expect(page.getByTestId("home-nav-reserve")).toBeVisible();
});

test("/reserved keeps the shared header but swaps the CTA for a confirmation chip", async ({ page }) => {
  await page.goto("/reserved");

  await expect(page.getByRole("link", { name: "Wall Print Pro" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Gallery" })).toHaveAttribute("href", "/gallery");
  // The paying customer is never shown a reserve CTA again.
  await expect(page.getByTestId("home-nav-reserve")).toHaveCount(0);
  await expect(page.getByTestId("site-reserve-confirmation")).toContainText("Spot reserved");
  // No competing sticky reserve bar on the confirmation page either.
  await expect(page.getByTestId("home-sticky-reserve")).toHaveCount(0);
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
  await expect(page.getByTestId("selected-artwork-title")).toHaveCount(0);
  await expect(page.getByText("File name")).toBeVisible();
  await expect(page.getByTestId("public-confirmation-file-name")).toHaveText("Pathways to Success");
  await expect(page.getByTestId("public-confirmation-dimensions")).toHaveCount(0);
  await expect(page.getByTestId("previous-artwork")).toHaveCount(0);
  await expect(page.getByTestId("next-artwork")).toHaveCount(0);
  await expectWallPlacementEntryPoint(page);
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
  await expect(page.getByRole("heading", { name: "Custom murals printed directly on your wall in Chicago." })).toBeVisible();
});

test("public preview route renders an unavailable state for missing Convex assets", async ({ page }) => {
  await page.goto("/preview/not-seeded");

  await expect(page.getByText("This client preview is not available.")).toBeVisible();
  await expect(page.getByTestId("preview-unavailable-reason")).toContainText("This client preview is unavailable. Ask for a fresh invite link.");
  await expect(page.getByText("Requested preview")).toHaveCount(0);
  await expectNoBannedRenderedTerms(page);
});

test("removed launch routes return direct 404 responses", async ({ page }) => {
  for (const pathname of [
    "/admin",
    "/admin/leads",
    "/seller",
    "/seller/new",
    "/account",
    "/dashboard",
    "/builder/not-a-real-token",
    "/invite/not-a-real-token",
    "/sign-in",
    "/sign-up"
  ]) {
    const response = await page.request.get(pathname, { maxRedirects: 0 });

    expect(response.status(), `${pathname} should be deleted`).toBe(404);
    expect(response.headers().location, `${pathname} should not redirect`).toBeUndefined();
    expect(new URL(response.url()).pathname, `${pathname} should remain the requested route`).toBe(pathname);
  }
});

test("static Phase 0 asset routes expose expected AR headers and size budgets", async ({ page }) => {
  const glb = await page.request.get("/api/ar/chicago-final-1.glb");
  const usdz = await page.request.get("/api/ar/chicago-final-1.usdz");
  const poster = await page.request.get("/artworks/chicago-final-1.jpg");

  expect(glb.status()).toBe(200);
  const glbContentType = glb.headers()["content-type"];
  if (process.env.PLAYWRIGHT_BASE_URL?.includes("chatgpt.site")) {
    expect(glbContentType).toContain("model/gltf-binary");
  } else {
    expect(["model/gltf-binary", "application/octet-stream"]).toContain(glbContentType);
  }
  expect(await assetByteLength(glb)).toBeLessThanOrEqual(4_250_000);

  expect(usdz.status()).toBe(200);
  const usdzContentType = usdz.headers()["content-type"];
  if (process.env.PLAYWRIGHT_BASE_URL?.includes("chatgpt.site")) {
    expect(usdzContentType).toContain("model/vnd.usdz+zip");
  } else {
    expect(["model/vnd.usdz+zip", "application/octet-stream"]).toContain(usdzContentType);
  }
  expect(await assetByteLength(usdz)).toBeLessThanOrEqual(4_250_000);

  expect(poster.status()).toBe(200);
  expect(poster.headers()["content-type"]).toContain("image/jpeg");
  expect(await assetByteLength(poster)).toBeLessThanOrEqual(4_250_000);
});
