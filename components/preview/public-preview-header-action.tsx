"use client";

import { LayoutDashboard, Loader2, LogIn } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

function previewSignInUrl(publicSlug: string) {
  return `/sign-in?redirect_url=${encodeURIComponent(`/preview/${publicSlug}`)}`;
}

export function PublicPreviewHeaderAction({ publicSlug }: { publicSlug: string }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <Button className="h-9 rounded-full px-4" disabled variant="outline">
        <Loader2 className="size-4 animate-spin" />
        Checking
      </Button>
    );
  }

  if (isSignedIn) {
    return (
      <Button asChild className="h-9 rounded-full px-4" variant="outline">
        <Link href="/dashboard">
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>
      </Button>
    );
  }

  return (
    <Button asChild className="h-9 rounded-full px-4" variant="outline">
      <Link href={previewSignInUrl(publicSlug)}>
        <LogIn className="size-4" />
        Sign in
      </Link>
    </Button>
  );
}
