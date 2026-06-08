import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";

import { AuthLoadingCard } from "@/components/auth/auth-loading-card";
import { BrandMark } from "@/components/brand/brand-mark";

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <div className="grid justify-items-center gap-5">
        <BrandMark className="text-lg" iconSize="lg" />
        <ClerkLoading>
          <AuthLoadingCard description="Loading secure account setup…" title="Create your Wall Print Pro account" />
        </ClerkLoading>
        <ClerkLoaded>
          <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
        </ClerkLoaded>
      </div>
    </main>
  );
}
