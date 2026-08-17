import type { Metadata } from "next";

import { LOCAL_BUSINESS_NAP } from "@/lib/local-business";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for Wall Print Pro previews, AI-generated concepts, and community gallery publication.",
  alternates: { canonical: "/terms" }
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground md:py-20">
      <article className="mx-auto grid max-w-3xl gap-8">
        <header className="grid gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Wall Print Pro</p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Terms</h1>
          <p className="text-sm text-muted-foreground">Effective August 5, 2026</p>
        </header>

        <section className="grid gap-3">
          <h2 className="text-2xl font-semibold">Permission to display AI concepts</h2>
          <p className="leading-7 text-muted-foreground">
            If you select the publication-consent checkbox and submit an AI generation request, you give Wall Print Pro permission to
            store the request and display the resulting AI-generated artwork anonymously in its website gallery. Your contact details
            and raw prompt will not be displayed. You confirm that your request does not violate
            another person’s rights and that you have permission to provide any material included with it.
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="text-2xl font-semibold">Moderation and availability</h2>
          <p className="leading-7 text-muted-foreground">
            We may review, hold, hide, decline, or remove any concept. Consent does not guarantee publication, a particular placement, or
            continued availability. Generation and moderation services may fail or be temporarily unavailable.
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="text-2xl font-semibold">Concepts are not print-ready approvals</h2>
          <p className="leading-7 text-muted-foreground">
            AI concepts and augmented-reality previews are visual planning aids. They may contain inaccuracies and are not final proofs,
            production files, color guarantees, measurements, installation approvals, quotes, or promises that an image can be printed as
            shown. Wall Print Pro must separately confirm rights, resolution, dimensions, materials, site conditions, scope, and price.
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="text-2xl font-semibold">Removal</h2>
          <p className="leading-7 text-muted-foreground">
            To request removal of a community concept, email{" "}
            <a className="font-medium text-primary underline" href={`mailto:${LOCAL_BUSINESS_NAP.email}`}>{LOCAL_BUSINESS_NAP.email}</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
