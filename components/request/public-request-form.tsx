"use client";

import { useMutation } from "convex/react";
import { ArrowRight, CheckCircle2, ImagePlus, Loader2, Sparkles } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  fingerprintBuilderUpload,
  normalizeBuilderUploadToPng,
  validateBuilderSourceUpload,
  validatePublicUploadFile
} from "@/lib/builder-upload-normalization";
import {
  LEAD_CONCEPT_PROMPT_MAX_LENGTH,
  isValidLeadEmail,
  isValidLeadPhone,
  normalizeLeadEmail,
  normalizeLeadPhone,
  type LeadContactMethod,
  type LeadRequestIntent
} from "@/lib/lead-request-contract";
import type { RequestDesignContext } from "@/lib/request-page-defaults";
import { cn } from "@/lib/utils";

type PublicRequestFormProps = {
  aiEnabled: boolean;
  defaultIntent: LeadRequestIntent;
  defaultConceptPrompt?: string;
  defaultDesignContext?: RequestDesignContext;
  publicPhone?: string;
  publicContactUrl?: string;
  uploadFirst?: boolean;
};

type SubmissionResult = {
  message: string;
  aiDraftStatus?: string;
};

const contactMethodOptions: Array<{ value: LeadContactMethod; label: string }> = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "either", label: "Either" }
];

const projectTypeOptions = ["Home wall", "Business wall", "Event or pop-up", "Not sure yet"] as const;
const preferredContactGroupId = "preferred-contact-method";
const emailHelpId = "lead-email-help";
const emailErrorId = "lead-email-error";
const phoneHelpId = "lead-phone-help";

export function PublicRequestForm({
  aiEnabled,
  defaultIntent,
  defaultConceptPrompt,
  defaultDesignContext,
  publicPhone,
  publicContactUrl,
  uploadFirst = false
}: PublicRequestFormProps) {
  const generateLeadUploadUrl = useMutation(api.leadRequests.generateLeadUploadUrl);
  const submitLeadRequest = useMutation(api.leadRequests.submitLeadRequest);
  const intent = defaultIntent;
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState<LeadContactMethod>("email");
  const [projectType, setProjectType] = useState<(typeof projectTypeOptions)[number]>("Home wall");
  const [businessName, setBusinessName] = useState("");
  const [conceptPrompt, setConceptPrompt] = useState(defaultConceptPrompt ?? "");
  const reserveInterest = defaultIntent === "reserve";
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const normalizedEmail = normalizeLeadEmail(contactEmail);
  const emailEntered = Boolean(normalizedEmail);
  const emailValid = isValidLeadEmail(normalizedEmail);
  const normalizedPhone = normalizeLeadPhone(contactPhone);
  const phoneEntered = Boolean(contactPhone.trim());
  const phoneValid = isValidLeadPhone(contactPhone);
  const preferredContactSatisfied =
    preferredContactMethod === "email" ? emailValid : preferredContactMethod === "phone" ? phoneValid : emailValid || phoneValid;
  const canSubmit = Boolean(
    !busy &&
      contactName.trim() &&
      preferredContactSatisfied &&
      (!emailEntered || emailValid) &&
      (!phoneEntered || phoneValid)
  );

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!selected) {
      setFile(null);
      setUploadError(null);
      return;
    }

    let validation: Awaited<ReturnType<typeof validatePublicUploadFile>>;

    try {
      validation = await validatePublicUploadFile(selected);
    } catch {
      validation = { ok: false, reason: "Could not read this image. Choose a JPEG, PNG, or WebP file." };
    }

    if (!validation.ok) {
      setFile(null);
      setUploadError(validation.reason);
      return;
    }

    setFile(selected);
    setUploadError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      let upload:
        | {
            storageId: Id<"_storage">;
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

        const { storageId } = (await uploadResponse.json()) as { storageId: Id<"_storage"> };
        upload = {
          storageId,
          originalFileName: normalized.file.name,
          contentType: normalized.file.type,
          byteLength: normalized.file.size,
          sourceFingerprint
        };
      }

      const saved = await submitLeadRequest({
        contactName,
        ...(normalizedEmail ? { contactEmail: normalizedEmail } : {}),
        ...(normalizedPhone ? { contactPhone: normalizedPhone } : {}),
        preferredContactMethod,
        projectType,
        ...(businessName.trim() ? { businessName } : {}),
        ...(conceptPrompt.trim() ? { conceptPrompt } : {}),
        intent,
        reserveInterest,
        ...(upload ? { upload } : {})
      });
      setResult(saved);
      setFile(null);
      setUploadError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const uploadField = (
    <div className="grid gap-2" id="lead-upload-section">
      <Label htmlFor="lead-upload">Upload your artwork</Label>
      <label
        className={cn(
          "grid min-h-36 cursor-pointer place-items-center rounded-lg border border-dashed bg-muted/35 px-4 py-6 text-center transition-colors hover:bg-muted/55",
          file && "border-primary bg-primary/5"
        )}
        htmlFor="lead-upload"
      >
        <span className="grid justify-items-center gap-2">
          <ImagePlus className="size-5 text-primary" />
          <span className="text-sm font-semibold">{file ? file.name : "Choose artwork, a logo, or a wall reference"}</span>
          <span className="text-xs text-muted-foreground">JPEG, PNG, or WebP</span>
        </span>
      </label>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        id="lead-upload"
        onChange={handleFileSelection}
        type="file"
      />
      {uploadError ? (
        <p className="text-sm font-medium text-destructive" data-testid="request-upload-error" role="alert">
          {uploadError} Accepted formats: JPEG, PNG, or WebP.
        </p>
      ) : null}
    </div>
  );

  return (
    <form className="grid gap-5" onSubmit={submit}>
      {uploadFirst ? uploadField : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lead-name">Name</Label>
          <Input id="lead-name" onChange={(event) => setContactName(event.target.value)} required value={contactName} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-email">Email</Label>
          <Input
            aria-describedby={emailEntered && !emailValid ? `${emailHelpId} ${emailErrorId}` : emailHelpId}
            aria-invalid={emailEntered && !emailValid}
            autoComplete="email"
            id="lead-email"
            inputMode="email"
            onChange={(event) => setContactEmail(event.target.value)}
            required={preferredContactMethod === "email"}
            type="email"
            value={contactEmail}
          />
          <p className="text-xs leading-5 text-muted-foreground" id={emailHelpId}>
            Best for sending your preview + estimate.
          </p>
          {emailEntered && !emailValid ? (
            <p className="text-xs font-medium text-destructive" id={emailErrorId} role="alert">
              Enter a valid email address.
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-phone">Phone</Label>
          <Input
            aria-describedby={phoneHelpId}
            aria-invalid={phoneEntered && !phoneValid}
            autoComplete="tel"
            id="lead-phone"
            inputMode="tel"
            maxLength={30}
            onChange={(event) => setContactPhone(event.target.value)}
            required={preferredContactMethod === "phone"}
            type="tel"
            value={contactPhone}
          />
          <p className="text-xs leading-5 text-muted-foreground" id={phoneHelpId}>
            Only used for questions about your wall.
          </p>
          {phoneEntered && !phoneValid ? (
            <p className="text-xs font-medium text-destructive" role="alert">
              Enter a valid phone number with 10 to 15 digits.
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label id={`${preferredContactGroupId}-label`}>Preferred contact</Label>
          <div aria-labelledby={`${preferredContactGroupId}-label`} className="grid grid-cols-3 gap-2" role="group">
            {contactMethodOptions.map((option) => (
              <Button
                aria-pressed={preferredContactMethod === option.value}
                className="h-10 rounded-full px-3"
                key={option.value}
                onClick={() => setPreferredContactMethod(option.value)}
                type="button"
                variant={preferredContactMethod === option.value ? "default" : "outline"}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-project-type">Project type</Label>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            id="lead-project-type"
            onChange={(event) => setProjectType(event.target.value as (typeof projectTypeOptions)[number])}
            value={projectType}
          >
            {projectTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-business">Business or space name</Label>
          <Input
            id="lead-business"
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Ex: Joe’s Coffee lobby, kids’ playroom"
            value={businessName}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">Please provide at least one: email or phone.</p>

      <div className="grid gap-2">
        <Label htmlFor="lead-wall-idea">Wall &amp; idea</Label>
        {defaultDesignContext ? (
          <p className="text-sm text-muted-foreground" data-testid="request-selected-design-context">
            Starting design: <span className="font-medium text-foreground">{defaultDesignContext.title}</span>
          </p>
        ) : null}
        <Textarea
          id="lead-wall-idea"
          maxLength={LEAD_CONCEPT_PROMPT_MAX_LENGTH}
          onChange={(event) => setConceptPrompt(event.target.value)}
          placeholder="Where is the wall and what are you thinking? (Lobby logo, kids area mural, seasonal promo…)"
          rows={5}
          value={conceptPrompt}
        />
      </div>

      {uploadFirst ? null : uploadField}

      {!aiEnabled && conceptPrompt.trim() ? (
        <Alert>
          <Sparkles className="size-4" />
          <AlertDescription>Concept drafting is offline in this environment. Your request will still be saved and we'll follow up.</AlertDescription>
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
            <span>
              <strong>Got it.</strong> Next: we review your wall, send a ballpark estimate, then schedule an on-site visit before
              you reserve your print date.
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3">
        <div className="grid w-fit gap-1.5">
          <Button className="min-h-11 rounded-full px-5" disabled={!canSubmit} type="submit">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            Get estimate
          </Button>
          <p className="text-center text-xs text-muted-foreground">We’ll reply within 1 business day.</p>
        </div>
        {publicPhone || publicContactUrl ? (
          <div className="flex flex-wrap items-center gap-3">
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
        ) : null}
      </div>
    </form>
  );
}
