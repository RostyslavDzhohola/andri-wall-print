import type { Metadata } from "next";

import { ApprovedWorkGallery } from "@/components/promotion/approved-media-showcase";
import { absoluteUrl } from "@/lib/site-url";

export const revalidate = 3600;

const PAGE_TITLE = "Wall Printing Chicago — Recent Work";
const PAGE_DESCRIPTION =
  "See approved Wall Print Pro finished prints and clearly labeled wall-printing workshop demonstrations.";

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
          Real prints and the process behind them
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Explore finished wall prints and practical production examples. Workshop
          demonstrations are always labeled so they are not mistaken for installed
          client work.
        </p>
      </header>
      <ApprovedWorkGallery />
    </main>
  );
}
