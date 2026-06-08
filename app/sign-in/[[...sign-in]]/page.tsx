import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";

import { AuthLoadingCard } from "@/components/auth/auth-loading-card";
import { BrandMark } from "@/components/brand/brand-mark";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <div className="grid justify-items-center gap-5">
        <BrandMark className="text-lg" iconSize="lg" />
        <ClerkLoading>
          <AuthLoadingCard description="Loading secure sign-in options…" title="Sign in to Wall Print Pro" />
        </ClerkLoading>
        <ClerkLoaded>
          <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
        </ClerkLoaded>
      </div>
    </main>
  );
}
