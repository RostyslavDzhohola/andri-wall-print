"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { CheckCircle2, Copy, Loader2, RefreshCw, RotateCcw, Smartphone, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getInitialClientPreviewUrl, resolveClientPreviewUrl } from "@/lib/client-preview-url";
import { formatSquareFeet, formatUsdCents } from "@/lib/pricing-estimator";
import { formatPreviewConfirmationAreaBasis } from "@/lib/preview-confirmation-contract";
import { previewSourceLabel, previewStatusLabel, wallPreviewIssueMessage } from "@/lib/product-copy";

type BundleDetailProps = {
  bundleId: string;
};

const previewBundlesApi = api.previewBundles;

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

export function BundleDetail({ bundleId }: BundleDetailProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const searchParams = useSearchParams();
  const previewBundleId = bundleId as Id<"previewBundles">;
  const bundle = useQuery(previewBundlesApi.getForSeller, isAuthenticated ? { bundleId: previewBundleId } : "skip");
  const retryBundle = useMutation(previewBundlesApi.retryBundle);
  const revokeBundle = useMutation(previewBundlesApi.revokeBundle);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState("");
  const [publicUrlWarning, setPublicUrlWarning] = useState<string | null>(null);
  const from = searchParams.get("from");
  const backHref = from && from.startsWith("/") && !from.startsWith("//") ? from : "/admin";

  useEffect(() => {
    let ignore = false;

    setPublicUrl("");
    setPublicUrlWarning(null);

    if (!bundle) {
      return;
    }

    setPublicUrl(getInitialClientPreviewUrl(bundle.publicUrl));

    void resolveClientPreviewUrl(bundle.publicUrl).then((resolved) => {
      if (ignore) {
        return;
      }

      setPublicUrl(resolved.url);
      setPublicUrlWarning(resolved.warning);
    });

    return () => {
      ignore = true;
    };
  }, [bundle]);

  const copyLink = async () => {
    if (!publicUrl) {
      return;
    }

    if (!navigator.clipboard) {
      setNotice("Could not copy link. Please copy manually.");
      return;
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      setNotice("Client preview link copied.");
    } catch (caught) {
      console.error("Failed to copy client preview link.", caught);
      setNotice("Could not copy link. Please copy manually.");
    }
  };

  const retry = async () => {
    setBusy("retry");
    setNotice(null);

    try {
      await retryBundle({ bundleId: previewBundleId });
      setNotice("This client preview is being prepared again.");
    } catch (caught) {
      console.error("Failed to retry client preview.", caught);
      setNotice("Could not prepare again. Please try later.");
    } finally {
      setBusy(null);
    }
  };

  const revoke = async () => {
    setBusy("revoke");
    setNotice(null);

    try {
      await revokeBundle({ bundleId: previewBundleId });
      setNotice("Client preview disabled.");
    } catch (caught) {
      console.error("Failed to disable client preview.", caught);
      setNotice("Could not disable preview. Please try later.");
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || !isAuthenticated || bundle === undefined) {
    return (
      <section className="grid gap-4 py-6">
        <Skeleton className="h-8 max-w-sm" />
        <Skeleton className="h-48" />
      </section>
    );
  }

  if (!bundle) {
    return (
      <section className="grid gap-4 py-6">
        <h1 className="text-4xl font-semibold">Wall preview not found</h1>
        <Button asChild className="w-fit rounded-full" variant="link">
          <Link href={backHref}>Back</Link>
        </Button>
      </section>
    );
  }

  const canCopy = bundle.status === "ready";
  const canRetry = bundle.status === "failed" || bundle.status === "rejected";
  const canRevoke = bundle.status !== "revoked";

  return (
    <section className="grid gap-6 py-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="grid gap-2">
          <Button asChild className="h-auto w-fit px-0" variant="link">
            <Link href={backHref}>Back</Link>
          </Button>
          <h1 className="text-4xl font-semibold leading-none">{bundle.title}</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">{bundle.description}</p>
        </div>
        <Badge className="w-fit px-3 py-1.5 text-sm" variant="outline">{previewStatusLabel(bundle.status)}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Client preview link</CardTitle>
            <CardDescription className="leading-6">Copy this link only after the client preview is ready to share.</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="break-all rounded-lg border bg-muted/60 p-3 text-sm">{publicUrl || bundle.publicUrl}</div>

            <div className="flex flex-wrap gap-2">
              <Button className="h-11 rounded-full px-5" disabled={!canCopy || busy !== null} onClick={() => void copyLink()} type="button">
                <Copy className="size-4" />
                Copy link
              </Button>
              <Button asChild className="h-11 rounded-full px-5" variant="outline">
                <a href={bundle.publicUrl} rel="noreferrer" target="_blank">
                  <Smartphone className="size-4" />
                Open client preview
                </a>
              </Button>
            </div>

            {notice ? (
              <Alert>
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            ) : null}
            {publicUrlWarning ? (
              <Alert>
                <AlertDescription>{publicUrlWarning}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Client preview details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="font-semibold">Status</dt>
              <dd className="text-muted-foreground">{previewStatusLabel(bundle.status)}</dd>
              <dt className="font-semibold">Source</dt>
              <dd className="text-muted-foreground">{previewSourceLabel(bundle.sourceKind)}</dd>
              <dt className="font-semibold">Print</dt>
              <dd className="text-muted-foreground">{bundle.print.label}</dd>
              <dt className="font-semibold">Area</dt>
              <dd className="text-muted-foreground">{formatSquareFeet(bundle.pricing.areaSquareFeet)} sq ft</dd>
              <dt className="font-semibold">Rate</dt>
              <dd className="text-muted-foreground">{formatUsdCents(bundle.pricing.pricePerSquareFootCents)} / sq ft</dd>
              <dt className="font-semibold">Internal estimate</dt>
              <dd className="text-muted-foreground">{formatUsdCents(bundle.pricing.estimateCents)}</dd>
            </dl>

            {bundle.failureReason || bundle.rejectionReason ? (
              <Alert variant="destructive">
                <AlertDescription>{bundle.rejectionReason ?? bundle.failureReason ?? wallPreviewIssueMessage()}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button className="h-11 rounded-full px-5" disabled={!canRetry || busy !== null} onClick={() => void retry()} type="button" variant="outline">
                {busy === "retry" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Prepare again
              </Button>
              <Button
                className="h-11 rounded-full px-5"
                disabled={!canRevoke || busy !== null}
                onClick={() => void revoke()}
                type="button"
                variant="destructive"
              >
                {busy === "revoke" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Disable
              </Button>
            </div>

            {bundle.status === "revoked" ? (
              <Alert>
                <RotateCcw className="size-4" />
                <AlertDescription>This client preview is disabled.</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="admin-confirmations">
        <CardHeader>
          <CardTitle className="text-xl">Submitted choices</CardTitle>
          <CardDescription className="leading-6">Confirmed dimensions and notes sent from the client preview page.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {bundle.confirmations.length === 0 ? (
            <Alert>
              <AlertDescription>No submitted choices yet.</AlertDescription>
            </Alert>
          ) : (
            bundle.confirmations.map((confirmation: {
              id: string;
              selectedPrintLabel: string;
              areaBasis: { kind: "selected_dimensions"; unit: "square_foot" | "square_meter"; value: number };
              internalEstimate?: { amount: number; currency: string; label: string; source: "area_rate" };
              buyerNote?: string;
              createdAt: number;
            }) => (
              <div className="grid gap-3 rounded-lg border bg-muted/40 p-4" key={confirmation.id}>
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="size-4 text-primary" />
                    <span>{confirmation.selectedPrintLabel}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatDate(confirmation.createdAt)}</span>
                </div>
                <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                  <dt className="font-semibold">Area basis</dt>
                  <dd className="text-muted-foreground">{formatPreviewConfirmationAreaBasis(confirmation.areaBasis)}</dd>
                  <dt className="font-semibold">Internal estimate</dt>
                  <dd className="text-muted-foreground">{confirmation.internalEstimate?.label ?? formatUsdCents(bundle.pricing.estimateCents)}</dd>
                  {confirmation.buyerNote ? (
                    <>
                      <dt className="font-semibold">Note</dt>
                      <dd className="text-muted-foreground">{confirmation.buyerNote}</dd>
                    </>
                  ) : null}
                </dl>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
