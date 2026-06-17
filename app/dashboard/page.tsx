import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getAccountDashboardPath, getClerkUserEmail } from "@/lib/account-routing";
import { readClerkPublishableKey, readClerkSecretKey } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";

function dashboardAuthRuntimeAvailable() {
  return Boolean(readClerkPublishableKey() && readClerkSecretKey());
}

function DashboardSetupMissing() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-3xl place-items-center">
        <Card className="w-full shadow-[0_24px_70px_rgba(35,31,25,0.12)]">
          <CardHeader>
            <BrandMark href={null} iconSize="lg" />
            <CardDescription className="font-semibold uppercase">Account sign-in unavailable</CardDescription>
            <h1 className="text-3xl font-semibold leading-tight md:text-5xl">Account routing is unavailable.</h1>
          </CardHeader>
          <CardContent className="grid gap-5">
            <p className="text-base leading-7 text-muted-foreground">
              Ask Wall Print Pro to refresh the account setup before opening a dashboard.
            </p>
            <Button asChild className="w-fit" size="lg">
              <Link href="/gallery">Open gallery</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default async function DashboardPage() {
  if (!dashboardAuthRuntimeAvailable()) {
    return <DashboardSetupMissing />;
  }

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/dashboard");
  }

  const user = await currentUser();

  if (!user) {
    redirect("/sign-in?redirect_url=/dashboard");
  }

  const email = getClerkUserEmail(user);

  redirect(getAccountDashboardPath({ subject: userId, email }));
}
