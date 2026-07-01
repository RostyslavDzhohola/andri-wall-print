"use client";

import { CheckCircle2, Loader2, LogIn, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type BuyerPreviewSaveActionProps = {
  publicSlug: string;
  confirmationId?: string;
  onExistingConfirmation?: (confirmation: ExistingBuyerConfirmation | null) => void;
};

function signInUrl(publicSlug: string) {
  return `/sign-in?redirect_url=${encodeURIComponent(`/preview/${publicSlug}`)}`;
}

export type ExistingBuyerConfirmation = {
  id: string;
  buyerNote?: string;
};

type ExistingBuyerClaim = {
  confirmation?: ExistingBuyerConfirmation;
};

export function BuyerPreviewSaveAction({ publicSlug, confirmationId, onExistingConfirmation }: BuyerPreviewSaveActionProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const existingClaim = useQuery(api.buyerAccounts.getClaimForPublicSlug, isAuthenticated ? { publicSlug } : "skip") as
    | ExistingBuyerClaim
    | null
    | undefined;
  const claimPreview = useMutation(api.buyerAccounts.claimPublicPreview);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existingConfirmation = existingClaim?.confirmation ?? null;
  const isCheckingClaim = isAuthenticated && existingClaim === undefined;
  const isAlreadySaved = saved || Boolean(existingClaim);

  useEffect(() => {
    onExistingConfirmation?.(existingConfirmation);
  }, [existingConfirmation, onExistingConfirmation]);

  const savePreview = async () => {
    setBusy(true);
    setError(null);

    try {
      const savedClaim = (await claimPreview({
        publicSlug,
        ...(confirmationId ? { confirmationId: confirmationId as Id<"previewConfirmations"> } : {})
      })) as ExistingBuyerClaim;
      setSaved(true);
      onExistingConfirmation?.(savedClaim.confirmation ?? null);
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

  if (isCheckingClaim) {
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
        <Button className="min-h-11 rounded-full px-5" disabled={busy || isAlreadySaved} onClick={() => void savePreview()} type="button" variant="outline">
          {busy ? <Loader2 className="size-4 animate-spin" /> : isAlreadySaved ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}
          {isAlreadySaved ? "Saved to account" : "Save to account"}
        </Button>
        {isAlreadySaved ? (
          <Button asChild className="min-h-11 rounded-full px-5" type="button" variant="ghost">
            <Link href="/account">Open account</Link>
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
