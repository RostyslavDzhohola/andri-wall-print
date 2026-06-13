"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { CheckCircle2, Copy, ExternalLink, FileImage, ImagePlus, Loader2, Upload } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AR_SAMPLES, type ArSample } from "@/lib/ar-sample";
import { normalizeBuilderUploadToPng, validateBuilderSourceUpload, type NormalizedBuilderUpload } from "@/lib/builder-upload-normalization";
import {
  getInitialClientPreviewUrl,
  resolveClientPreviewUrl,
  type ClientPreviewUrlSource
} from "@/lib/client-preview-url";
import { DEFAULT_PREVIEW_BUNDLE_PRINT } from "@/lib/preview-bundle-contract";
import { previewStatusGroup } from "@/lib/product-copy";
import { cn } from "@/lib/utils";

const previewBundlesApi = api.previewBundles;

type CreatePreviewFlowProps = {
  mode?: "page" | "modal";
  samples?: ArSample[];
  onCreated?: (preview: CreatedPreviewLink) => void;
};

type SourceMode = "sample" | "upload";
type CreatePreviewStep = "choose" | "preview" | "share";

type CreatedPreviewLink = {
  bundleId: Id<"previewBundles">;
  publicSlug: string | null;
  publicUrl: string | null;
  status: string;
};

type CreatedSellerBundle = {
  id?: string;
  publicUrl: string;
  status: string;
};

const DEFAULT_UPLOADED_ARTWORK_DESCRIPTION = "Wall Print Pro client preview link.";

function titleFromFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension.replace(/[-_]+/g, " ").trim();

  return normalized || "Uploaded artwork";
}

async function fingerprintUpload(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());

  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeCreatedPreviewLink(value: unknown): CreatedPreviewLink {
  if (typeof value === "string") {
    return {
      bundleId: value as Id<"previewBundles">,
      publicSlug: null,
      publicUrl: null,
      status: "created"
    };
  }

  if (!value || typeof value !== "object") {
    throw new Error("Preview was created, but the response could not be read.");
  }

  const candidate = value as Partial<CreatedPreviewLink>;

  if (typeof candidate.bundleId !== "string") {
    throw new Error("Preview was created, but the details link could not be read.");
  }

  return {
    bundleId: candidate.bundleId as Id<"previewBundles">,
    publicSlug: typeof candidate.publicSlug === "string" ? candidate.publicSlug : null,
    publicUrl: typeof candidate.publicUrl === "string" ? candidate.publicUrl : null,
    status: typeof candidate.status === "string" ? candidate.status : "created"
  };
}

function readRouteStep(value: string | null): CreatePreviewStep | null {
  if (value === "choose" || value === "preview" || value === "share") {
    return value;
  }

  return null;
}

function readRouteSourceMode(value: string | null): SourceMode | null {
  if (value === "sample" || value === "upload") {
    return value;
  }

  return null;
}

function StepIndicator({
  currentStep,
  canPreview,
  canShare,
  onStepChange
}: {
  currentStep: CreatePreviewStep;
  canPreview: boolean;
  canShare: boolean;
  onStepChange: (step: CreatePreviewStep) => void;
}) {
  const steps: Array<{ id: CreatePreviewStep; label: string; enabled: boolean }> = [
    { id: "choose", label: "Choose artwork", enabled: true },
    { id: "preview", label: "Preview artwork", enabled: canPreview },
    { id: "share", label: "Share client preview", enabled: canShare }
  ];
  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <ol className="grid gap-2 sm:grid-cols-3" aria-label="Create preview steps">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isComplete = index < currentStepIndex;

        return (
          <li key={step.id}>
            <button
              className={cn(
                "flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 text-left text-sm font-medium transition-colors",
                isActive && "border-primary bg-primary/10 text-primary",
                isComplete && "border-status-ready-border bg-status-ready text-status-ready-foreground",
                !isActive && !isComplete && "bg-card text-muted-foreground",
                step.enabled && "hover:border-primary hover:text-primary",
                !step.enabled && "cursor-not-allowed opacity-50"
              )}
              disabled={!step.enabled}
              onClick={() => onStepChange(step.id)}
              type="button"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs">
                {isComplete ? <CheckCircle2 className="size-4" /> : index + 1}
              </span>
              {step.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function CreatePreviewFlow({ mode = "page", samples = AR_SAMPLES, onCreated }: CreatePreviewFlowProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const generateUploadUrl = useMutation(previewBundlesApi.generateSellerUploadUrl);
  const createBundleFromUpload = useMutation(previewBundlesApi.createBundleFromUpload);
  const createBundleFromSample = useMutation(previewBundlesApi.createBundleFromSample);
  const isRouteBacked = mode === "page";
  const [modalStep, setModalStep] = useState<CreatePreviewStep | null>(null);
  const routeStep = isRouteBacked ? readRouteStep(searchParams.get("step")) : modalStep;
  const routeSourceMode = isRouteBacked ? readRouteSourceMode(searchParams.get("source")) : null;
  const routeSampleId = isRouteBacked ? searchParams.get("sample") : null;
  const routeBundleId = isRouteBacked ? (searchParams.get("bundle") as Id<"previewBundles"> | null) : null;
  const [sourceMode, setSourceMode] = useState<SourceMode>(routeSourceMode ?? (samples.length > 0 ? "sample" : "upload"));
  const [selectedSampleId, setSelectedSampleId] = useState(routeSampleId ?? samples[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [normalizedUpload, setNormalizedUpload] = useState<NormalizedBuilderUpload | null>(null);
  const [result, setResult] = useState<CreatedPreviewLink | null>(null);
  const activeBundleId = result?.bundleId ?? routeBundleId;
  const createdBundle = useQuery(previewBundlesApi.getForSeller, activeBundleId ? { bundleId: activeBundleId } : "skip") as
    | CreatedSellerBundle
    | null
    | undefined;
  const [clientPreviewUrl, setClientPreviewUrl] = useState("");
  const [clientPreviewUrlSource, setClientPreviewUrlSource] = useState<ClientPreviewUrlSource | null>(null);
  const [clientPreviewUrlWarning, setClientPreviewUrlWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState<SourceMode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const authReady = isAuthenticated && !isLoading;
  const selectedSample = useMemo(
    () => samples.find((sample) => sample.id === selectedSampleId) ?? samples[0] ?? null,
    [samples, selectedSampleId]
  );
  const activeArtwork = sourceMode === "sample" ? selectedSample : file;
  const clientPreviewPath = result?.publicUrl ?? createdBundle?.publicUrl ?? null;
  const clientPreviewStatus = createdBundle?.status ?? result?.status ?? "created";
  const hasClientPreviewUrl = Boolean(clientPreviewPath);
  const isReadyToShare = hasClientPreviewUrl && previewStatusGroup(clientPreviewStatus) === "ready";
  const isPreparingPreview = hasClientPreviewUrl && previewStatusGroup(clientPreviewStatus) === "preparing";
  const isLoadingCreatedPreviewDetails = Boolean(activeBundleId && !clientPreviewPath && createdBundle === undefined);
  const canPreview = Boolean(activeArtwork);
  const canShare = Boolean(activeBundleId);
  const currentStep: CreatePreviewStep =
    routeStep === "share" && canShare
      ? "share"
      : routeStep === "choose"
        ? "choose"
        : routeStep === "preview" && canPreview
          ? "preview"
          : canPreview
            ? "preview"
            : "choose";

  const routeForStep = (step: CreatePreviewStep, next?: { source?: SourceMode; sampleId?: string; bundleId?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextSource = next?.source ?? sourceMode;
    const nextSampleId = next?.sampleId ?? selectedSampleId;
    const nextBundleId = next?.bundleId === undefined ? activeBundleId : next.bundleId;

    params.set("step", step);
    params.set("source", nextSource);

    if (nextSource === "sample" && nextSampleId) {
      params.set("sample", nextSampleId);
    } else {
      params.delete("sample");
    }

    if (step === "share" && nextBundleId) {
      params.set("bundle", nextBundleId);
    } else {
      params.delete("bundle");
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const goToStep = (step: CreatePreviewStep, next?: { source?: SourceMode; sampleId?: string; bundleId?: string | null }) => {
    if (!isRouteBacked) {
      setModalStep(step);
      return;
    }

    router.push(routeForStep(step, next), { scroll: false });
  };

  const clearResultForArtworkChange = () => {
    setResult(null);
    setClientPreviewUrl("");
    setClientPreviewUrlSource(null);
    setClientPreviewUrlWarning(null);
    setNotice(null);
  };

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setFilePreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!routeSourceMode || routeSourceMode === sourceMode) {
      return;
    }

    setSourceMode(routeSourceMode);
  }, [routeSourceMode, sourceMode]);

  useEffect(() => {
    if (!routeSampleId || routeSampleId === selectedSampleId || !samples.some((sample) => sample.id === routeSampleId)) {
      return;
    }

    setSelectedSampleId(routeSampleId);
  }, [routeSampleId, samples, selectedSampleId]);

  useEffect(() => {
    let ignore = false;

    setClientPreviewUrl("");
    setClientPreviewUrlSource(null);
    setClientPreviewUrlWarning(null);

    if (!clientPreviewPath) {
      return;
    }

    setClientPreviewUrl(getInitialClientPreviewUrl(clientPreviewPath));

    void resolveClientPreviewUrl(clientPreviewPath).then((resolved) => {
      if (ignore) {
        return;
      }

      setClientPreviewUrl(resolved.url);
      setClientPreviewUrlSource(resolved.source);
      setClientPreviewUrlWarning(resolved.warning);
    });

    return () => {
      ignore = true;
    };
  }, [clientPreviewPath]);

  const copyClientPreview = async () => {
    if (!clientPreviewUrl) {
      return;
    }

    await navigator.clipboard.writeText(clientPreviewUrl);
    setNotice("Client preview link copied.");
  };

  const handleFileChange = (nextFile: File | null) => {
    setFile(nextFile);
    setNormalizedUpload(null);
    clearResultForArtworkChange();
    setError(null);
    goToStep(nextFile ? "preview" : "choose", { source: "upload", bundleId: null });

    if (!nextFile) {
      return;
    }

    const validation = validateBuilderSourceUpload({
      contentType: nextFile.type,
      byteLength: nextFile.size
    });

    if (!validation.ok) {
      setError(validation.reason);
    }
  };

  const createFromSample = async () => {
    if (!selectedSample) {
      setError("No saved artwork is available yet.");
      return;
    }

    setBusy("sample");
    setError(null);
    setNotice(null);

    try {
      const created = normalizeCreatedPreviewLink(await createBundleFromSample({ sampleId: selectedSample.id }));
      setResult(created);
      goToStep("share", { source: "sample", sampleId: selectedSample.id, bundleId: created.bundleId });
      onCreated?.(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create a saved artwork preview link.");
    } finally {
      setBusy(null);
    }
  };

  const createFromUpload = async () => {
    if (!file) {
      setError("Choose a JPEG, PNG, or WebP artwork file first.");
      return;
    }

    const sourceValidation = validateBuilderSourceUpload({
      contentType: file.type,
      byteLength: file.size
    });

    if (!sourceValidation.ok) {
      setError(sourceValidation.reason);
      return;
    }

    setBusy("upload");
    setError(null);
    setNotice(null);
    setNormalizedUpload(null);

    try {
      const normalized = await normalizeBuilderUploadToPng(file);
      setNormalizedUpload(normalized);
      const sourceFingerprint = await fingerprintUpload(normalized.file);

      const uploadUrl = await generateUploadUrl();
      const upload = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": normalized.file.type },
        body: normalized.file
      });

      if (!upload.ok) {
        throw new Error("Upload service is unavailable. Try again shortly.");
      }

      const { storageId } = (await upload.json()) as { storageId: string };
      const created = normalizeCreatedPreviewLink(await createBundleFromUpload({
        sourceStorageId: storageId as Id<"_storage">,
        originalFileName: normalized.file.name,
        contentType: normalized.file.type,
        byteLength: normalized.file.size,
        sourceFingerprint,
        title: titleFromFileName(file.name),
        description: DEFAULT_UPLOADED_ARTWORK_DESCRIPTION,
        print: DEFAULT_PREVIEW_BUNDLE_PRINT
      }));

      setResult(created);
      goToStep("share", { source: "upload", bundleId: created.bundleId });
      onCreated?.(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create an uploaded artwork preview link.");
    } finally {
      setBusy(null);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!authReady) {
      setError("Admin session is still loading.");
      return;
    }

    if (sourceMode === "sample") {
      await createFromSample();
      return;
    }

    await createFromUpload();
  };

  const handleStepChange = (step: CreatePreviewStep) => {
    goToStep(step, {
      bundleId: step === "share" ? activeBundleId : null
    });
  };

  return (
    <section
      className={cn(
        "grid gap-5",
        mode === "page" ? "py-6" : "p-4 pt-12 sm:p-6 sm:pt-8"
      )}
      data-testid="create-preview-flow"
    >
      <div className="grid gap-2">
        <p className="text-sm font-medium text-muted-foreground">Admin workspace</p>
        <h1 className={cn("font-semibold tracking-tight", mode === "page" ? "text-3xl" : "pr-10 text-2xl")}>Create preview</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Choose saved artwork or upload an existing artwork file, check the preview, then copy the client preview link when it is ready.
        </p>
      </div>

      <StepIndicator currentStep={currentStep} canPreview={canPreview} canShare={canShare} onStepChange={handleStepChange} />

      {isLoading || !isAuthenticated ? (
        <Alert>
          <Loader2 className="size-4 animate-spin" />
          <AlertDescription>Admin session is loading before previews can be created.</AlertDescription>
        </Alert>
      ) : null}

      <form className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)] lg:items-start" onSubmit={submit}>
        <section className="grid content-start gap-4" aria-label="Choose artwork">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Artwork source">
            <Button
              className="min-h-11"
              disabled={busy !== null}
              onClick={() => {
                setSourceMode("sample");
                clearResultForArtworkChange();
                setError(null);
                goToStep("choose", { source: "sample", sampleId: selectedSample?.id ?? samples[0]?.id, bundleId: null });
              }}
              type="button"
              variant={sourceMode === "sample" ? "default" : "outline"}
            >
              <ImagePlus className="size-4" />
              Saved artwork
            </Button>
            <Button
              className="min-h-11"
              disabled={busy !== null}
              onClick={() => {
                setSourceMode("upload");
                clearResultForArtworkChange();
                setError(null);
                goToStep("choose", { source: "upload", bundleId: null });
              }}
              type="button"
              variant={sourceMode === "upload" ? "default" : "outline"}
            >
              <Upload className="size-4" />
              Upload artwork
            </Button>
          </div>

          {sourceMode === "sample" ? (
            <Card size="sm">
              <CardHeader className="border-b">
                <CardTitle>Saved artwork</CardTitle>
                <CardDescription>Pick an approved artwork item.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                {samples.length === 0 ? (
                  <Alert data-testid="create-preview-empty-artwork">
                    <AlertDescription>No saved artwork is available yet. Upload artwork for this preview.</AlertDescription>
                  </Alert>
                ) : (
                  samples.slice(0, 6).map((sample) => (
                    <Button
                      className={cn(
                        "grid h-auto min-h-16 grid-cols-[48px_1fr_auto] items-center justify-stretch gap-3 border bg-background p-2 text-left hover:border-primary",
                        sample.id === selectedSampleId ? "border-primary shadow-[0_10px_24px_rgba(28,79,89,0.14)]" : "border-border"
                      )}
                      disabled={busy !== null}
                      key={sample.id}
                      onClick={() => {
                        setSelectedSampleId(sample.id);
                        clearResultForArtworkChange();
                        setError(null);
                        goToStep("preview", { source: "sample", sampleId: sample.id, bundleId: null });
                      }}
                      type="button"
                      variant="outline"
                    >
                      <img alt="" className="size-12 rounded-md object-cover" src={sample.assets.poster} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{sample.title}</span>
                        <span className="block text-xs text-muted-foreground">Saved artwork metadata will be used.</span>
                      </span>
                      {sample.id === selectedSampleId ? <CheckCircle2 className="size-4 text-primary" /> : <span className="size-4" />}
                    </Button>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            <Card size="sm">
              <CardHeader className="border-b">
                <CardTitle>Upload artwork</CardTitle>
                <CardDescription>JPEG, PNG, or WebP. The current default print size is applied.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="preview-artwork-file">Artwork file</Label>
                  <Input
                    accept="image/jpeg,image/png,image/webp"
                    className="h-auto min-h-11 cursor-pointer border-dashed py-3"
                    id="preview-artwork-file"
                    onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </div>
                <Alert>
                  <AlertDescription>Advanced physical-size overrides are deferred until real phone QA proves they are needed.</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="grid content-start gap-4" aria-label="Preview artwork and share">
          {currentStep === "choose" ? (
            <Card size="sm">
              <CardHeader className="border-b">
                <CardTitle>Choose artwork</CardTitle>
                <CardDescription>Pick saved artwork or upload a file, then continue to the preview check.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
                  {sourceMode === "sample" && selectedSample
                    ? `${selectedSample.title} is selected.`
                    : file
                      ? `${file.name} is selected.`
                      : "Choose an artwork source on the left."}
                </div>
                <Button
                  className="min-h-11 w-fit"
                  disabled={!canPreview || busy !== null}
                  onClick={() => goToStep("preview")}
                  size="lg"
                  type="button"
                >
                  Preview artwork
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {currentStep === "preview" ? (
            <Card size="sm">
            <CardHeader className="border-b">
              <CardTitle>Preview artwork</CardTitle>
              <CardDescription>Confirm the right artwork before the client preview link is created.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {sourceMode === "sample" && selectedSample ? (
                <div className="grid gap-3">
                  <div className="rounded-lg border bg-secondary p-3">
                    <img
                      alt={`${selectedSample.title} preview`}
                      className="mx-auto aspect-[4/3] max-h-72 w-full rounded-md object-contain"
                      src={selectedSample.assets.poster}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold">{selectedSample.title}</h2>
                      <p className="text-sm text-muted-foreground">Ready to create from saved artwork.</p>
                    </div>
                    <Badge variant="outline">Saved artwork</Badge>
                  </div>
                </div>
              ) : null}

              {sourceMode === "upload" ? (
                file && filePreviewUrl ? (
                  <div className="grid gap-3">
                    <div className="rounded-lg border bg-secondary p-3">
                      <img
                        alt={`${file.name} preview`}
                        className="mx-auto aspect-[4/3] max-h-72 w-full rounded-md object-contain"
                        src={filePreviewUrl}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="max-w-sm truncate text-base font-semibold">{file.name}</h2>
                        <p className="text-sm text-muted-foreground">Ready to prepare from uploaded artwork.</p>
                      </div>
                      <Badge variant="outline">Upload</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-64 place-items-center rounded-lg border border-dashed bg-muted/40 p-6 text-center">
                    <div className="grid justify-items-center gap-2">
                      <FileImage className="size-8 text-muted-foreground" />
                      <p className="text-sm font-medium">Choose an artwork file to preview it here.</p>
                    </div>
                  </div>
                )
              ) : null}

              {normalizedUpload ? (
                <Alert className="border-status-ready-border bg-status-ready text-status-ready-foreground">
                  <AlertDescription>
                    Artwork was prepared to {normalizedUpload.widthPx} x {normalizedUpload.heightPx}px PNG before upload.
                  </AlertDescription>
                </Alert>
              ) : null}

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button className="min-h-11 w-fit" disabled={!authReady || busy !== null} size="lg" type="submit">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {busy ? "Preparing preview link" : "Create preview"}
              </Button>
            </CardContent>
          </Card>
          ) : null}

          {currentStep === "share" ? (
            <Card data-testid="create-preview-share" size="sm">
              <CardHeader className="border-b">
                <CardTitle>
                  {isLoadingCreatedPreviewDetails ? "Loading client link" : isReadyToShare ? "Client preview link" : "Client preview created"}
                </CardTitle>
                <CardDescription>
                  {isLoadingCreatedPreviewDetails
                    ? "Getting the shareable URL for this preview."
                    : isPreparingPreview
                      ? "The link is available now. The artwork is still preparing."
                      : "Copy this link and send it to the client."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="client-preview-link">Client preview link</Label>
                  <div
                    className="min-h-14 break-all rounded-lg border bg-muted/60 p-3 text-sm"
                    data-testid="client-preview-link"
                    id="client-preview-link"
                  >
                    {clientPreviewUrl || "Finding the phone-ready client link..."}
                  </div>
                  {clientPreviewUrlSource === "ngrok" ? (
                    <p className="text-sm text-muted-foreground">Using the active ngrok URL for phone testing.</p>
                  ) : null}
                  {clientPreviewUrlWarning ? (
                    <Alert>
                      <AlertDescription>{clientPreviewUrlWarning}</AlertDescription>
                    </Alert>
                  ) : null}
                </div>

                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    className="min-h-11"
                    disabled={!clientPreviewUrl}
                    onClick={() => void copyClientPreview()}
                    size="lg"
                    type="button"
                  >
                    <Copy className="size-4" />
                    Copy client preview link
                  </Button>
                  {clientPreviewUrl ? (
                    <Button asChild className="min-h-11" size="lg" variant="outline">
                      <a href={clientPreviewUrl} rel="noreferrer" target="_blank">
                        <ExternalLink className="size-4" />
                        Open client preview
                      </a>
                    </Button>
                  ) : null}
                  <Button className="min-h-11" onClick={() => goToStep("preview", { bundleId: null })} size="lg" type="button" variant="outline">
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>
      </form>

      <div className="sr-only" role="status" aria-live="polite">
        {notice}
      </div>
      {notice ? (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
