import { describe, expect, it, vi } from "vitest";

// The detail page renders next/image + next/link (client-ish modules) and calls
// redirect() from next/navigation for unknown slugs. Mock the rendering deps so
// the module loads in the node test env, and make redirect() observable.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: () => null }));

describe("unknown work slug", () => {
  it("redirects to /work", async () => {
    const { default: WorkJobPage } = await import("@/app/work/[slug]/page");

    await expect(
      WorkJobPage({ params: Promise.resolve({ slug: "does-not-exist" }) })
    ).rejects.toThrow("REDIRECT:/work");
  });

  it("does not redirect for a real slug", async () => {
    const { default: WorkJobPage } = await import("@/app/work/[slug]/page");
    const { getWorkSlugs } = await import("@/lib/work-content");
    const realSlug = getWorkSlugs()[0];

    await expect(
      WorkJobPage({ params: Promise.resolve({ slug: realSlug }) })
    ).resolves.toBeDefined();
  });
});
