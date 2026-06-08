"use client";

import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Copy, ExternalLink, ImagePlus, Loader2, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AR_SAMPLES, type ArSample } from "@/lib/ar-sample";
import { normalizeBuilderUploadToPng, validateBuilderSourceUpload, type NormalizedBuilderUpload } from "@/lib/builder-upload-normalization";
import { DEFAULT_PREVIEW_BUNDLE_PRINT } from "@/lib/preview-bundle-contract";
import { cn } from "@/lib/utils";

const builderInvitesApi = api.builderInvites;

type BuilderSurfaceProps = {
  token: string;
  samples?: ArSample[];
};

type InviteValidation = {
  status: "valid" | "expired" | "revoked" | "not_found";
  message: string;
  expiresAt: number | null;
  remainingGenerations: number;
  remainingUploadStarts: number;
};

type GeneratedLink = {
  publicUrl: string;
  publicSlug: string;
  status: string;
};

function formatDate(value: number | null) {
  if (!value) {
    return "Unavailable";
  }

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

function titleFromFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension.replace(/[-_]+/g, " ").trim();

  return normalized || "Uploaded artwork";
}

function InviteUnavailable({ invite }: { invite: InviteValidation }) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-3xl place-items-center">
        <Card className="w-full shadow-[0_24px_70px_rgba(35,31,25,0.12)]">
          <CardHeader>
            <div className="flex size-12 items-center justify-center rounded-full bg-status-danger text-status-danger-foreground">
              <XCircle className="size-6" />
            </div>
            <BrandMark href={null} iconSize="lg" />
            <CardDescription className="font-semibold uppercase">Invite unavailable</CardDescription>
            <CardTitle className="text-3xl md:text-5xl">{invite.message}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <p className="text-base leading-7 text-muted-foreground">
              Ask the admin for a fresh invite link if this page should collect artwork.
            </p>
            <Button asChild className="h-11 w-fit rounded-full px-5">
              <Link href="/">Open sample gallery</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export function BuilderSetupMissing() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-3xl place-items-center">
        <Card className="w-full shadow-[0_24px_70px_rgba(35,31,25,0.12)]">
          <CardHeader>
            <BrandMark href={null} iconSize="lg" />
            <CardDescription className="font-semibold uppercase">Invite page unavailable</CardDescription>
            <CardTitle className="text-3xl md:text-5xl">This invite page is unavailable.</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <p className="text-base leading-7 text-muted-foreground">
              Ask the admin to refresh the setup before using this invite link.
            </p>
            <Button asChild className="h-11 w-fit rounded-full px-5">
              <Link href="/">Open sample gallery</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export function BuilderSurface({ token, samples = AR_SAMPLES }: BuilderSurfaceProps) {
  const invite = useQuery(builderInvitesApi.validateInvite, { token }) as InviteValidation | undefined;
  const generateUploadUrl = useMutation(builderInvitesApi.generateBuilderUploadUrl);
  const createBundleFromSample = useMutation(builderInvitesApi.createBundleFromSample);
  const createBundleFromUpload = useMutation(builderInvitesApi.createBundleFromUpload);
  const [selectedSampleId, setSelectedSampleId] = useState(samples[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [normalizedUpload, setNormalizedUpload] = useState<NormalizedBuilderUpload | null>(null);
  const [result, setResult] = useState<GeneratedLink | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedSample = samples.find((sample) => sample.id === selectedSampleId) ?? samples[0];
  const generatedUrl = result ? absoluteUrl(result.publicUrl) : "";
  const canGenerate = invite?.status === "valid" && invite.remainingGenerations > 0;

  const copyGeneratedLink = async () => {
    if (!generatedUrl) {
      return;
    }

    if (!navigator.clipboard) {
      setError("Could not copy the link from this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedUrl);
      setNotice("Client preview link copied.");
      setError(null);
    } catch (caught) {
      console.error("Failed to copy client preview link.", caught);
      setError("Could not copy the link from this browser.");
    }
  };

  const generateFromSample = async () => {
    if (!selectedSample || !canGenerate) {
      return;
    }

    setBusy("sample");
    setError(null);
    setNotice(null);

    try {
      const link = (await createBundleFromSample({ token, sampleId: selectedSample.id })) as GeneratedLink;
      setResult(link);
      setNotice("Client preview is ready.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the saved artwork preview link.");
    } finally {
      setBusy(null);
    }
  };

  const handleFileChange = (nextFile: File | null) => {
    setFile(nextFile);
    setNormalizedUpload(null);
    setError(null);

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

  const submitUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setNormalizedUpload(null);

    if (!file) {
      setError("Choose a JPEG, PNG, or WebP artwork file first.");
      return;
    }

    if (!canGenerate) {
      setError("This invite link cannot create more preview links.");
      return;
    }

    setBusy("upload");

    try {
      const normalized = await normalizeBuilderUploadToPng(file);
      setNormalizedUpload(normalized);

      const uploadUrl = await generateUploadUrl({ token });
      const upload = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": normalized.file.type },
        body: normalized.file
      });

      if (!upload.ok) {
        throw new Error("Upload service is unavailable. Try again shortly.");
      }

      const { storageId } = (await upload.json()) as { storageId: string };
      const link = (await createBundleFromUpload({
        token,
        sourceStorageId: storageId as Id<"_storage">,
        originalFileName: normalized.file.name,
        contentType: normalized.file.type,
        byteLength: normalized.file.size,
        title: titleFromFileName(file.name),
        description: "Wall Print Pro client preview link.",
        print: DEFAULT_PREVIEW_BUNDLE_PRINT
      })) as GeneratedLink;

      setResult(link);
      setNotice(link.status === "ready" ? "Client preview is ready." : "Client preview is preparing.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the uploaded artwork preview link.");
    } finally {
      setBusy(null);
    }
  };

  if (!invite) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 text-foreground">
        <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-3xl place-items-center">
          <Card className="w-full">
            <CardContent className="grid gap-3 p-6">
              <Skeleton className="h-6 max-w-xs" />
              <Skeleton className="h-24" />
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  if (invite.status !== "valid") {
    return <InviteUnavailable invite={invite} />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen max-w-6xl gap-4 px-4 py-4 md:px-6">
        <header className="flex items-center justify-between gap-3 border-b pb-4">
          <BrandMark ariaLabel="Wall Print Pro homepage" className="text-lg" label="Wall Print Pro invite page" />
          <Badge className="px-3 py-1.5 text-sm" variant="outline">{invite.remainingGenerations} preview links left</Badge>
        </header>

        <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
          <Card className="content-start bg-muted/50">
            <CardHeader>
              <CardDescription className="font-semibold uppercase text-primary">Invite upload page</CardDescription>
              <CardTitle className="text-4xl leading-none text-balance">Choose saved artwork or upload artwork.</CardTitle>
              <CardDescription className="text-base leading-7">
                This scoped page creates preview links for admin review without opening the workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex justify-between gap-3">
                <dt>Expires</dt>
                <dd className="font-semibold text-foreground">{formatDate(invite.expiresAt)}</dd>
              </div>
              <Separator />
              <div className="flex justify-between gap-3">
                <dt>Uploads left</dt>
                <dd className="font-semibold text-foreground">{invite.remainingUploadStarts}</dd>
              </div>
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-2xl">Saved artwork</CardTitle>
                  <Button
                    className="h-11 rounded-full px-4"
                    disabled={!canGenerate || !selectedSample || busy !== null}
                    onClick={() => void generateFromSample()}
                    type="button"
                  >
                    {busy === "sample" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Create preview link
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
              {samples.length === 0 ? (
                <Alert data-testid="invite-empty-gallery">
                  <AlertDescription>No saved artwork is available yet.</AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {samples.slice(0, 6).map((sample) => (
                    <Button
                      className={cn(
                        "grid h-auto gap-2 rounded-lg border bg-background p-2 text-left hover:border-primary",
                        sample.id === selectedSampleId && "border-primary shadow-[0_10px_24px_rgba(28,79,89,0.14)]"
                      )}
                      key={sample.id}
                      onClick={() => setSelectedSampleId(sample.id)}
                      type="button"
                      variant="outline"
                    >
                      <img alt="" className="aspect-[4/3] w-full rounded object-cover" src={sample.assets.poster} />
                      <span className="grid gap-1 px-1 pb-1">
                        <span className="font-semibold text-foreground">{sample.title}</span>
                        <span className="text-sm text-muted-foreground">{sample.print.label}</span>
                      </span>
                    </Button>
                  ))}
                </div>
              )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-accent text-primary">
                    <ImagePlus className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Uploaded artwork</CardTitle>
                    <CardDescription>JPEG, PNG, or WebP. The current default print size is applied.</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
              <form className="grid gap-3" onSubmit={submitUpload}>
                <div className="grid gap-2">
                  <Label htmlFor="invite-artwork">Artwork file</Label>
                  <Input
                    accept="image/jpeg,image/png,image/webp"
                    className="h-auto min-h-11 border-dashed py-8"
                    id="invite-artwork"
                    onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </div>

                <Alert>
                  <AlertDescription>Advanced physical-size overrides are deferred until real phone QA proves they are needed.</AlertDescription>
                </Alert>

                {normalizedUpload ? (
                  <Alert className="border-status-ready-border bg-status-ready text-status-ready-foreground">
                    <AlertDescription>
                      Prepared to {normalizedUpload.widthPx} x {normalizedUpload.heightPx}px PNG.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <Button className="h-11 w-fit rounded-full px-5" disabled={!canGenerate || busy !== null} type="submit">
                  {busy === "upload" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Create preview link
                </Button>
              </form>

              {result ? (
                <Alert className="mt-4 grid gap-3 bg-muted/60" data-testid="invite-generated-link">
                  <div>
                    <h3 className="text-lg font-semibold">{result.status === "ready" ? "Client preview ready" : "Client preview preparing"}</h3>
                    <AlertDescription className="break-all">{generatedUrl}</AlertDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="h-11 rounded-full px-4"
                      onClick={() => void copyGeneratedLink()}
                      type="button"
                    >
                      <Copy className="size-4" />
                      Copy link
                    </Button>
                    <Button asChild className="h-11 rounded-full px-4" variant="outline">
                      <Link href={result.publicUrl} target="_blank">
                        <ExternalLink className="size-4" />
                        Open client preview
                      </Link>
                    </Button>
                  </div>
                </Alert>
              ) : null}

              {notice ? (
                <Alert className="mt-4">
                  <AlertDescription>{notice}</AlertDescription>
                </Alert>
              ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
