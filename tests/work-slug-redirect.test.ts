import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }
}));

describe("legacy work slugs", () => {
  it("redirects unknown slugs to the approved work gallery", async () => {
    const { default: WorkJobPage } = await import("@/app/work/[slug]/page");

    await expect(
      WorkJobPage({ params: Promise.resolve({ slug: "does-not-exist" }) })
    ).rejects.toThrow("REDIRECT:/work");
  });

  it("redirects former placeholder detail slugs to the approved work gallery", async () => {
    const { default: WorkJobPage } = await import("@/app/work/[slug]/page");
    const { getWorkSlugs } = await import("@/lib/work-content");
    const realSlug = getWorkSlugs()[0];

    await expect(
      WorkJobPage({ params: Promise.resolve({ slug: realSlug }) })
    ).rejects.toThrow("REDIRECT:/work");
  });
});
