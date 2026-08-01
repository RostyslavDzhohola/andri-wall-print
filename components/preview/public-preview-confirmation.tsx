"use client";

import { CheckCircle2, Copy, Loader2, Send } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ArSample } from "@/lib/ar-sample";
import {
  buildBuyerPreviewShareText,
  normalizePreviewConfirmationNote,
  type PublicPreviewConfirmation as PublicPreviewConfirmationRecord
} from "@/lib/preview-confirmation-contract";

type PublicPreviewConfirmationProps = {
  sample: ArSample;
  publicSlug: string;
  canSubmit: boolean;
};

type ConfirmationResponse =
  | {
      status: "confirmed";
      confirmation: PublicPreviewConfirmationRecord;
    }
  | {
      status: "unavailable";
      reason: string;
    };

function absoluteUrl(value: string) {
  if (typeof window === "undefined") {
    return value;
  }

  return new URL(value, window.location.origin).toString();
}

export function PublicPreviewConfirmation({ sample, publicSlug, canSubmit }: PublicPreviewConfirmationProps) {
  const [buyerNote, setBuyerNote] = useState("");
  const [busy, setBusy] = useState<"submit" | "share" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<PublicPreviewConfirmationRecord | null>(null);

  const shareSummary = () =>
    buildBuyerPreviewShareText({
      brandName: "Wall Print Pro",
      artworkTitle: sample.title,
      dimensionsLabel: sample.print.label,
      posterUrl: absoluteUrl(sample.assets.poster),
      previewUrl: typeof window === "undefined" ? `/preview/${publicSlug}` : window.location.href
    });

  const copyShareSummary = async () => {
    setBusy("share");
    setNotice(null);
    setError(null);

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(shareSummary());
      setNotice("Summary copied.");
    } catch {
      setError("Could not copy the summary from this browser.");
    } finally {
      setBusy(null);
    }
  };

  const submitConfirmation = async () => {
    if (!canSubmit) {
      setError("This preview cannot accept confirmations right now.");
      return;
    }

    setBusy("submit");
    setNotice(null);
    setError(null);

    try {
      const response = await fetch("/api/preview-confirmations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          publicSlug,
          buyerNote: normalizePreviewConfirmationNote(buyerNote)
        })
      });
      const body = (await response.json()) as ConfirmationResponse;

      if (body.status !== "confirmed") {
        throw new Error(body.reason);
      }

      if (!response.ok) {
        throw new Error("This preview cannot accept confirmations right now.");
      }

      setConfirmation(body.confirmation);
      setBuyerNote(body.confirmation.buyerNote ?? "");
      setNotice("Choice sent to Wall Print Pro.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send this choice.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="max-w-lg border bg-card/95 shadow-[0_18px_50px_rgba(35,31,25,0.12)]" data-testid="public-confirmation-card">
      <CardContent className="grid gap-4 p-4" suppressHydrationWarning>
        <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3">
          <img
            alt=""
            aria-hidden="true"
            className="h-24 w-[84px] rounded-md border bg-muted object-cover"
            src={sample.assets.poster}
          />
          <div className="grid min-w-0 content-center gap-1">
            <div className="text-sm font-medium text-muted-foreground">File name</div>
            <div className="break-words text-base font-semibold leading-snug" data-testid="public-confirmation-file-name">
              {sample.title}
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="preview-confirmation-note">Note</Label>
          <Textarea
            id="preview-confirmation-note"
            maxLength={800}
            onChange={(event) => setBuyerNote(event.target.value)}
            placeholder="Room, placement, or timing details"
            suppressHydrationWarning
            value={buyerNote}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11 rounded-full px-5" disabled={!canSubmit || busy !== null || confirmation !== null} onClick={() => void submitConfirmation()} type="button">
            {busy === "submit" ? <Loader2 className="size-4 animate-spin" /> : confirmation ? <CheckCircle2 className="size-4" /> : <Send className="size-4" />}
            {confirmation ? "Sent to admin" : "Send to admin"}
          </Button>
          <Button className="min-h-11 rounded-full px-5" disabled={busy !== null} onClick={() => void copyShareSummary()} type="button" variant="outline">
            {busy === "share" ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
            Share summary
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
      </CardContent>
    </Card>
  );
}
