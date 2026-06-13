"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { CheckCircle2, Copy, DollarSign, ExternalLink, FileImage, Link2, Loader2, Plus, Save, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { CreatePreviewFlow } from "@/components/seller/create-preview-flow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AR_SAMPLES } from "@/lib/ar-sample";
import { getInitialClientPreviewUrl, resolveClientPreviewUrl } from "@/lib/client-preview-url";
import { formatSquareFeet, formatUsdCents, parseUsdRateInputToCents, type SellerPricingEstimate } from "@/lib/pricing-estimator";
import { formatPreviewBundlePrintDimensions } from "@/lib/preview-bundle-contract";
import {
  inviteLinkStatusLabel,
  previewCreationLabel,
  previewStatusGroup,
  previewStatusLabel,
  type PreviewStatusGroup
} from "@/lib/product-copy";

const previewBundlesApi = api.previewBundles;
const builderInvitesApi = api.builderInvites;
const sellerPricingApi = api.sellerPricing;
const dashboardSampleArtwork = AR_SAMPLES.slice(0, 3);

type SellerBundle = {
  id: Id<"previewBundles">;
  publicSlug: string;
  title: string;
  status: string;
  print: { label: string };
  pricing: SellerPricingEstimate;
  publicUrl: string;
  createdVia: "seller" | "builder";
  updatedAt: number;
  confirmations: SellerConfirmation[];
};

type SellerConfirmation = {
  id: string;
  selectedPrintLabel: string;
  createdAt: number;
};

type SellerInvite = {
  id: Id<"builderInvites">;
  status: "valid" | "expired" | "revoked" | "not_found";
  expiresAt: number;
  maxGenerations: number;
  generatedCount: number;
  remainingGenerations: number;
  maxUploadStarts: number;
  uploadStartedCount: number;
  remainingUploadStarts: number;
  revokedAt?: number;
  createdAt: number;
};

type CreatedInvite = {
  token: string;
  path: string;
  expiresAt: number;
};

type SellerPricingState = {
  currency: "USD";
  pricePerSquareFootCents: number;
  updatedAt: number | null;
};

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function absoluteUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

function statusTone(status: string) {
  const state = previewStatusGroup(status);

  if (state === "ready") {
    return "border-status-ready-border bg-status-ready text-status-ready-foreground";
  }

  if (state === "needsAttention" || state === "disabled") {
    return "border-status-danger-border bg-status-danger text-status-danger-foreground";
  }

  return "border-status-warning-border bg-status-warning text-status-warning-foreground";
}

function inviteStatusTone(status: SellerInvite["status"]) {
  if (status === "valid") {
    return "border-status-ready-border bg-status-ready text-status-ready-foreground";
  }

  return "border-status-danger-border bg-status-danger text-status-danger-foreground";
}

export function SellerDashboard() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bundles = useQuery(previewBundlesApi.listForSeller, isAuthenticated ? {} : "skip") as SellerBundle[] | undefined;
  const invites = useQuery(builderInvitesApi.listForSeller, isAuthenticated ? {} : "skip") as SellerInvite[] | undefined;
  const pricing = useQuery(sellerPricingApi.getForSeller, isAuthenticated ? {} : "skip") as SellerPricingState | undefined;
  const createInvite = useMutation(builderInvitesApi.createInvite);
  const revokeInvite = useMutation(builderInvitesApi.revokeInvite);
  const deleteBundle = useMutation(previewBundlesApi.deleteBundle);
  const updatePricing = useMutation(sellerPricingApi.updateForSeller);
  const [createdInvite, setCreatedInvite] = useState<CreatedInvite | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreatePreviewOpen, setIsCreatePreviewOpen] = useState(false);
  const [isInviteConfirmOpen, setIsInviteConfirmOpen] = useState(false);
  const [pricingInput, setPricingInput] = useState("0.00");
  const isAuthorizing = isLoading || !isAuthenticated;
  const [createdInviteUrl, setCreatedInviteUrl] = useState("");
  const counts = useMemo(() => {
    const result: Record<PreviewStatusGroup, number> = {
      ready: 0,
      preparing: 0,
      needsAttention: 0,
      disabled: 0
    };

    for (const bundle of bundles ?? []) {
      result[previewStatusGroup(bundle.status)] += 1;
    }

    return result;
  }, [bundles]);

  const activeInvites = (invites ?? []).filter((invite) => invite.status === "valid");
  const currentRoute = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  useEffect(() => {
    let ignore = false;

    setCreatedInviteUrl("");

    if (!createdInvite) {
      return;
    }

    setCreatedInviteUrl(getInitialClientPreviewUrl(createdInvite.path) || absoluteUrl(createdInvite.path));

    void resolveClientPreviewUrl(createdInvite.path).then((resolved) => {
      if (!ignore) {
        setCreatedInviteUrl(resolved.url);
      }
    });

    return () => {
      ignore = true;
    };
  }, [createdInvite]);

  useEffect(() => {
    if (!pricing) {
      return;
    }

    setPricingInput((pricing.pricePerSquareFootCents / 100).toFixed(2));
  }, [pricing]);

  const copyText = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(message);
      setError(null);
    } catch {
      setError("Could not copy the link from this browser.");
    }
  };

  const copyShareablePath = async (path: string, message: string) => {
    const resolved = await resolveClientPreviewUrl(path);
    await copyText(resolved.url, resolved.warning ? `${message} ${resolved.warning}` : message);
  };

  const savePricing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("pricing");
    setError(null);
    setNotice(null);

    try {
      const pricePerSquareFootCents = parseUsdRateInputToCents(pricingInput);
      const updated = (await updatePricing({ pricePerSquareFootCents })) as SellerPricingState;
      setPricingInput((updated.pricePerSquareFootCents / 100).toFixed(2));
      setNotice("Internal square-foot rate updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the square-foot rate.");
    } finally {
      setBusy(null);
    }
  };

  const createInviteLink = async () => {
    setBusy("create-invite");
    setError(null);
    setNotice(null);

    try {
      const invite = (await createInvite({})) as CreatedInvite;
      setCreatedInvite(invite);
      setNotice("Invite link created. This is a guest upload page, not the final client preview.");
      setIsInviteConfirmOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create an invite link.");
    } finally {
      setBusy(null);
    }
  };

  const revokeInviteLink = async (inviteId: Id<"builderInvites">) => {
    setBusy(inviteId);
    setError(null);
    setNotice(null);

    try {
      await revokeInvite({ inviteId });
      setNotice("Invite link disabled.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not disable the invite link.");
    } finally {
      setBusy(null);
    }
  };

  const deleteClientPreview = async (bundle: SellerBundle) => {
    if (!window.confirm(`Delete "${bundle.title}"? This removes the client preview link.`)) {
      return;
    }

    setBusy(`delete-${bundle.id}`);
    setError(null);
    setNotice(null);

    try {
      await deleteBundle({ bundleId: bundle.id });
      setNotice("Client preview deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the client preview.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="grid gap-5 py-6">
      <div className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end">
        <div className="grid max-w-2xl gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Admin workspace</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Create client previews, copy ready links, and keep guest upload invites separate from shareable results.
          </p>
        </div>
        <Button
          className="min-h-11 w-fit"
          disabled={isAuthorizing || busy !== null}
          onClick={() => setIsCreatePreviewOpen(true)}
          size="lg"
          type="button"
        >
          <Plus className="size-4" />
          Create preview
        </Button>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {notice}
      </div>
      {notice ? (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div
        className="grid gap-2 rounded-lg border bg-card p-2 text-sm sm:grid-cols-4"
        aria-label="Client preview status summary"
      >
        {[
          ["Ready", counts.ready],
          ["Preparing", counts.preparing],
          ["Needs attention", counts.needsAttention],
          ["Disabled", counts.disabled]
        ].map(([label, value]) => (
          <div className="flex min-h-11 items-center justify-between rounded-md bg-muted/40 px-3" key={label}>
            <span className="text-muted-foreground">{label}</span>
            <span className="text-lg font-semibold text-foreground">{value}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid content-start gap-3" aria-label="Client previews">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Client previews</h2>
              <p className="text-sm text-muted-foreground">{bundles?.length ?? 0} total</p>
            </div>
          </div>

          <Card>
            <CardContent className="px-0">
              {isAuthorizing || bundles === undefined ? (
                <div className="grid gap-3 p-5">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              ) : bundles.length === 0 ? (
                <div className="grid gap-4 p-6">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileImage className="size-5" />
                  </div>
                  <div className="grid gap-2">
                    <h3 className="text-2xl font-semibold">No client previews yet.</h3>
                    <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                      Existing artwork is ready below. Create a client preview when you want a shareable link.
                    </p>
                  </div>
                  <div className="grid gap-2" data-testid="dashboard-existing-artwork">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold">Existing artwork</h4>
                      <span className="text-xs text-muted-foreground">{dashboardSampleArtwork.length} ready</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {dashboardSampleArtwork.map((sample) => (
                        <div className="grid grid-cols-[56px_1fr] items-center gap-3 rounded-lg border bg-background p-2" key={sample.id}>
                          <img alt="" className="size-14 rounded-md object-cover" src={sample.assets.poster} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{sample.title}</div>
                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {formatPreviewBundlePrintDimensions(sample.print)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button className="min-h-11 w-fit" onClick={() => setIsCreatePreviewOpen(true)} size="lg" type="button">
                    <Plus className="size-4" />
                    Create preview
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client preview</TableHead>
                      <TableHead className="hidden w-[130px] sm:table-cell">Status</TableHead>
                      <TableHead className="hidden w-[190px] lg:table-cell">Internal estimate</TableHead>
                      <TableHead className="hidden w-[130px] md:table-cell">Updated</TableHead>
                      <TableHead className="w-[176px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundles.map((bundle) => {
                      const canCopy = previewStatusGroup(bundle.status) === "ready";
                      const latestConfirmation = bundle.confirmations[0];

                      return (
                        <TableRow key={bundle.id}>
                          <TableCell className="min-w-0 whitespace-normal">
                            <div className="truncate text-base font-semibold">{bundle.title}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {previewCreationLabel(bundle.createdVia)} · {bundle.print.label}
                            </div>
                            {latestConfirmation ? (
                              <div className="mt-2 flex items-center gap-1.5 text-sm text-foreground" data-testid="dashboard-confirmed-choice">
                                <CheckCircle2 className="size-4 text-primary" />
                                <span>
                                  Confirmed {latestConfirmation.selectedPrintLabel} · {formatDate(latestConfirmation.createdAt)}
                                </span>
                              </div>
                            ) : null}
                            <div className="mt-1 text-xs text-muted-foreground lg:hidden">
                              {formatSquareFeet(bundle.pricing.areaSquareFeet)} sq ft · {formatUsdCents(bundle.pricing.estimateCents)}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge className={statusTone(bundle.status)} variant="outline">
                              {previewStatusLabel(bundle.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="font-medium">{formatUsdCents(bundle.pricing.estimateCents)}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {formatSquareFeet(bundle.pricing.areaSquareFeet)} sq ft @ {formatUsdCents(bundle.pricing.pricePerSquareFootCents)}
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">{formatDate(bundle.updatedAt)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    aria-label={`Copy ${bundle.title} client preview link`}
                                    className="size-11"
                                    disabled={!canCopy}
                                    onClick={() => void copyShareablePath(bundle.publicUrl, "Client preview link copied.")}
                                    size="icon-lg"
                                    type="button"
                                    variant="outline"
                                  >
                                    <Copy className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{canCopy ? "Copy client preview" : "Client preview is not ready yet"}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button asChild aria-label={`Open ${bundle.title} details`} className="size-11" size="icon-lg" variant="outline">
                                    <Link href={`/admin/bundles/${bundle.id}?from=${encodeURIComponent(currentRoute)}`}>
                                      <ExternalLink className="size-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open details</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    aria-label={`Delete ${bundle.title} client preview`}
                                    className="size-11"
                                    disabled={busy !== null}
                                    onClick={() => void deleteClientPreview(bundle)}
                                    size="icon-lg"
                                    type="button"
                                    variant="destructive"
                                  >
                                    {busy === `delete-${bundle.id}` ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete client preview</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="grid content-start gap-3" aria-label="Internal settings and guest upload invites">
          <Card>
            <CardHeader>
              <CardTitle>Internal pricing</CardTitle>
              <CardDescription className="leading-6">Set the USD square-foot rate used for admin estimates.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {isAuthorizing || pricing === undefined ? (
                <div className="grid gap-2">
                  <Skeleton className="h-11" />
                  <Skeleton className="h-11" />
                </div>
              ) : (
                <form className="grid gap-3" onSubmit={savePricing}>
                  <div className="grid gap-2">
                    <Label htmlFor="price-per-square-foot">USD per sq ft</Label>
                    <div className="grid grid-cols-[auto_1fr] items-center rounded-lg border bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                      <span className="grid size-11 place-items-center text-muted-foreground">
                        <DollarSign className="size-4" />
                      </span>
                      <Input
                        className="h-11 border-0 pl-0 focus-visible:ring-0"
                        disabled={busy !== null}
                        id="price-per-square-foot"
                        inputMode="decimal"
                        min="0"
                        onChange={(event) => setPricingInput(event.target.value)}
                        step="0.01"
                        type="number"
                        value={pricingInput}
                      />
                    </div>
                  </div>
                  <Button className="min-h-11 w-full" disabled={busy !== null} size="lg" type="submit">
                    {busy === "pricing" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save rate
                  </Button>
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                    <div className="font-semibold">{formatUsdCents(pricing.pricePerSquareFootCents)} / sq ft</div>
                    <div className="mt-1 text-muted-foreground">Currency: {pricing.currency}</div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invite upload</CardTitle>
              <CardDescription className="leading-6">
                Creates a scoped guest upload page. The client preview is created separately after artwork is chosen.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="min-h-11 w-full"
                    disabled={isAuthorizing || busy !== null}
                    onClick={() => setIsInviteConfirmOpen(true)}
                    size="lg"
                    type="button"
                    variant="outline"
                  >
                    {busy === "create-invite" ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                    Invite someone to upload artwork
                  </Button>
                </TooltipTrigger>
                <TooltipContent>This creates a guest upload page, not the final client preview link.</TooltipContent>
              </Tooltip>

              {createdInvite ? (
                <div className="grid gap-3 rounded-lg border bg-muted/40 p-3" data-testid="admin-invite-link">
                  <div className="text-sm font-semibold">Invite link</div>
                  <p className="break-all rounded-md border bg-background p-3 text-sm leading-6">{createdInviteUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="min-h-11"
                      disabled={!createdInviteUrl}
                      onClick={() => void copyText(createdInviteUrl, "Invite link copied.")}
                      size="lg"
                      type="button"
                    >
                      <Copy className="size-4" />
                      Copy invite
                    </Button>
                    <Button asChild className="min-h-11" size="lg" variant="outline">
                      <Link href={createdInvite.path} target="_blank">
                        <ExternalLink className="size-4" />
                        Open invite
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Active invite links</h3>
                  <span className="text-sm text-muted-foreground">{activeInvites.length} active</span>
                </div>

                {isAuthorizing || invites === undefined ? (
                  <div className="grid gap-2">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : activeInvites.length === 0 ? (
                  <Alert>
                    <AlertDescription>No active invite links. Create one only when a guest should upload artwork.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid gap-2">
                    {activeInvites.map((invite) => (
                      <div className="grid gap-2 rounded-lg border bg-background p-3" key={invite.id}>
                        <div className="flex items-center justify-between gap-3">
                          <Badge className={inviteStatusTone(invite.status)} variant="outline">
                            {inviteLinkStatusLabel(invite.status)}
                          </Badge>
                          <Button
                            className="min-h-11"
                            disabled={busy !== null}
                            onClick={() => void revokeInviteLink(invite.id)}
                            size="lg"
                            type="button"
                            variant="destructive"
                          >
                            {busy === invite.id ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                            Disable
                          </Button>
                        </div>
                        <div className="text-sm leading-6 text-muted-foreground">
                          {invite.generatedCount} of {invite.maxGenerations} preview links created. {invite.uploadStartedCount} of{" "}
                          {invite.maxUploadStarts} uploads started. Expires {formatDate(invite.expiresAt)}.
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={isCreatePreviewOpen} onOpenChange={setIsCreatePreviewOpen}>
        <DialogContent className="max-h-[100svh] p-0 sm:max-w-5xl max-sm:h-[100svh] max-sm:w-screen max-sm:rounded-none">
          <DialogTitle className="sr-only">Create preview</DialogTitle>
          <DialogDescription className="sr-only">
            Choose artwork, preview it, and share a client preview link.
          </DialogDescription>
          <CreatePreviewFlow mode="modal" onCreated={() => setNotice("Client preview created.")} />
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteConfirmOpen} onOpenChange={setIsInviteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite someone to upload artwork?</DialogTitle>
            <DialogDescription>
              This creates a scoped guest upload page for collecting artwork. It is not the final client preview link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button className="min-h-11" disabled={busy !== null} size="lg" type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              className="min-h-11"
              disabled={busy !== null}
              onClick={() => void createInviteLink()}
              size="lg"
              type="button"
            >
              {busy === "create-invite" ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              Create invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
