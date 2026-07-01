"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Copy, ExternalLink, Loader2, Mail, Phone, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LEAD_REQUEST_STATUSES, type LeadContactMethod, type LeadRequestStatus } from "@/lib/lead-request-contract";
import { resolveClientPreviewUrl } from "@/lib/client-preview-url";
import { cn } from "@/lib/utils";

const leadRequestsApi = api.leadRequests as any;

type SellerLead = {
  id: Id<"leadRequests">;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  preferredContactMethod?: LeadContactMethod;
  projectType?: string;
  businessName?: string;
  wallDescription?: string;
  conceptPrompt?: string;
  intent: string;
  reserveInterest: boolean;
  status: LeadRequestStatus;
  aiDraftStatus?: string;
  aiFailureReason?: string;
  printLabel?: string;
  publicPreviewUrl?: string;
  createdAt: number;
  updatedAt: number;
};

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function statusTone(status: string) {
  if (status === "won") {
    return "border-status-ready-border bg-status-ready text-status-ready-foreground";
  }

  if (status === "lost" || status === "archived") {
    return "border-status-danger-border bg-status-danger text-status-danger-foreground";
  }

  return "border-status-warning-border bg-status-warning text-status-warning-foreground";
}

function draftTone(status?: string) {
  if (status === "ready") {
    return "border-status-ready-border bg-status-ready text-status-ready-foreground";
  }

  if (status === "queued" || status === "generating") {
    return "border-status-warning-border bg-status-warning text-status-warning-foreground";
  }

  if (status) {
    return "border-status-danger-border bg-status-danger text-status-danger-foreground";
  }

  return "border-border";
}

export function LeadInbox() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const leads = useQuery(leadRequestsApi.listForSeller, isAuthenticated ? {} : "skip") as SellerLead[] | undefined;
  const updateStatus = useMutation(leadRequestsApi.updateStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const counts = useMemo(() => {
    return {
      new: (leads ?? []).filter((lead) => lead.status === "new").length,
      reviewing: (leads ?? []).filter((lead) => lead.status === "reviewing").length,
      contacted: (leads ?? []).filter((lead) => lead.status === "contacted").length,
      won: (leads ?? []).filter((lead) => lead.status === "won").length
    };
  }, [leads]);

  const copyContact = async (lead: SellerLead) => {
    try {
      await navigator.clipboard.writeText(
        [lead.contactName, lead.contactEmail, lead.contactPhone, lead.preferredContactMethod, lead.projectType, lead.businessName].filter(Boolean).join("\n")
      );
      setNotice("Contact copied.");
      setError(null);
    } catch {
      setError("Could not copy contact details.");
    }
  };

  const changeStatus = async (leadId: Id<"leadRequests">, status: LeadRequestStatus) => {
    setBusy(leadId);
    setNotice(null);
    setError(null);

    try {
      await updateStatus({ leadRequestId: leadId, status });
      setNotice("Lead status updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update lead status.");
    } finally {
      setBusy(null);
    }
  };

  const openPreview = async (path: string) => {
    const resolved = await resolveClientPreviewUrl(path);
    window.open(resolved.url, "_blank", "noopener,noreferrer");
  };

  if (isLoading || !isAuthenticated || !leads) {
    return (
      <section className="grid gap-4 py-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </section>
    );
  }

  return (
    <section className="grid gap-5 py-6">
      <div className="grid gap-2">
        <p className="font-semibold uppercase text-primary">Lead inbox</p>
        <h1 className="text-3xl font-semibold md:text-5xl">Public wall print requests</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Contact details, reserve interest, AI draft status, and draft preview links from the public request flow.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["New", counts.new],
          ["Reviewing", counts.reviewing],
          ["Contacted", counts.contacted],
          ["Won", counts.won]
        ].map(([label, value]) => (
          <div className="rounded-lg border bg-muted/35 p-3" key={label}>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
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

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>{leads.length === 0 ? "No public requests yet." : `${leads.length} recent public requests.`}</CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <Alert>
              <AlertDescription>New public requests will appear here after clients submit the request form.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Draft</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="align-top">
                      <div className="grid gap-1">
                        <div className="font-semibold">{lead.contactName}</div>
                        {lead.contactEmail ? (
                          <a className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" href={`mailto:${lead.contactEmail}`}>
                            <Mail className="size-3" />
                            {lead.contactEmail}
                          </a>
                        ) : null}
                        {lead.contactPhone ? (
                          <a className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" href={`tel:${lead.contactPhone.replace(/\D/g, "")}`}>
                            <Phone className="size-3" />
                            {lead.contactPhone}
                          </a>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-sm align-top">
                      <div className="grid gap-1">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{lead.intent}</Badge>
                          {lead.preferredContactMethod ? <Badge variant="outline">{lead.preferredContactMethod}</Badge> : null}
                          {lead.reserveInterest ? <Badge variant="secondary">Reserve interest</Badge> : null}
                        </div>
                        {lead.projectType ? <div className="text-sm text-muted-foreground">{lead.projectType}</div> : null}
                        <div className="text-sm text-muted-foreground">{lead.businessName ?? "No business name"}</div>
                        {lead.conceptPrompt ? <div className="line-clamp-2 text-sm">{lead.conceptPrompt}</div> : null}
                        {lead.printLabel ? <div className="text-xs text-muted-foreground">{lead.printLabel}</div> : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="grid gap-2">
                        <Badge className={cn("w-fit", draftTone(lead.aiDraftStatus))} variant="outline">
                          <Sparkles className="size-3" />
                          {lead.aiDraftStatus ?? "No draft"}
                        </Badge>
                        {lead.aiFailureReason ? <div className="max-w-48 text-xs text-muted-foreground">{lead.aiFailureReason}</div> : null}
                        {lead.publicPreviewUrl ? (
                          <Button className="h-8 w-fit rounded-full px-3" onClick={() => openPreview(lead.publicPreviewUrl!)} size="sm" type="button" variant="outline">
                            <ExternalLink className="size-3" />
                            Open
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <select
                        className={cn("h-9 w-36 rounded-md border px-2 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50", statusTone(lead.status))}
                        disabled={busy === lead.id}
                        onChange={(event) => changeStatus(lead.id, event.target.value as LeadRequestStatus)}
                        value={lead.status}
                      >
                        {LEAD_REQUEST_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <div className="flex justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Copy contact"
                              className="size-9 rounded-full"
                              disabled={busy === lead.id}
                              onClick={() => copyContact(lead)}
                              size="icon"
                              type="button"
                              variant="outline"
                            >
                              {busy === lead.id ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy contact</TooltipContent>
                        </Tooltip>
                        {lead.publicPreviewUrl ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button aria-label="Open preview" asChild className="size-9 rounded-full" size="icon" variant="outline">
                                <Link href={lead.publicPreviewUrl}>
                                  <ExternalLink className="size-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open preview</TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
