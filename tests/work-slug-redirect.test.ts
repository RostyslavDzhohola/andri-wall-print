import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// The detail page renders next/image + next/link (client-ish modules) and calls
// redirect() from next/navigation for unknown slugs. Mock the rendering deps so
// the module loads in the node test env, and make redirect() observable.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children)
}));

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

  it("relies on the shared site header instead of rendering a custom back link", async () => {
    const { default: WorkJobPage } = await import("@/app/work/[slug]/page");
    const { getWorkSlugs } = await import("@/lib/work-content");
    const page = await WorkJobPage({ params: Promise.resolve({ slug: getWorkSlugs()[0] }) });
    const markup = renderToStaticMarkup(page);

    expect(markup).not.toContain("All wall printing Chicago work");
    expect(markup).not.toContain('href="/work"');
    expect(markup).toContain('href="/gallery"');
  });
});
