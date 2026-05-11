import { expect, test } from "@playwright/test";

test("homepage renders the native AR sample", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Preview one real-size wall print/i })).toBeVisible();
  await expect(page.locator("model-viewer")).toHaveAttribute("src", "/ar/static-tall-print.glb");
  await expect(page.locator("model-viewer")).toHaveAttribute("ios-src", "/ar/static-tall-print.usdz");
  await expect(page.getByTestId("open-ar-sample")).toHaveAttribute(
    "href",
    "/ar/static-tall-print.usdz"
  );
});

test("picture mode fallback is available from the homepage", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("header-picture-mode-link").click();

  await expect(page).toHaveURL(/\/picture-mode$/);
  await expect(page.getByRole("heading", { name: "Preview Picture" })).toBeVisible();
  await expect(page.getByText(/scan a wall, tap to place/i)).toBeVisible();
});
