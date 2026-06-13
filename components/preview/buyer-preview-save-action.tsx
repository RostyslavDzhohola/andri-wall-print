"use client";

import { CheckCircle2, Loader2, LogIn, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type BuyerPreviewSaveActionProps = {
  publicSlug: string;
  confirmationId?: string;
};

function signInUrl(publicSlug: string) {
  return `/sign-in?redirect_url=${encodeURIComponent(`/preview/${publicSlug}`)}`;
}

export function BuyerPreviewSaveAction({ publicSlug, confirmationId }: BuyerPreviewSaveActionProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const claimPreview = useMutation(api.buyerAccounts.claimPublicPreview);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savePreview = async () => {
    setBusy(true);
    setError(null);

    try {
      await claimPreview({
        publicSlug,
        ...(confirmationId ? { confirmationId: confirmationId as Id<"previewConfirmations"> } : {})
      });
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this preview.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <Button className="min-h-11 rounded-full px-5" disabled type="button" variant="outline">
        <Loader2 className="size-4 animate-spin" />
        Checking account
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button asChild className="min-h-11 rounded-full px-5" type="button" variant="outline">
        <Link href={signInUrl(publicSlug)}>
          <LogIn className="size-4" />
          Sign in to save
        </Link>
      </Button>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11 rounded-full px-5" disabled={busy || saved} onClick={() => void savePreview()} type="button" variant="outline">
          {busy ? <Loader2 className="size-4 animate-spin" /> : saved ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}
          {saved ? "Saved to account" : "Save to account"}
        </Button>
        {saved ? (
          <Button asChild className="min-h-11 rounded-full px-5" type="button" variant="ghost">
            <Link href="/account">Open account</Link>
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
