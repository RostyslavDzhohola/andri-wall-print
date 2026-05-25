import { expect, test } from "@playwright/test";

test("homepage renders a static artwork presentation with native AR assets", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Place this print on your wall/i })).toBeVisible();
  await expect(page.getByTestId("static-artwork-preview")).toBeVisible();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Dragon Wall Print");
  await expect(page.getByText("45 cm wide x 90 cm tall")).toBeVisible();
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("src", "/ar/dragon-wall-print.glb");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ios-src", "/ar/dragon-wall-print.usdz");
  await expect(page.getByTestId("ar-launcher-model")).not.toHaveAttribute("camera-controls", "");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/dragon-wall-print.usdz#allowsContentScaling=0");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("rel", "ar");
  await expect(page.locator('script[src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js"]')).toHaveCount(1);
  await expect(page.getByText("Camera not started")).toHaveCount(0);
  await expect(page.getByText("Picture mode")).toHaveCount(0);
});

test("bottom controls cycle the selected picture and native AR target", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Terra Forms");
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/terra-forms.png");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("src", "/ar/terra-forms.glb");
  await expect(page.getByTestId("ar-launcher-model")).toHaveAttribute("ios-src", "/ar/terra-forms.usdz");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/terra-forms.usdz#allowsContentScaling=0");

  await page.getByTestId("next-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Coastal Blocks");
  await expect(page.getByTestId("static-artwork-preview")).toHaveAttribute("src", "/artworks/coastal-blocks.png");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/coastal-blocks.usdz#allowsContentScaling=0");

  await page.getByTestId("previous-artwork").click();
  await expect(page.getByTestId("selected-artwork-title")).toHaveText("Terra Forms");
  await expect(page.getByTestId("quick-look-link")).toHaveAttribute("href", "/ar/terra-forms.usdz#allowsContentScaling=0");
});

test("old picture mode route is removed", async ({ page }) => {
  const response = await page.goto("/picture-mode");

  expect(response?.status()).toBe(404);
});
