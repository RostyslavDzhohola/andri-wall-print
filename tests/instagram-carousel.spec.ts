import { expect, test } from "@playwright/test";

test("authorized Instagram media uses one clean in-page viewport", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const playing = new WeakSet<HTMLMediaElement>();

    Object.defineProperty(HTMLMediaElement.prototype, "paused", {
      configurable: true,
      get() {
        return !playing.has(this as HTMLMediaElement);
      }
    });
    HTMLMediaElement.prototype.play = function () {
      playing.add(this);
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      playing.delete(this);
      this.dispatchEvent(new Event("pause"));
    };
  });

  await page.route("**/api/instagram-projects", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        projects: [
          {
            projectId: "label808-studio",
            mediaId: "label808_media",
            kind: "video",
            mediaUrl: "https://cdn.example.test/label808.mp4",
            posterUrl: "/artworks/chicago-final-1.png",
            canonicalUrl: "https://www.instagram.com/wall_printpro/p/DY0fWs8jcoi/",
            title: "A recording studio brought to life",
            summary: "A commercial wall-printing project created for the Label808 music studio."
          },
          {
            projectId: "business-logo-wall",
            mediaId: "logo_media",
            kind: "image",
            mediaUrl: "/artworks/chicago-final-2.png",
            posterUrl: null,
            canonicalUrl: "https://www.instagram.com/wall_printpro/reel/DZLMtbGseuj/",
            title: "A business logo, printed directly on the wall",
            summary: "A branding example for offices, studios, restaurants, and retail spaces."
          }
        ]
      })
    })
  );
  await page.route("https://cdn.example.test/**", (route) => route.abort());

  await page.goto("/work");

  const carousel = page.getByTestId("instagram-project-carousel");
  await expect(carousel).toBeVisible();
  await expect(page.getByTestId("instagram-project-video")).toHaveCount(1);
  await expect(page.getByTestId("instagram-project-image")).toHaveCount(0);
  await expect(carousel.locator("iframe")).toHaveCount(0);
  await expect(carousel.locator('a[href*="instagram.com"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "A recording studio brought to life" })).toBeVisible();

  const playback = page.getByTestId("instagram-project-playback");
  await expect(playback).toHaveAccessibleName("Play A recording studio brought to life");
  await expect
    .poll(() => playback.locator("span").evaluate((element) => getComputedStyle(element).transitionDuration))
    .toBe("0s");
  await playback.click();
  await expect(playback).toHaveAccessibleName("Pause A recording studio brought to life");

  await page.getByTestId("instagram-project-next").click();
  await expect(page.getByTestId("instagram-project-image")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "A business logo, printed directly on the wall" })).toBeVisible();

  await carousel.press("ArrowLeft");
  await expect(page.getByTestId("instagram-project-video")).toHaveCount(1);
  await expect(playback).toHaveAccessibleName("Play A recording studio brought to life");

  await carousel.press("ArrowRight");
  await expect(page.getByTestId("instagram-project-image")).toHaveCount(1);

  await carousel.evaluate((element) => {
    const touchStart = new Event("touchstart", { bubbles: true });
    const touchEnd = new Event("touchend", { bubbles: true });

    Object.defineProperty(touchStart, "touches", { value: [{ clientX: 300 }] });
    Object.defineProperty(touchEnd, "changedTouches", { value: [{ clientX: 380 }] });
    element.dispatchEvent(touchStart);
    element.dispatchEvent(touchEnd);
  });
  await expect(page.getByTestId("instagram-project-video")).toHaveCount(1);
});

test("a stalled direct-media request restores the official Instagram fallback", async ({ page }) => {
  await page.route("**/api/instagram-projects", async () => {
    await new Promise(() => undefined);
  });

  await page.goto("/work");

  await expect(page.getByTestId("instagram-project-loading")).toBeVisible();
  await expect(page.getByTestId("instagram-proof-list")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId("instagram-proof-container")).toHaveCount(5);
});
