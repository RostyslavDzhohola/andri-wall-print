import { expect, test } from "@playwright/test";

test("homepage renders the native AR sample", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Place this print on your wall/i })).toBeVisible();
  await expect(page.locator("model-viewer")).toHaveAttribute("src", "/ar/static-tall-print.glb");
  await expect(page.locator("model-viewer")).toHaveAttribute("ios-src", "/ar/static-tall-print.usdz");
  await expect(page.getByTestId("place-print-button")).toBeAttached();
  await expect(page.getByText("Camera not started")).toHaveCount(0);
  await expect(page.getByText("Picture mode")).toHaveCount(0);
});

test("old picture mode route is removed", async ({ page }) => {
  const response = await page.goto("/picture-mode");

  expect(response?.status()).toBe(404);
});
