import type { Metadata } from "next";

import { LOCAL_BUSINESS_NAP } from "@/lib/local-business";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Wall Print Pro handles contact details, project requests, uploads, and AI-generated artwork.",
  alternates: { canonical: "/privacy" }
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground md:py-20">
      <article className="mx-auto grid max-w-3xl gap-8">
        <header className="grid gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Wall Print Pro</p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Effective August 5, 2026</p>
        </header>

        <section className="grid gap-3">
          <h2 className="text-2xl font-semibold">What we store</h2>
          <p className="leading-7 text-muted-foreground">
            We privately store the contact and project information you submit so we can prepare your preview, estimate, and follow-up.
            This may include your name, email, phone number, project description, uploaded files, AI request, and generated preview assets.
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="text-2xl font-semibold">Community AI concepts</h2>
          <p className="leading-7 text-muted-foreground">
            When you request free AI generation and actively consent, Wall Print Pro may store the request and display the resulting
            artwork anonymously in its public website gallery. We do not publish your email, phone number, contact details, or raw prompt.
            New concepts are reviewed by automated text-and-image moderation before publication. Moderation may hold a concept privately
            instead of publishing it.
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="text-2xl font-semibold">Removal requests</h2>
          <p className="leading-7 text-muted-foreground">
            You may ask us to remove a published AI concept by emailing{" "}
            <a className="font-medium text-primary underline" href={`mailto:${LOCAL_BUSINESS_NAP.email}`}>{LOCAL_BUSINESS_NAP.email}</a>.
            Include enough information for us to identify the artwork. Removal from the public gallery does not require deletion of the
            private project record when we still need it for legitimate business, safety, or legal purposes.
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="text-2xl font-semibold">Questions</h2>
          <p className="leading-7 text-muted-foreground">
            Contact us at <a className="font-medium text-primary underline" href={`mailto:${LOCAL_BUSINESS_NAP.email}`}>{LOCAL_BUSINESS_NAP.email}</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
