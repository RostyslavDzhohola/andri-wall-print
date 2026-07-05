import Link from "next/link";
import { ArrowRight, Check, GalleryHorizontal, MessageCircle } from "lucide-react";

import { ArPreviewSurface } from "@/components/ar/ar-preview-surface";
import { HomepageDemoActions } from "@/components/promotion/homepage-demo-actions";
import { WorkVideosSection } from "@/components/promotion/work-videos-section";
import { LocalBusinessJsonLd } from "@/components/seo/local-business-jsonld";
import { Button } from "@/components/ui/button";
import { LOCAL_BUSINESS_NAP } from "@/lib/local-business";
import {
  HOME_COMPARISON_COLUMNS,
  HOME_COMPARISON_HEADING,
  HOME_COMPARISON_ROWS,
  HOME_COMPARISON_SUBHEAD,
  HOME_FOOTER_TAGLINE,
  HOME_LOCATION_BADGE,
  HOME_NAV_RESERVE_CTA,
  HOME_PORTFOLIO_TEASER_CTA,
  HOME_PROCESS_HEADING,
  HOME_PROCESS_STEPS,
  HOME_RESERVE_STRIP_BODY,
  HOME_RESERVE_STRIP_CTA,
  HOME_RESERVE_STRIP_HEADLINE,
  HOME_SPECS,
  HOME_SUBHEAD,
  HOME_TESTIMONIAL,
  HOME_WORK_HEADING,
  HOME_WORK_SUBHEAD
} from "@/lib/product-copy";
import { readWallPrintProReserveUrl } from "@/lib/runtime-env";
import { loadWorkJobs } from "@/lib/work-content";
import { cn } from "@/lib/utils";

// LAUNCH GATE: real Stripe Payment Link for the $100 print-job-slot deposit.
// The env override (WALL_PRINT_PRO_RESERVE_URL) wins when set; until then this
// placeholder routes the reserve intent through the existing request flow so the
// funnel stays functional in every environment.
const PLACEHOLDER_RESERVE_URL = "/request?intent=reserve";

function resolveReserveHref() {
  return readWallPrintProReserveUrl()?.trim() || PLACEHOLDER_RESERVE_URL;
}

function ChicagoBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
      {HOME_LOCATION_BADGE}
    </span>
  );
}

function SpecsBand() {
  return (
    <section aria-label="Print specifications" className="border-t bg-card px-4 py-8 md:px-6">
      <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4">
        {HOME_SPECS.map((spec) => (
          <div className="grid gap-1" key={spec.value}>
            <dt className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{spec.value}</dt>
            <dd className="text-sm text-muted-foreground">{spec.label}</dd>
          </div>
        ))}
      </dl>
    </section>
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

function Testimonial() {
  return (
    <section className="border-t bg-muted/30 px-4 py-12 md:px-6 md:py-16" data-testid="home-testimonial">
      <figure className="mx-auto max-w-3xl">
        <blockquote className="text-2xl font-medium leading-snug text-foreground md:text-3xl">
          &ldquo;{HOME_TESTIMONIAL.quote}&rdquo;
        </blockquote>
        {/* LAUNCH GATE: replace with a real, attributed Chicago client quote. */}
        <figcaption className="mt-4 text-sm text-muted-foreground">{HOME_TESTIMONIAL.attribution}</figcaption>
      </figure>
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

function PortfolioTeaser() {
  const jobs = loadWorkJobs().slice(0, 3);

  return (
    <section className="border-t bg-background px-4 py-12 md:px-6 md:py-16" data-testid="home-portfolio-teaser">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold leading-tight md:text-4xl">{HOME_WORK_HEADING}</h2>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{HOME_WORK_SUBHEAD}</p>
          </div>
          <Button asChild className="min-h-11 rounded-full px-5" size="lg" variant="outline">
            <Link href="/work">
              {HOME_PORTFOLIO_TEASER_CTA}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => {
            const photo = job.photos[0];

            return (
              <li key={job.slug}>
                <Link
                  className="group grid gap-3 rounded-lg border bg-card p-3 shadow-sm outline-offset-4 transition hover:shadow-[0_24px_70px_rgba(35,31,25,.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  href={`/work/${job.slug}`}
                >
                  <img
                    alt={photo.alt}
                    className="aspect-[4/3] w-full rounded-md object-cover"
                    draggable={false}
                    src={photo.src}
                  />
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {job.neighborhood} · {job.area}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
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
      <SpecsBand />
      <ComparisonTable />
      <Testimonial />
      <ReserveStrip href={reserveHref} />
      <section className="border-t bg-background px-4 pt-12 md:px-6 md:pt-16" aria-label="Recent work video">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-semibold leading-tight md:text-4xl">Watch real installs</h2>
        </div>
      </section>
      <WorkVideosSection />
      <ProcessSteps />
      <PortfolioTeaser />
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
        brandName="Wall Print Pro"
        heading="Not wallpaper. Not vinyl. Printed straight onto your wall."
        headingClassName="text-[2.5rem] max-w-3xl sm:max-w-3xl md:max-w-4xl lg:max-w-[16ch]"
        intro={HOME_SUBHEAD}
        eyebrow={<ChicagoBadge />}
        headerAction={
          <>
            <Button asChild className="min-h-10 rounded-full px-3 sm:min-h-11 sm:px-4" size="lg" variant="ghost">
              <Link href="/gallery">
                <GalleryHorizontal className="size-4" />
                <span className="sr-only sm:not-sr-only">Gallery</span>
              </Link>
            </Button>
            <Button asChild className="min-h-10 rounded-full px-3 sm:min-h-11 sm:px-4" size="lg" variant="ghost">
              <Link href="/work">
                <MessageCircle className="size-4" />
                <span className="sr-only sm:not-sr-only">Our work</span>
              </Link>
            </Button>
            <Button asChild className="min-h-10 rounded-full px-4 sm:min-h-11 sm:px-5" size="lg">
              <Link data-testid="home-nav-reserve" href={reserveHref}>
                {HOME_NAV_RESERVE_CTA}
              </Link>
            </Button>
          </>
        }
        sideContent={<HomepageDemoActions />}
        afterContent={<HomeSections reserveHref={reserveHref} />}
      />
      {/* Sticky bottom reserve bar (mobile only) — the 375px sticky CTA per spec. */}
      <div className="sticky bottom-0 z-40 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_30px_rgba(35,31,25,.10)] backdrop-blur md:hidden">
        <Button asChild className="min-h-11 w-full rounded-full" size="lg">
          <Link data-testid="home-sticky-reserve" href={reserveHref}>
            {HOME_NAV_RESERVE_CTA}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </>
  );
}
