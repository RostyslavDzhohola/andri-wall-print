import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { PublicRequestForm } from "@/components/request/public-request-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublishedGalleryEntryBySlug } from "@/lib/convex-public-gallery";
import {
  readConvexRuntimeUrl,
  readWallPrintProAiConceptsConfigured,
  readWallPrintProCommunityGalleryEnabled,
  readWallPrintProPublicContactUrl,
  readWallPrintProPublicPhone
} from "@/lib/runtime-env";
import { LOCAL_BUSINESS_NAP } from "@/lib/local-business";
import {
  readRequestGallerySlug,
  resolveRequestPageDefaults,
  type RequestSearchParamsInput
} from "@/lib/request-page-defaults";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request a wall print estimate",
  description: "Request a free estimate for custom wall printing in Chicago from Wall Print Pro.",
  alternates: { canonical: "/request" }
};

type RequestPageProps = {
  searchParams?: Promise<RequestSearchParamsInput>;
};

export function RequestSetupMissing() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-3xl place-items-center">
        <Card className="w-full shadow-[0_24px_70px_rgba(35,31,25,0.12)]">
          <CardHeader>
            <BrandMark href={null} iconSize="lg" />
            <CardDescription className="font-semibold uppercase">Request form unavailable</CardDescription>
            <CardTitle asChild className="text-3xl md:text-5xl">
              <h1>Wall Print Pro requests are unavailable.</h1>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <p className="text-base leading-7 text-muted-foreground">
              The estimate form is temporarily unavailable. Browse the gallery and check back later to send your project details.
            </p>
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
  const requestedGallerySlug = readRequestGallerySlug(resolvedSearchParams?.gallerySlug);
  const publishedGallerySample = requestedGallerySlug
    ? await getPublishedGalleryEntryBySlug(requestedGallerySlug)
    : null;
  const requestDefaults = resolveRequestPageDefaults(
    resolvedSearchParams,
    publishedGallerySample
      ? {
          id: publishedGallerySample.id,
          title: publishedGallerySample.title,
          description: publishedGallerySample.description,
          print: publishedGallerySample.print
        }
      : undefined
  );
  const uploadFirst = requestDefaults.focusUpload;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto w-full max-w-3xl px-5 py-10 md:px-8 md:py-16">
        <header className="grid gap-4">
          <h1 className="text-4xl font-semibold leading-[0.98] text-balance md:text-6xl">Request a wall print estimate.</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            Tell us about your wall and idea. A Wall Print Pro team member will review the project details, contact you about an
            on-site visit, and confirm the scope and price.
          </p>
          <p className="text-sm font-medium text-foreground">Takes about 60 seconds. No spam, no obligation.</p>
        </header>

        <Card className="mt-10 shadow-[0_24px_70px_rgba(35,31,25,0.12)]">
          <CardContent className="pt-6">
            <PublicRequestForm
              aiEnabled={readWallPrintProAiConceptsConfigured()}
              communityGalleryEnabled={readWallPrintProCommunityGalleryEnabled()}
              defaultConceptPrompt={requestDefaults.defaultConceptPrompt}
              defaultDesignContext={requestDefaults.defaultDesignContext}
              defaultIntent={requestDefaults.defaultIntent}
              publicContactUrl={readWallPrintProPublicContactUrl()}
              publicPhone={readWallPrintProPublicPhone()?.trim() || LOCAL_BUSINESS_NAP.telephone}
              uploadFirst={uploadFirst}
            />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
