import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { PublicRequestForm } from "@/components/request/public-request-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeadRequestIntent } from "@/lib/lead-request-contract";
import {
  readConvexRuntimeUrl,
  readWallPrintProAiConceptsConfigured,
  readWallPrintProPublicContactUrl,
  readWallPrintProPublicPhone
} from "@/lib/runtime-env";

export const dynamic = "force-dynamic";

type RequestPageProps = {
  searchParams?: Promise<{
    intent?: string;
  }>;
};

function readIntent(value: string | undefined): LeadRequestIntent {
  return value === "reserve" || value === "contact" || value === "concept" ? value : "concept";
}

function RequestSetupMissing() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-3xl place-items-center">
        <Card className="w-full shadow-[0_24px_70px_rgba(35,31,25,0.12)]">
          <CardHeader>
            <BrandMark href={null} iconSize="lg" />
            <CardDescription className="font-semibold uppercase">Request form unavailable</CardDescription>
            <CardTitle className="text-3xl md:text-5xl">Wall Print Pro requests are unavailable.</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <p className="text-base leading-7 text-muted-foreground">Ask the admin to refresh the request setup before collecting leads.</p>
            <Button asChild className="w-fit rounded-full" size="lg">
              <Link href="/gallery">Open gallery</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default async function RequestPage({ searchParams }: RequestPageProps) {
  if (!readConvexRuntimeUrl()) {
    return <RequestSetupMissing />;
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const defaultIntent = readIntent(resolvedSearchParams?.intent);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen max-w-6xl gap-5 px-4 py-4 md:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] md:px-6">
        <div className="grid content-start gap-6 py-2 md:py-6">
          <header className="flex items-center justify-between gap-4">
            <BrandMark ariaLabel="Wall Print Pro homepage" className="text-base sm:text-lg" />
            <Button asChild className="rounded-full" variant="ghost">
              <Link href="/gallery">Gallery</Link>
            </Button>
          </header>
          <div className="grid gap-4">
            <p className="font-semibold uppercase text-primary">Wall Print Pro request</p>
            <h1 className="text-4xl font-semibold leading-[0.98] text-balance md:text-6xl">Start a wall print request.</h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              Send the wall, artwork, or idea. The seller gets the contact details and can review a concept draft before quoting or scheduling.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border bg-secondary">
            <img alt="" className="aspect-[4/3] w-full object-cover" src="/artworks/chicago-final-1.png" />
          </div>
        </div>

        <section className="grid content-center py-2 md:py-6">
          <Card className="shadow-[0_24px_70px_rgba(35,31,25,0.12)]">
            <CardHeader>
              <CardDescription className="font-semibold uppercase">Contact gated draft</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">Request details</CardTitle>
            </CardHeader>
            <CardContent>
              <PublicRequestForm
                aiEnabled={readWallPrintProAiConceptsConfigured()}
                defaultIntent={defaultIntent}
                publicContactUrl={readWallPrintProPublicContactUrl()}
                publicPhone={readWallPrintProPublicPhone()}
              />
            </CardContent>
          </Card>
        </section>
      </section>
    </main>
  );
}
