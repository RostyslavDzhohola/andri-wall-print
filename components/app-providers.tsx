"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

type AppProvidersProps = {
  children: ReactNode;
  convexUrl?: string;
};

export function AppProviders({ children, convexUrl }: AppProvidersProps) {
  const convex = useMemo(() => (convexUrl ? new ConvexReactClient(convexUrl) : null), [convexUrl]);
  const content = <TooltipProvider>{children}</TooltipProvider>;

  if (!convex) {
    return content;
  }

  return <ConvexProvider client={convex}>{content}</ConvexProvider>;
}
