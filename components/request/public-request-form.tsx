"use client";

import { useMutation } from "convex/react";
import { ArrowRight, CheckCircle2, ImagePlus, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import {
  PrintSizeFields,
  printSizeFieldsValueFromPrint,
  resolvePrintSizeFieldsValue,
  type PrintSizeFieldsValue
} from "@/components/preview/print-size-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import {
  fingerprintBuilderUpload,
  normalizeBuilderUploadToPng,
  validateBuilderSourceUpload
} from "@/lib/builder-upload-normalization";
import { normalizeLeadEmail, type LeadRequestIntent } from "@/lib/lead-request-contract";
import { DEFAULT_PREVIEW_BUNDLE_PRINT } from "@/lib/preview-bundle-contract";
import { cn } from "@/lib/utils";

const leadRequestsApi = api.leadRequests as any;

type PublicRequestFormProps = {
  aiEnabled: boolean;
  defaultIntent: LeadRequestIntent;
  publicPhone?: string;
  publicContactUrl?: string;
};

type SubmissionResult = {
  message: string;
  aiDraftStatus?: string;
  publicPreviewUrl?: string;
};

const intentOptions: Array<{ value: LeadRequestIntent; label: string }> = [
  { value: "concept", label: "Concept" },
  { value: "reserve", label: "Reserve" },
  { value: "contact", label: "Contact" }
];

export function PublicRequestForm({ aiEnabled, defaultIntent, publicPhone, publicContactUrl }: PublicRequestFormProps) {
  const generateLeadUploadUrl = useMutation(leadRequestsApi.generateLeadUploadUrl);
  const submitLeadRequest = useMutation(leadRequestsApi.submitLeadRequest);
  const [intent, setIntent] = useState<LeadRequestIntent>(defaultIntent);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [wallDescription, setWallDescription] = useState("");
  const [conceptPrompt, setConceptPrompt] = useState("");
  const [reserveInterest, setReserveInterest] = useState(defaultIntent === "reserve");
  const [file, setFile] = useState<File | null>(null);
  const [printSize, setPrintSize] = useState<PrintSizeFieldsValue>(() => printSizeFieldsValueFromPrint(DEFAULT_PREVIEW_BUNDLE_PRINT));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const printValidation = useMemo(() => resolvePrintSizeFieldsValue(printSize), [printSize]);
  const canSubmit = Boolean(!busy && contactName.trim() && normalizeLeadEmail(contactEmail).includes("@") && printValidation.ok);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      if (!printValidation.ok) {
        throw new Error(printValidation.reason);
      }

      let upload:
        | {
            storageId: string;
            originalFileName: string;
            contentType: string;
            byteLength: number;
            sourceFingerprint?: string;
          }
        | undefined;

      if (file) {
        const sourceValidation = validateBuilderSourceUpload({
          contentType: file.type,
          byteLength: file.size
        });

        if (!sourceValidation.ok) {
          throw new Error(sourceValidation.reason ?? "Upload could not be used.");
        }

        const normalized = await normalizeBuilderUploadToPng(file);
        const sourceFingerprint = await fingerprintBuilderUpload(normalized.file);
        const uploadUrl = await generateLeadUploadUrl({});
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": normalized.file.type
          },
          body: normalized.file
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload could not be saved.");
        }

        const { storageId } = (await uploadResponse.json()) as { storageId: string };
        upload = {
          storageId,
          originalFileName: normalized.file.name,
          contentType: normalized.file.type,
          byteLength: normalized.file.size,
          sourceFingerprint
        };
      }

      const saved = (await submitLeadRequest({
        contactName,
        contactEmail,
        ...(contactPhone.trim() ? { contactPhone } : {}),
        ...(businessName.trim() ? { businessName } : {}),
        ...(wallDescription.trim() ? { wallDescription } : {}),
        ...(conceptPrompt.trim() ? { conceptPrompt } : {}),
        intent,
        reserveInterest,
        ...(upload ? { upload } : {}),
        print: printValidation.print
      })) as SubmissionResult;
      setResult(saved);
      setFile(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div className="flex flex-wrap items-center gap-2">
        {intentOptions.map((option) => (
          <Button
            aria-pressed={intent === option.value}
            className="h-9 rounded-full px-4"
            key={option.value}
            onClick={() => {
              setIntent(option.value);
              if (option.value === "reserve") {
                setReserveInterest(true);
              }
            }}
            type="button"
            variant={intent === option.value ? "default" : "outline"}
          >
            {option.label}
          </Button>
        ))}
        <Badge className="ml-auto" variant={aiEnabled ? "secondary" : "outline"}>
          {aiEnabled ? "AI drafts on" : "Seller review"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lead-name">Name</Label>
          <Input id="lead-name" onChange={(event) => setContactName(event.target.value)} required value={contactName} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-email">Email</Label>
          <Input id="lead-email" inputMode="email" onChange={(event) => setContactEmail(event.target.value)} required type="email" value={contactEmail} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-phone">Phone</Label>
          <Input id="lead-phone" inputMode="tel" onChange={(event) => setContactPhone(event.target.value)} type="tel" value={contactPhone} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-business">Business or space</Label>
          <Input id="lead-business" onChange={(event) => setBusinessName(event.target.value)} value={businessName} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="lead-wall">Wall context</Label>
        <Textarea
          id="lead-wall"
          onChange={(event) => setWallDescription(event.target.value)}
          rows={3}
          value={wallDescription}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="lead-concept">Concept idea</Label>
        <Textarea
          id="lead-concept"
          onChange={(event) => setConceptPrompt(event.target.value)}
          placeholder="Logo wall, city skyline, kids area mural, seasonal promotion..."
          rows={4}
          value={conceptPrompt}
        />
      </div>

      <PrintSizeFields
        description="Set the first print size for the wall-placement draft."
        testIdPrefix="request-print-size"
        title="Approximate print size"
        validation={printValidation}
        value={printSize}
        onChange={setPrintSize}
      />

      <div className="grid gap-2">
        <Label htmlFor="lead-upload">Optional image</Label>
        <label
          className={cn(
            "grid min-h-28 cursor-pointer place-items-center rounded-lg border border-dashed bg-muted/35 px-4 py-5 text-center transition-colors hover:bg-muted/55",
            file && "border-primary bg-primary/5"
          )}
          htmlFor="lead-upload"
        >
          <span className="grid justify-items-center gap-2">
            <ImagePlus className="size-5 text-primary" />
            <span className="text-sm font-semibold">{file ? file.name : "Upload artwork, logo, or wall reference"}</span>
            <span className="text-xs text-muted-foreground">JPEG, PNG, or WebP</span>
          </span>
        </label>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          id="lead-upload"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
      </div>

      <label className="flex items-start gap-3 rounded-lg border bg-muted/25 p-3 text-sm">
        <input
          checked={reserveInterest}
          className="mt-1"
          onChange={(event) => setReserveInterest(event.target.checked)}
          type="checkbox"
        />
        <span>I want to reserve priority review for this wall print request.</span>
      </label>

      {!aiEnabled && conceptPrompt.trim() ? (
        <Alert>
          <Sparkles className="size-4" />
          <AlertDescription>Concept drafting is offline in this environment. Your request will still be saved for seller review.</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertDescription className="grid gap-2">
            <span>{result.message}</span>
            {result.publicPreviewUrl ? (
              <Button asChild className="w-fit rounded-full" size="sm">
                <Link href={result.publicPreviewUrl}>Open draft preview</Link>
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button className="min-h-11 rounded-full px-5" disabled={!canSubmit} type="submit">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          Send request
        </Button>
        {publicPhone ? (
          <Button asChild className="min-h-11 rounded-full px-5" variant="outline">
            <a href={`tel:${publicPhone.replace(/\D/g, "")}`}>Call</a>
          </Button>
        ) : null}
        {publicContactUrl ? (
          <Button asChild className="min-h-11 rounded-full px-5" variant="ghost">
            <a href={publicContactUrl}>Contact</a>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
