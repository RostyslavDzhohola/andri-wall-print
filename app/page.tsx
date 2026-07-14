import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { ArPreviewSurface } from "@/components/ar/ar-preview-surface";
import { HomepageDemoActions } from "@/components/promotion/homepage-demo-actions";
import { SocialProofSection } from "@/components/promotion/social-proof-section";
import { LocalBusinessJsonLd } from "@/components/seo/local-business-jsonld";
import { Button } from "@/components/ui/button";
import { LOCAL_BUSINESS_NAP } from "@/lib/local-business";
import {
  HOME_COMPARISON_COLUMNS,
  HOME_COMPARISON_HEADING,
  HOME_COMPARISON_ROWS,
  HOME_COMPARISON_SUBHEAD,
  HOME_FOOTER_TAGLINE,
  HOME_HEADLINE,
  HOME_LOCATION_BADGE,
  HOME_PROCESS_HEADING,
  HOME_PROCESS_STEPS,
  HOME_RESERVE_STRIP_BODY,
  HOME_RESERVE_STRIP_CTA,
  HOME_RESERVE_STRIP_HEADLINE,
  HOME_SUBHEAD,
} from "@/lib/product-copy";
import { resolveReserveHref } from "@/lib/reserve-url";
import { cn } from "@/lib/utils";

function ChicagoBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
      {HOME_LOCATION_BADGE}
    </span>
  );
}

function ComparisonTable() {
  return (
    <section className="border-t bg-background px-4 py-12 md:px-6 md:py-16" data-testid="home-comparison">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-semibold leading-tight md:text-4xl">{HOME_COMPARISON_HEADING}</h2>
        <p className="mt-2 max-w-xl text-base leading-7 text-muted-foreground">{HOME_COMPARISON_SUBHEAD}</p>

        <div className="mt-8 overflow-x-auto rounded-lg border bg-card shadow-[0_24px_70px_rgba(35,31,25,.12)]">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <caption className="sr-only">Wall Print Pro compared with vinyl wrap and hand-painted murals.</caption>
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 font-medium text-muted-foreground" scope="col">
                  <span className="sr-only">Feature</span>
                </th>
                {HOME_COMPARISON_COLUMNS.map((column, index) => (
                  <th
                    className={cn(
                      "px-4 py-3 font-semibold",
                      index === 0 ? "text-primary" : "text-muted-foreground"
                    )}
                    key={column}
                    scope="col"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOME_COMPARISON_ROWS.map((row) => (
                <tr className="border-b last:border-b-0" key={row.feature}>
                  <th className="px-4 py-3 font-medium text-foreground" scope="row">
                    {row.feature}
                  </th>
                  {/* LAUNCH GATE: verify with client */}
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {row.feature.includes("AR") ? (
                      <span className="inline-flex items-center gap-1.5 text-primary">
                        <Check className="size-4" aria-hidden="true" />
                        {row.wallPrintPro}
                      </span>
                    ) : (
                      row.wallPrintPro
                    )}
                  </td>
                  {/* LAUNCH GATE: verify with client */}
                  <td className="px-4 py-3 text-muted-foreground">{row.vinylWrap}</td>
                  {/* LAUNCH GATE: verify with client */}
                  <td className="px-4 py-3 text-muted-foreground">{row.handPainted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {/* LAUNCH GATE: verify with client — comparison figures above are plausible placeholders. */}
          Comparison figures are estimates pending client verification.
        </p>
      </div>
    </section>
  );
}

function ReserveStrip({ href }: { href: string }) {
  return (
    <section className="bg-foreground px-4 py-10 text-background md:px-6" data-testid="home-reserve-strip">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{HOME_RESERVE_STRIP_HEADLINE}</h2>
          <p className="mt-2 text-sm leading-6 text-background/70">{HOME_RESERVE_STRIP_BODY}</p>
        </div>
        <Button asChild className="min-h-11 rounded-full bg-background px-6 text-foreground hover:bg-background/90" size="lg">
          <Link data-testid="home-reserve-cta" href={href}>
            {HOME_RESERVE_STRIP_CTA}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function ProcessSteps() {
  return (
    <section className="border-t bg-muted/30 px-4 py-12 md:px-6 md:py-16" data-testid="home-process">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Process</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">{HOME_PROCESS_HEADING}</h2>

        <ol className="mt-8 grid gap-4">
          {HOME_PROCESS_STEPS.map((step, index) => (
            <li className="flex gap-4 rounded-lg border bg-card p-5 shadow-sm" key={step.title}>
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              >
                {index + 1}
              </span>
              <div className="grid gap-1">
                <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const HOME_FAQS = [
  {
    question: "What happens after I request an estimate?",
    answer:
      "A Wall Print Pro team member contacts you to schedule an on-site visit, measure the wall, inspect the surface, and confirm the project price."
  },
  {
    question: "Can I use my own artwork or business logo?",
    answer:
      "Yes. You can upload artwork or a logo from the homepage, or describe the custom design you want us to review."
  },
  {
    question: "How do I know whether my wall can be printed?",
    answer:
      "Share the wall details in your request. We confirm the surface, access, measurements, and preparation needs during the estimate visit."
  },
  {
    question: "How does the $100 priority reservation work?",
    answer:
      "The reservation moves your estimate into priority scheduling, and the full $100 is credited toward your wall print."
  },
  {
    question: "When will I receive the final price?",
    answer:
      "We confirm the price after the on-site estimate, once the wall size, surface, artwork, and installation requirements are clear."
  }
] as const;

function FaqSection() {
  return (
    <section className="border-t bg-background px-5 py-16 md:px-8 md:py-24" data-testid="home-faq">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">FAQ</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">Questions before your estimate</h2>
        <div className="mt-10 divide-y divide-border border-y border-border">
          {HOME_FAQS.map((item) => (
            <details className="group py-5" key={item.question}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold text-foreground">
                {item.question}
                <span aria-hidden="true" className="text-2xl font-normal text-primary group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="max-w-3xl pb-2 pr-12 text-sm leading-7 text-muted-foreground md:text-base">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalQuoteCta() {
  return (
    <section className="border-t bg-primary px-4 py-12 text-primary-foreground md:px-6 md:py-16" data-testid="home-final-quote">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">Your wall is next</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">See your idea on the wall before you commit.</h2>
        </div>
        <Button asChild className="min-h-11 rounded-full bg-background px-6 text-foreground hover:bg-background/90" size="lg">
          <Link data-testid="home-final-quote-cta" href="/request">
            Free Demo
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function SiteFooter() {
  // Footer NAP renders from the SAME lib/local-business.ts constants that feed
  // the LocalBusiness JSON-LD (single source of truth).
  // LAUNCH GATE: real NAP (name, address, phone) lives in lib/local-business.ts.
  const telHref = `tel:${LOCAL_BUSINESS_NAP.telephone.replace(/[^\d+]/g, "")}`;

  return (
    <footer className="border-t bg-background px-4 py-12 md:px-6" data-testid="home-footer">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        <div className="grid gap-2">
          <p className="text-lg font-semibold text-foreground">{LOCAL_BUSINESS_NAP.name}</p>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">{HOME_FOOTER_TAGLINE}</p>
        </div>
        <address className="grid gap-1 text-sm not-italic text-muted-foreground md:justify-self-end md:text-right">
          <span>{LOCAL_BUSINESS_NAP.streetAddress}</span>
          <span>
            {LOCAL_BUSINESS_NAP.addressLocality}, {LOCAL_BUSINESS_NAP.addressRegion} {LOCAL_BUSINESS_NAP.postalCode}
          </span>
          <a className="font-medium text-primary hover:underline" href={telHref}>
            {LOCAL_BUSINESS_NAP.telephone}
          </a>
          <a className="font-medium text-primary hover:underline" href={`mailto:${LOCAL_BUSINESS_NAP.email}`}>
            {LOCAL_BUSINESS_NAP.email}
          </a>
        </address>
      </div>
    </footer>
  );
}

function HomeSections({ reserveHref }: { reserveHref: string }) {
  return (
    <>
      <SocialProofSection />
      <ComparisonTable />
      <ReserveStrip href={reserveHref} />
      <ProcessSteps />
      <FaqSection />
      <FinalQuoteCta />
      <SiteFooter />
    </>
  );
}

export default function Home() {
  const reserveHref = resolveReserveHref();

  return (
    <>
      <LocalBusinessJsonLd />
      <ArPreviewSurface
        heading={HOME_HEADLINE}
        headingClassName="max-w-[12ch] text-[2.25rem] sm:text-[2.75rem] md:max-w-[11ch] md:text-[3rem] lg:max-w-[16ch] lg:text-6xl"
        intro={HOME_SUBHEAD}
        eyebrow={<ChicagoBadge />}
        sideContent={<HomepageDemoActions />}
        afterContent={<HomeSections reserveHref={reserveHref} />}
      />
    </>
  );
}
