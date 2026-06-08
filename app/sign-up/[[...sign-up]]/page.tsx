import { SignUp } from "@clerk/nextjs";

import { BrandMark } from "@/components/brand/brand-mark";

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <div className="grid justify-items-center gap-5">
        <BrandMark className="text-lg" iconSize="lg" />
        <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
      </div>
    </main>
  );
}
