import { SignIn } from "@clerk/nextjs";

import { BrandMark } from "@/components/brand/brand-mark";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <div className="grid justify-items-center gap-5">
        <BrandMark className="text-lg" iconSize="lg" />
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
      </div>
    </main>
  );
}
