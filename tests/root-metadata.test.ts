import { describe, expect, it, vi } from "vitest";

// next/font/google is only callable inside the Next build pipeline; stub it so we
// can import the layout module's metadata in a plain node test.
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-sans", className: "font-sans" })
}));

const { metadata } = await import("@/app/layout");

// Guards the public marketing metadata for the homepage/root layout. If the
// admin-era copy ("Admin workspace for wall preview links.") ever comes back, or
// the metadataBase/OG image regress, this snapshot fails loudly.
describe("root layout metadata", () => {
  it("exposes public marketing title + Chicago description (not admin copy)", () => {
    const title = metadata.title as { default: string; template: string };

    expect(title.default).toBe("Wall Print Pro — Custom wall printing in Chicago");
    expect(title.template).toBe("%s | Wall Print Pro");
    expect(metadata.description).toContain("Custom wall printing in Chicago");
    expect(metadata.description).not.toContain("Admin workspace");
  });

  it("sets an absolute metadataBase from the site-URL helper", () => {
    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect((metadata.metadataBase as URL).protocol).toBe("https:");
  });

  it("declares OG + Twitter defaults with a real work photo", () => {
    expect(metadata.openGraph?.title).toContain("Wall Print Pro");
    const ogImages = metadata.openGraph?.images as Array<{ url: string }>;
    expect(ogImages[0]?.url).toContain("/artworks/chicago-final-1.png");
    expect(metadata.twitter).toBeTruthy();
  });

  it("snapshot of the stable metadata shape", () => {
    expect({
      title: metadata.title,
      description: metadata.description,
      applicationName: metadata.applicationName,
      canonical: metadata.alternates?.canonical,
      ogType: (metadata.openGraph as { type?: string })?.type,
      ogSiteName: metadata.openGraph?.siteName,
      twitterCard: (metadata.twitter as { card?: string })?.card
    }).toMatchInlineSnapshot(`
      {
        "applicationName": "Wall Print Pro",
        "canonical": "/",
        "description": "Custom wall printing in Chicago. Choose a design, upload your art or logo, or describe an idea — then see it on your actual wall in AR before you commit. Wall prints from $500.",
        "ogSiteName": "Wall Print Pro",
        "ogType": "website",
        "title": {
          "default": "Wall Print Pro — Custom wall printing in Chicago",
          "template": "%s | Wall Print Pro",
        },
        "twitterCard": "summary_large_image",
      }
    `);
  });
});
