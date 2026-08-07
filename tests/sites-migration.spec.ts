import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const manifest = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      "public",
      "media",
      "wall-print-pro",
      "manifest.json",
    ),
    "utf8",
  ),
) as {
  homepage: Array<{ sources: Record<string, { path: string }> }>;
  ourWork: Array<{ sources: Record<string, { path: string }> }>;
};

test("Sites migration renders approved homepage media", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Custom murals printed directly on your wall in Chicago.",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("approved-homepage-media")).toBeVisible();
  await expect(
    page.getByTestId("approved-homepage-media").locator("figure"),
  ).toHaveCount(6);
  await expect(
    page.getByTestId("approved-homepage-media").locator("video"),
  ).toHaveCount(3);
  await expect(
    page
      .getByTestId("approved-homepage-media")
      .getByText("Workshop demonstration", { exact: true }),
  ).toHaveCount(3);

  const homepageImages = page
    .getByTestId("approved-homepage-media")
    .locator("img");
  await expect(homepageImages).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    const image = homepageImages.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((element) => {
          const imageElement = element as HTMLImageElement;
          return (
            imageElement.naturalWidth > 0 &&
            imageElement.naturalHeight > imageElement.naturalWidth
          );
        }),
      )
      .toBe(true);
  }

  const homepageVideos = page
    .getByTestId("approved-homepage-media")
    .locator("video");
  for (let index = 0; index < 3; index += 1) {
    const video = homepageVideos.nth(index);
    await video.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        video.evaluate((element) => {
          const videoElement = element as HTMLVideoElement;
          return (
            videoElement.readyState >= HTMLMediaElement.HAVE_METADATA &&
            videoElement.videoHeight > videoElement.videoWidth
          );
        }),
      )
      .toBe(true);
  }
});

test("Sites migration preserves gallery navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Gallery" }).click();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page).toHaveTitle("Gallery | Wall Print Pro");
  await expect(page.getByRole("heading", { name: "Wall print gallery" })).toBeVisible();
  await expect(page.getByTestId("gallery-selected-artwork")).toBeVisible();
  const initialArtwork = await page
    .getByTestId("gallery-selected-artwork")
    .getAttribute("src");
  await page.getByTestId("gallery-next-artwork").click();
  await expect(page.getByTestId("gallery-selected-artwork")).not.toHaveAttribute(
    "src",
    initialArtwork ?? "",
  );
});

test("Sites migration publishes approved work media", async ({
  page,
  request,
}) => {
  await page.goto("/work");
  const gallery = page.getByTestId("approved-work-gallery");
  await expect(gallery).toBeVisible();
  await expect(gallery.locator("figure")).toHaveCount(13);
  await expect(gallery.locator("video")).toHaveCount(7);
  await expect(
    gallery.getByText("Workshop demonstration", { exact: true }),
  ).toHaveCount(10);
  await expect(
    gallery.getByText("Finished wall print", { exact: true }),
  ).toHaveCount(3);

  const mediaUrls = [...manifest.homepage, ...manifest.ourWork].flatMap(
    (item) => Object.values(item.sources).map((source) => source.path),
  );

  expect(mediaUrls).toHaveLength(47);
  await Promise.all(
    mediaUrls.map(async (mediaUrl) => {
      const response = await request.get(mediaUrl);
      expect(response.ok(), `${mediaUrl} should load`).toBe(true);
      expect((await response.body()).byteLength).toBeGreaterThan(0);
    }),
  );
});

test("Sites migration redirects retired work slugs", async ({ page }) => {
  await page.goto("/work/lakefront-day-mural");
  await expect(page).toHaveURL(/\/work$/);
});

test("Sites migration preserves the configured request entry route", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Get an estimate", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/request$/);
  await expect(page.getByRole("heading", { name: "Request a wall print estimate." })).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open draft preview" })).toHaveCount(0);
});

test("Sites migration serves security headers on HTML responses", async ({
  request,
}) => {
  const response = await request.get("/");

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("text/html");
  expect(response.headers()["strict-transport-security"]).toBe(
    "max-age=31536000; includeSubDomains",
  );
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  );
  expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(response.headers()["permissions-policy"]).toBe(
    "camera=(self), microphone=(), geolocation=()",
  );
});

test("Sites migration remains within a narrow mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");

  await expect(page.getByTestId("approved-homepage-media")).toBeVisible();

  const homepageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(homepageOverflow).toBeLessThanOrEqual(1);

  await page.goto("/work");
  await expect(page.getByTestId("approved-work-gallery")).toBeVisible();

  const workOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(workOverflow).toBeLessThanOrEqual(1);
});
