import Link from "next/link";

import { ArPreviewSurface } from "@/components/ar/ar-preview-surface";
import { BrandMark } from "@/components/brand/brand-mark";
import { PublicPreviewConfirmation } from "@/components/preview/public-preview-confirmation";
import { PublicPreviewHeaderAction } from "@/components/preview/public-preview-header-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicPreview } from "@/lib/convex-public-preview";
import { readClerkPublishableKey, readClerkSecretKey, readConvexRuntimeUrl } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicPreviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function previewAuthRuntimeAvailable() {
  return Boolean(readClerkPublishableKey() && readClerkSecretKey());
}

function PreviewHeaderAction({ publicSlug }: { publicSlug: string }) {
  if (!previewAuthRuntimeAvailable()) {
    return null;
  }

  return <PublicPreviewHeaderAction publicSlug={publicSlug} />;
}

function ConceptDraftNotice() {
  return (
    <Alert className="bg-background/80">
      <AlertDescription className="grid gap-3">
        <span className="flex flex-wrap gap-2">
          <Badge variant="outline">Concept draft</Badge>
          <Badge variant="outline">Not final artwork</Badge>
          <Badge variant="outline">Seller review required</Badge>
        </span>
        <span>This preview is an AI concept for review. Wall Print Pro must confirm artwork, size, and print readiness before production.</span>
      </AlertDescription>
    </Alert>
  );
}

export default async function PublicPreviewPage({ params }: PublicPreviewPageProps) {
  const { slug } = await params;
  const preview = await getPublicPreview(slug);
  const buyerAccountsEnabled = Boolean(readClerkPublishableKey() && readConvexRuntimeUrl());

  if (preview.status === "ready") {
    const isConceptDraft = preview.sourceKind === "ai_concept";

    return (
      <ArPreviewSurface
        brandName="Wall Print Pro"
        samples={[preview.sample]}
        heading="Open on iPhone Safari."
        headingClassName="max-w-[15ch] text-4xl leading-[1.03] sm:max-w-[16ch] md:text-5xl lg:max-w-[15ch]"
        intro="To see the wall preview, open this same link in Safari on an iPhone."
        headerAction={<PreviewHeaderAction publicSlug={slug} />}
        sideContent={
          <div className="grid gap-3">
            {isConceptDraft ? <ConceptDraftNotice /> : null}
            <PublicPreviewConfirmation
              buyerAccountsEnabled={buyerAccountsEnabled}
              sample={preview.sample}
              publicSlug={preview.sample.id}
              canSubmit={preview.source === "convex" && !isConceptDraft}
            />
          </div>
        }
        showPrintSizeGuide
      />
    );
  }

  const isPreparing = preview.status === "preparing";

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-3xl place-items-center">
        <Card className="w-full shadow-[0_24px_70px_rgba(35,31,25,0.12)]">
          <CardHeader>
            <BrandMark href={null} iconSize="lg" />
            <CardDescription className="font-semibold uppercase">{isPreparing ? "Client preview preparing" : "Client preview unavailable"}</CardDescription>
            <CardTitle className="text-3xl md:text-5xl">
              {isPreparing ? "This client preview is being prepared. Check back shortly." : "This client preview is not available."}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <p className="text-base leading-7 text-muted-foreground" data-testid="preview-unavailable-reason">
              {isPreparing
                ? "This page will show the artwork when it is ready."
                : "This client preview is unavailable. Ask for a fresh invite link."}
            </p>
            <Button asChild className="h-11 w-fit rounded-full px-5">
              <Link href="/gallery">Open gallery</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
