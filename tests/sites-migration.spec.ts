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

test("Sites migration renders approved media, navigation, and core public interactions", async ({
  page,
  request,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Custom murals printed directly on your wall in Chicago.",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("approved-homepage-media")).toBeVisible();
  await expect(
    page.getByTestId("approved-homepage-media").locator("figure"),
  ).toHaveCount(4);
  await expect(
    page.getByTestId("approved-homepage-media").locator("video"),
  ).toHaveCount(1);
  await expect(
    page
      .getByTestId("approved-homepage-media")
      .getByText("Workshop demonstration", { exact: true }),
  ).toHaveCount(1);

  await page.getByRole("link", { name: "Gallery" }).click();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.getByTestId("gallery-selected-artwork")).toBeVisible();
  const initialArtwork = await page
    .getByTestId("gallery-selected-artwork")
    .getAttribute("src");
  await page.getByTestId("gallery-next-artwork").click();
  await expect(page.getByTestId("gallery-selected-artwork")).not.toHaveAttribute(
      "src",
      initialArtwork ?? "",
    );

  await page.getByRole("link", { name: "Our work" }).click();
  await expect(page).toHaveURL(/\/work$/);
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

  expect(mediaUrls).toHaveLength(43);
  for (const mediaUrl of mediaUrls) {
    const response = await request.get(mediaUrl);
    expect(response.ok(), `${mediaUrl} should load`).toBe(true);
    expect((await response.body()).byteLength).toBeGreaterThan(0);
  }

  await page.goto("/work/lakefront-day-mural");
  await expect(page).toHaveURL(/\/work$/);

  await page
    .getByRole("link", { name: "Get an estimate", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/request$/);
  await expect(
    page.getByRole("heading", { name: "Request a wall print estimate." }),
  ).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
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
