"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

type AppProvidersProps = {
  children: ReactNode;
  clerkPublishableKey?: string;
  convexUrl?: string;
};

export function AppProviders({ children, clerkPublishableKey, convexUrl }: AppProvidersProps) {
  const convex = useMemo(() => (convexUrl ? new ConvexReactClient(convexUrl) : null), [convexUrl]);
  const content = <TooltipProvider>{children}</TooltipProvider>;

  if (!clerkPublishableKey && !convex) {
    return content;
  }

  if (!clerkPublishableKey && convex) {
    return <ConvexProvider client={convex}>{content}</ConvexProvider>;
  }

  if (!convex) {
    return (
      <ClerkProvider publishableKey={clerkPublishableKey} signInUrl="/sign-in" signUpUrl="/sign-up">
        {content}
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} signInUrl="/sign-in" signUpUrl="/sign-up">
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {content}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
