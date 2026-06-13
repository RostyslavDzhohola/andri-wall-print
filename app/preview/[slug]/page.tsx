import { auth, currentUser } from "@clerk/nextjs/server";
import { CircleUserRound, LogIn, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ArPreviewSurface } from "@/components/ar/ar-preview-surface";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicPreview } from "@/lib/convex-public-preview";
import { readClerkPublishableKey, readClerkSecretKey } from "@/lib/runtime-env";
import { isWallPrintProSellerIdentity } from "@/lib/seller-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicPreviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ClerkEmailAddress = {
  id?: string | null;
  emailAddress?: string | null;
};

type ClerkUserLike = {
  primaryEmailAddressId?: string | null;
  primaryEmailAddress?: ClerkEmailAddress | null;
  emailAddresses?: ClerkEmailAddress[] | null;
};

function getClerkUserEmail(user: ClerkUserLike | null) {
  if (!user) {
    return null;
  }

  return (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.find((emailAddress) => emailAddress.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    null
  );
}

function previewSignInUrl(publicSlug: string) {
  return `/sign-in?redirect_url=${encodeURIComponent(`/preview/${publicSlug}`)}`;
}

function previewAuthRuntimeAvailable() {
  return Boolean(readClerkPublishableKey() && readClerkSecretKey());
}

async function PreviewHeaderAction({ publicSlug }: { publicSlug: string }) {
  if (!previewAuthRuntimeAvailable()) {
    return null;
  }

  const { userId } = await auth();

  if (!userId) {
    return (
      <Button asChild className="h-9 rounded-full px-4" variant="outline">
        <Link href={previewSignInUrl(publicSlug)}>
          <LogIn className="size-4" />
          Sign in
        </Link>
      </Button>
    );
  }

  const user = await currentUser();
  const email = getClerkUserEmail(user);
  const isAdmin = isWallPrintProSellerIdentity({ subject: userId, email });
  const dashboardPath = isAdmin ? "/admin" : "/account";
  const Icon = isAdmin ? ShieldCheck : CircleUserRound;

  return (
    <Button asChild className="h-9 rounded-full px-4" variant="outline">
      <Link href={dashboardPath}>
        <Icon className="size-4" />
        {isAdmin ? "Admin" : "Account"}
      </Link>
    </Button>
  );
}

export default async function PublicPreviewPage({ params }: PublicPreviewPageProps) {
  const { slug } = await params;
  const preview = await getPublicPreview(slug);

  if (preview.status === "ready") {
    return (
      <ArPreviewSurface
        brandName="Wall Print Pro"
        samples={[preview.sample]}
        heading="See it on your wall."
        headerAction={<PreviewHeaderAction publicSlug={slug} />}
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
