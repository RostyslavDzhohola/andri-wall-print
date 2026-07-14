import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { PublicRequestForm } from "@/components/request/public-request-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  readConvexRuntimeUrl,
  readWallPrintProAiConceptsConfigured,
  readWallPrintProPublicContactUrl,
  readWallPrintProPublicPhone
} from "@/lib/runtime-env";
import { resolveReserveHref } from "@/lib/reserve-url";
import { resolveRequestPageDefaults, type RequestSearchParamsInput } from "@/lib/request-page-defaults";

export const dynamic = "force-dynamic";

type RequestPageProps = {
  searchParams?: Promise<RequestSearchParamsInput>;
};

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
  const requestDefaults = resolveRequestPageDefaults(resolvedSearchParams);
  const uploadFirst = requestDefaults.focusUpload;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto w-full max-w-3xl px-5 py-10 md:px-8 md:py-16">
        <header className="grid gap-4">
          <h1 className="text-4xl font-semibold leading-[0.98] text-balance md:text-6xl">Start a wall print request.</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            Reserve an on-site estimate. A Wall Print Pro team member will visit your space, measure the wall, review the surface,
            and confirm the project price.
          </p>
        </header>

        <Card className="mt-10 shadow-[0_24px_70px_rgba(35,31,25,0.12)]">
          <CardContent className="pt-6">
            <PublicRequestForm
              aiEnabled={readWallPrintProAiConceptsConfigured()}
              defaultConceptPrompt={requestDefaults.defaultConceptPrompt}
              defaultDesignContext={requestDefaults.defaultDesignContext}
              defaultIntent={requestDefaults.defaultIntent}
              publicContactUrl={readWallPrintProPublicContactUrl()}
              publicPhone={readWallPrintProPublicPhone()}
              reserveHref={resolveReserveHref()}
              uploadFirst={uploadFirst}
            />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
