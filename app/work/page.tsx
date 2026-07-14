import type { Metadata } from "next";

import { SocialProofSection } from "@/components/promotion/social-proof-section";
import { absoluteUrl } from "@/lib/site-url";

export const revalidate = 3600;

const PAGE_TITLE = "Wall Printing Chicago — Recent Work | Wall Print Pro";
const PAGE_DESCRIPTION =
  "See public Wall Print Pro customer results, business branding, and direct-to-wall printing projects.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/work") },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl("/work"),
    type: "website",
    images: [{ url: absoluteUrl("/brand/wallprint-pro-original.png") }]
  }
};

export default function WorkIndexPage() {
  return (
    <main>
      <header className="mx-auto w-full max-w-6xl px-5 pb-4 pt-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Wall Print Pro work</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Real prints, shown where they were published
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Explore customer results, business branding, and practical wall-printing examples from our public project posts.
        </p>
      </header>
      <SocialProofSection variant="library" />
    </main>
  );
}
