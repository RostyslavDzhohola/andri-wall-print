import Link from "next/link";

import { ArPreviewSurface } from "@/components/ar/ar-preview-surface";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicPreview } from "@/lib/convex-public-preview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicPreviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublicPreviewPage({ params }: PublicPreviewPageProps) {
  const { slug } = await params;
  const preview = await getPublicPreview(slug);

  if (preview.status === "ready") {
    return (
      <ArPreviewSurface
        brandName="Wall Print Pro"
        samples={[preview.sample]}
        heading="See it on your wall."
        intro={`${preview.sample.title} is ready. Use Place on wall to judge the fit in the real room.`}
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
              <Link href="/">Open sample gallery</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
