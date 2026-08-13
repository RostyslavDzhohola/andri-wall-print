import { expect, test, type Page } from "@playwright/test";

const ROUTES = [
  "/",
  "/gallery",
  "/work",
  "/request",
  "/reserved",
  "/preview/not-a-real-preview",
  "/missing-page"
] as const;

const PRIMARY_NAVIGATION = [
  { label: "Home", href: "/" },
  { label: "Gallery", href: "/gallery" },
  { label: "Our work", href: "/work" }
] as const;

const MARKETING_VIEWPORTS = [
  { name: "phone portrait", width: 390, height: 844 },
  { name: "phone landscape", width: 844, height: 390 },
  { name: "iPad portrait", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 }
] as const;

const CORE_MARKETING_ROUTES = ["/", "/gallery", "/request", "/work", "/reserved"] as const;

async function blockThirdPartyMedia(page: Page) {
  await page.route(/(?:instagram\.com|facebook\.com|googleapis\.com|r2\.dev)/, (route) => route.abort());
}

test("every user-facing route renders the shared header and footer", async ({ page }) => {
  await blockThirdPartyMedia(page);

  let expectedHeaderHeight: number | null = null;

  for (const route of ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });

    const header = page.getByTestId("site-header");
    const headerShell = page.getByTestId("site-header-shell");
    const footer = page.getByTestId("site-footer");

    await expect(header, route).toHaveCount(1);
    await expect(footer, route).toHaveCount(1);
    await expect(header.getByRole("link", { name: "Wall Print Pro homepage" }), route).toBeVisible();
    await expect(footer.getByRole("navigation", { name: "Social media" }), route).toBeVisible();
    await expect(headerShell, route).toHaveCSS("position", "sticky");

    for (const { label, href } of PRIMARY_NAVIGATION) {
      const navigationLink = header.getByRole("link", { name: label, exact: true });
      await expect(navigationLink, `${route}: ${label}`).toHaveCount(1);
      await expect(navigationLink, `${route}: ${label}`).toHaveAttribute("href", href);
    }

    const headerHeight = await header.evaluate((element) => element.getBoundingClientRect().height);
    expectedHeaderHeight ??= headerHeight;
    expect(headerHeight, route).toBe(expectedHeaderHeight);

    expect(
      await page.evaluate(() => {
        const main = document.querySelector("main");
        const footerElement = document.querySelector('[data-testid="site-footer"]');

        return Boolean(
          main &&
            footerElement &&
            main.compareDocumentPosition(footerElement) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      }),
      route
    ).toBe(true);

    const initialHeaderTop = (await headerShell.boundingBox())?.y;
    await page.evaluate(() => {
      document.documentElement.style.minHeight = "200vh";
      document.body.style.minHeight = "200vh";
      window.scrollTo(0, 300);
    });
    await expect.poll(async () => (await headerShell.boundingBox())?.y, { message: route }).toBe(initialHeaderTop);
  }
});

test("the desktop gallery preview reserves a sticky offset below the header", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1024, "Desktop sticky gallery layout only");
  await blockThirdPartyMedia(page);
  await page.goto("/gallery", { waitUntil: "domcontentloaded" });

  const headerBox = await page.getByTestId("site-header-shell").boundingBox();
  const gallery = page.getByTestId("gallery-selected-preview");
  const galleryBox = await gallery.boundingBox();
  const galleryTopOffset = Number.parseFloat(await gallery.evaluate((element) => getComputedStyle(element).top));

  expect(headerBox).not.toBeNull();
  expect(galleryBox).not.toBeNull();
  expect(galleryBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height);
  expect(galleryTopOffset).toBeGreaterThanOrEqual(headerBox!.height);
});

test("the mobile reserve bar keeps its route visibility rules and does not cover the footer", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 768, "Mobile reserve bar only");
  await page.setViewportSize({ width: 390, height: 844 });
  await blockThirdPartyMedia(page);

  for (const route of ["/", "/gallery", "/work", "/missing-page"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const reserveBar = page.getByTestId("home-sticky-reserve");
    const footer = page.getByTestId("site-footer");

    await expect(reserveBar, route).toBeVisible();

    if (route === "/") {
      const viewportHeight = page.viewportSize()!.height;
      const initialReserveBox = await reserveBar.locator("..").boundingBox();

      expect(initialReserveBox, route).not.toBeNull();
      expect(initialReserveBox!.y + initialReserveBox!.height, route).toBeCloseTo(viewportHeight, 0);

      await page.evaluate(() => window.scrollTo(0, 400));
      await expect
        .poll(async () => {
          const reserveBox = await reserveBar.locator("..").boundingBox();
          return reserveBox ? reserveBox.y + reserveBox.height : null;
        }, { message: `${route}: sticky reserve bar` })
        .toBeCloseTo(viewportHeight, 0);
    }

    if (route === "/missing-page") {
      const footerEmail = footer.locator('a[href^="mailto:"]');
      const footerEmailBox = await footerEmail.boundingBox();
      const initialReserveBox = await reserveBar.locator("..").boundingBox();

      expect(footerEmailBox, route).not.toBeNull();
      expect(initialReserveBox, route).not.toBeNull();
      expect(
        footerEmailBox!.y < initialReserveBox!.y + initialReserveBox!.height &&
          footerEmailBox!.y + footerEmailBox!.height > initialReserveBox!.y,
        route
      ).toBe(false);
    }

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    const footerBox = await footer.boundingBox();
    const reserveBox = await reserveBar.locator("..").boundingBox();

    expect(footerBox, route).not.toBeNull();
    expect(reserveBox, route).not.toBeNull();
    expect(
      reserveBox!.y + reserveBox!.height <= footerBox!.y + 1 ||
        footerBox!.y + footerBox!.height <= reserveBox!.y + 1,
      route
    ).toBe(true);
  }

  for (const route of ["/request", "/reserved", "/preview/not-a-real-preview"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("home-sticky-reserve"), route).toHaveCount(0);
  }
});

test("core marketing routes fit phone, iPad, and desktop viewports", async ({ page }) => {
  await blockThirdPartyMedia(page);

  for (const viewport of MARKETING_VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of CORE_MARKETING_ROUTES) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("site-header"), `${viewport.name}: ${route} header`).toBeVisible();
      await expect(page.getByTestId("site-footer"), `${viewport.name}: ${route} footer`).toBeVisible();
      await expect(page.locator("main h1").first(), `${viewport.name}: ${route} heading`).toBeVisible();

      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));

      expect(layout.scrollWidth, `${viewport.name}: ${route} horizontal overflow`).toBeLessThanOrEqual(
        layout.clientWidth + 1
      );
    }
  }
});
