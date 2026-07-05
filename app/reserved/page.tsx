import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageSquareText, Phone } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { ReservedVisitLogger } from "@/components/reserved/reserved-visit-logger";
import { Button } from "@/components/ui/button";
import { readWallPrintProPublicContactUrl, readWallPrintProPublicPhone } from "@/lib/runtime-env";
import {
  RESERVED_DEPOSIT_COPY,
  RESERVED_DEPOSIT_HEADLINE,
  RESERVED_LICENSING_COPY,
  RESERVED_STEPS,
  resolveReservedPageModel,
  type ReservedSearchParamsInput
} from "@/lib/reserved-page-content";
import { absoluteUrl } from "@/lib/site-url";

// Post-payment confirmation is per-visit and analytics-only (session_id); it must
// never be statically cached with a stale receipt line.
export const dynamic = "force-dynamic";

const PAGE_TITLE = "Your print-job slot is reserved | Wall Print Pro";
const PAGE_DESCRIPTION =
  "Thank you — your $100 deposit reserves your Wall Print Pro print-job slot and is credited toward your final print price. Here's what happens next.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/reserved") },
  // A per-buyer confirmation page — keep it out of search results.
  robots: { index: false, follow: false }
};

// LAUNCH GATE: real phone from client. The env override
// (WALL_PRINT_PRO_PUBLIC_PHONE) wins when set; this placeholder keeps the
// contact block functional in every environment until the real number lands.
const PLACEHOLDER_PUBLIC_PHONE = "(312) 555-0100";

type ReservedPageProps = {
  searchParams?: Promise<ReservedSearchParamsInput>;
};

export default async function ReservedPage({ searchParams }: ReservedPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { sessionId, receiptLine } = resolveReservedPageModel(resolvedSearchParams);

  const phone = readWallPrintProPublicPhone()?.trim() || PLACEHOLDER_PUBLIC_PHONE;
  const telHref = `tel:${phone.replace(/\D/g, "")}`;
  const smsHref = `sms:${phone.replace(/\D/g, "")}`;
  const contactUrl = readWallPrintProPublicContactUrl()?.trim();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ReservedVisitLogger sessionId={sessionId} />

      <section className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <BrandMark ariaLabel="Wall Print Pro homepage" className="text-base sm:text-lg" />

        <header className="mt-10 max-w-2xl">
          <p className="text-sm font-medium text-primary">Deposit received · slot reserved</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {RESERVED_DEPOSIT_HEADLINE}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{RESERVED_DEPOSIT_COPY}</p>
          {receiptLine ? (
            <p className="mt-3 text-sm text-muted-foreground/80">{receiptLine}</p>
          ) : null}
        </header>

        <ol className="mt-10 grid gap-4">
          {RESERVED_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-[0.625rem] border border-border bg-card p-5 shadow-[0_24px_70px_rgba(35,31,25,.12)]"
            >
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              >
                {index + 1}
              </span>
              <div className="grid gap-1">
                <h2 className="text-lg font-semibold text-foreground">{step.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-[0.625rem] border border-primary/20 bg-primary/5 p-6 shadow-[0_24px_70px_rgba(35,31,25,.12)]">
          <h2 className="text-xl font-semibold text-foreground">Text or call to schedule your estimate</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The fastest way to lock a date — reach us directly and we'll get your estimate visit on the
            calendar. We reply to every reserved buyer within one business day.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button asChild className="min-h-11 rounded-full px-5" size="lg">
              <a href={telHref}>
                <Phone className="size-4" />
                Call {phone}
              </a>
            </Button>
            <Button asChild className="min-h-11 rounded-full px-5" size="lg" variant="outline">
              <a href={smsHref}>
                <MessageSquareText className="size-4" />
                Text us
              </a>
            </Button>
            {contactUrl ? (
              <Button asChild className="min-h-11 rounded-full px-5" size="lg" variant="ghost">
                <a href={contactUrl}>Send a message</a>
              </Button>
            ) : null}
          </div>
        </div>

        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">{RESERVED_LICENSING_COPY}</p>

        <div className="mt-8">
          <Button asChild className="min-h-11 rounded-full px-5" variant="ghost">
            <Link href="/work">
              See recent Chicago wall prints
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
