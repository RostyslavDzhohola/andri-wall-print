"use client";

import { UserButton } from "@clerk/nextjs";
import { ExternalLink, ImageIcon, Images, Loader2, Ruler } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useConvexAuth, useQuery } from "convex/react";

import { BrandMark } from "@/components/brand/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

type BuyerDashboard = NonNullable<ReturnType<typeof useQuery<typeof api.buyerAccounts.getDashboard>>>;
type BuyerDashboardItem = BuyerDashboard["items"][number];

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function statusTone(status: string) {
  if (status === "ready") {
    return "default";
  }

  if (["uploaded", "validating", "generating"].includes(status)) {
    return "secondary";
  }

  return "destructive";
}

function statusLabel(status: string) {
  if (status === "ready") {
    return "Ready";
  }

  if (["uploaded", "validating", "generating"].includes(status)) {
    return "Preparing";
  }

  return "Unavailable";
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-24" />
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
    </div>
  );
}

function PreviewCard({ item }: { item: BuyerDashboardItem }) {
  return (
    <Card className="overflow-hidden" data-testid="buyer-preview-card">
      <CardContent className="grid gap-4 p-4 sm:grid-cols-[140px_minmax(0,1fr)]">
        <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-md border bg-muted sm:w-[140px]">
          {item.posterUrl ? (
            <img alt="" className="h-full w-full object-cover" src={item.posterUrl} />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        <div className="grid min-w-0 gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold">{item.title}</h2>
              <p className="text-sm text-muted-foreground">{item.sourceLabel}</p>
            </div>
            <Badge variant={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <Ruler className="size-4" aria-hidden="true" />
              <span data-testid="buyer-preview-dimensions">{item.print.label}</span>
            </div>
            <div>Saved {formatDate(item.savedAt)}</div>
          </div>

          {item.confirmation ? (
            <div className="grid gap-1 rounded-md border bg-muted/40 p-3 text-sm" data-testid="buyer-preview-confirmation">
              <div className="font-semibold">Confirmed choice</div>
              <div className="text-muted-foreground">{item.confirmation.selectedPrintLabel}</div>
              {item.confirmation.buyerNote ? <div className="text-muted-foreground">{item.confirmation.buyerNote}</div> : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild className="min-h-10 rounded-full px-4">
              <Link href={item.publicUrl}>
                <ExternalLink className="size-4" />
                Open preview
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BuyerAccountDashboard() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const dashboard = useQuery(api.buyerAccounts.getDashboard, isAuthenticated ? {} : "skip") as BuyerDashboard | undefined;
  const counts = useMemo(() => {
    const items = dashboard?.items ?? [];

    return {
      saved: items.length,
      uploaded: items.filter((item) => item.sourceKind === "upload").length,
      shared: items.filter((item) => item.createdVia === "seller").length
    };
  }, [dashboard?.items]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-5 px-4 py-4 md:px-6">
        <header className="flex min-h-14 items-center justify-between gap-4 border-b py-3">
          <BrandMark ariaLabel="Wall Print Pro homepage" className="text-lg" textClassName="hidden sm:inline" />
          <div className="flex items-center gap-2">
            <Button asChild className="h-9 rounded-full px-4" variant="ghost">
              <Link href="/gallery">Gallery</Link>
            </Button>
            <UserButton />
          </div>
        </header>

        <section className="grid content-start gap-5 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Account</p>
              <h1 className="text-4xl font-semibold tracking-normal md:text-5xl">Saved previews</h1>
            </div>
            <Button asChild className="min-h-11 rounded-full px-5">
              <Link href="/gallery">
                <Images className="size-4" />
                Open gallery
              </Link>
            </Button>
          </div>

          {isLoading || !isAuthenticated || !dashboard ? (
            <DashboardSkeleton />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3" data-testid="buyer-dashboard-summary">
                <div className="rounded-lg border bg-card p-4">
                  <div className="text-3xl font-semibold">{counts.saved}</div>
                  <div className="text-sm text-muted-foreground">Saved previews</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="text-3xl font-semibold">{counts.uploaded}</div>
                  <div className="text-sm text-muted-foreground">Uploaded pictures</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="text-3xl font-semibold">{counts.shared}</div>
                  <div className="text-sm text-muted-foreground">Shared previews</div>
                </div>
              </div>

              {dashboard.items.length === 0 ? (
                <div className="grid gap-3 rounded-lg border bg-card p-6">
                  <Loader2 className="hidden" aria-hidden="true" />
                  <h2 className="text-2xl font-semibold">No saved previews yet</h2>
                  <p className="max-w-xl text-muted-foreground">
                    Save a Wall Print Pro preview after opening a shared link.
                  </p>
                  <Button asChild className="w-fit rounded-full px-5">
                    <Link href="/gallery">Open gallery</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {dashboard.items.map((item) => (
                    <PreviewCard item={item} key={item.id} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
