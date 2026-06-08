import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { AdminNav } from "@/components/seller/admin-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isWallPrintProSellerIdentity } from "@/lib/seller-admin";

type ClerkEmailAddress = {
  id?: string | null;
  emailAddress?: string | null;
};

type ClerkUserLike = {
  primaryEmailAddressId?: string | null;
  primaryEmailAddress?: ClerkEmailAddress | null;
  emailAddresses?: ClerkEmailAddress[] | null;
};

function hasAdminRuntime() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CONVEX_URL);
}

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

function AdminSetupMissing() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-3xl place-items-center">
        <Card className="w-full shadow-[0_24px_70px_rgba(35,31,25,0.12)]">
          <CardHeader>
            <BrandMark href={null} iconSize="lg" />
            <CardDescription className="font-semibold uppercase">Admin workspace unavailable</CardDescription>
            <CardTitle className="text-3xl md:text-5xl">The admin workspace is unavailable.</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <p className="text-base leading-7 text-muted-foreground">
              Ask the admin to refresh the workspace setup before creating preview links.
            </p>
            <Button asChild className="w-fit" size="lg">
              <Link href="/">Open sample gallery</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function AdminAccessDenied({ email, userId }: { email: string | null; userId: string }) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-3xl place-items-center">
        <Card className="w-full shadow-[0_24px_70px_rgba(35,31,25,0.12)]">
          <CardHeader>
            <BrandMark href={null} iconSize="lg" />
            <CardDescription className="font-semibold uppercase text-destructive">Admin access denied</CardDescription>
            <CardTitle className="text-3xl md:text-5xl">This account cannot open the admin workspace.</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-3 text-base leading-7 text-muted-foreground">
              <p>The signed-in account is not on the Wall Print Pro admin list, so the admin workspace was not opened.</p>
              <Alert variant="destructive">
                <AlertDescription className="break-all font-semibold">
                  {email ? `Signed in as ${email}` : `Signed in with account ID ${userId}`}
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className="w-fit" size="lg">
                <Link href="/">Open sample gallery</Link>
              </Button>
              <UserButton />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!hasAdminRuntime()) {
    return <AdminSetupMissing />;
  }

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  const user = await currentUser();
  const email = getClerkUserEmail(user);

  if (!isWallPrintProSellerIdentity({ subject: userId, email })) {
    return <AdminAccessDenied email={email} userId={userId} />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 md:px-6">
        <header className="flex min-h-14 items-center justify-between gap-4 border-b py-3">
          <BrandMark ariaLabel="Wall Print Pro homepage" className="text-lg" textClassName="hidden sm:inline" />
          <AdminNav />
        </header>
        {children}
      </div>
    </main>
  );
}
