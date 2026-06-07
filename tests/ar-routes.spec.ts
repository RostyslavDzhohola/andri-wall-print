import { expect, test, type APIResponse } from "@playwright/test";

async function assetByteLength(response: APIResponse) {
  const contentLength = response.headers()["content-length"];

  if (contentLength) {
    return Number(contentLength);
  }

  return (await response.body()).length;
}

test("homepage renders a static artwork presentation with native AR assets", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Place this print on your wall/i })).toBeVisible();
  await expect(page.getByTestId("static-artwork-preview")).toBeVisible();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Chicago Final 1");
  await expect(page.getByText("152 cm wide x 127 cm tall")).toBeVisible();
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("src", "/ar/chicago-final-1.glb");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ios-src", "/ar/chicago-final-1.usdz");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-placement", "wall");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-scale", "fixed");
  await expect(page.getByTestId("ar-launcher-model")).not.toHaveAttribute("camera-controls", "");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/chicago-final-1.usdz#allowsContentScaling=0");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("rel", "ar");
  await expect(page.locator('script[src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js"]')).toHaveCount(1);
  await expect(page.getByText("Camera not started")).toHaveCount(0);
  await expect(page.getByText("Picture mode")).toHaveCount(0);
});

test("bottom controls cycle the selected picture and native AR target", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Chicago Final 2");
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-2.png");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("src", "/ar/chicago-final-2.glb");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ios-src", "/ar/chicago-final-2.usdz");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/chicago-final-2.usdz#allowsContentScaling=0");

  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Chicago Final 3");
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/chicago-final-3.png");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/chicago-final-3.usdz#allowsContentScaling=0");

  await page.getByTestId("previous-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Chicago Final 2");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/chicago-final-2.usdz#allowsContentScaling=0");
});

test("old picture mode route is removed", async ({ page }) => {
  const response = await page.goto("/picture-mode");

  expect(response?.status()).toBe(404);
});

test("public preview route renders a ready seeded artwork", async ({ page }) => {
  await page.goto("/preview/chicago-final-1");

  await expect(page.getByRole("heading", { name: "Chicago Final 1" })).toBeVisible();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Chicago Final 1");
  await expect(page.getByTestId("previous-artwork")).toHaveCount(0);
  await expect(page.getByTestId("next-artwork")).toHaveCount(0);
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/chicago-final-1.usdz#allowsContentScaling=0");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-placement", "wall");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ar-scale", "fixed");
});

test("public preview route renders an unavailable state for missing Convex assets", async ({ page }) => {
  await page.goto("/preview/not-seeded");

  await expect(page.getByRole("heading", { name: "This AR preview is not ready." })).toBeVisible();
  await expect(page.getByTestId("preview-unavailable-reason")).toContainText("Convex URL is not configured.");
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
