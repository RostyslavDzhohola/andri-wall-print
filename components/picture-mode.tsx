"use client";

import {
  Camera,
  Check,
  ImageIcon,
  Layers3,
  LinkIcon,
  Move3D,
  RefreshCcw,
  Ruler,
  ScanLine,
  Upload
} from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type ArtworkSource = "sample" | "link" | "upload";

type Artwork = {
  id: string;
  title: string;
  src: string;
  source: ArtworkSource;
  ratio: number;
};

type OrientationSnapshot = {
  alpha: number;
  beta: number;
  gamma: number;
};

type SourceMode = "camera" | "photo" | "sample";

type CameraState = "idle" | "starting" | "ready" | "error";

type ScanStats = {
  active: boolean;
  progress: number;
  yawMin: number;
  yawMax: number;
  pitchMin: number;
  pitchMax: number;
  startedAt: number | null;
  baseline: OrientationSnapshot | null;
};

type SizeOption = {
  id: string;
  label: string;
  widthCm: number;
  heightCm: number;
};

type PlacedPrint = {
  id: string;
  artworkId: string;
  x: number;
  y: number;
  widthCm: number;
  heightCm: number;
  baseDistance: number;
  baseOrientation: OrientationSnapshot | null;
  rotationZ: number;
};

const SAMPLE_ARTWORKS: Artwork[] = [
  {
    id: "botanical-study",
    title: "Botanical Study",
    src: "/artworks/botanical-study.svg",
    source: "sample",
    ratio: 0.75
  },
  {
    id: "coastal-blocks",
    title: "Coastal Blocks",
    src: "/artworks/coastal-blocks.svg",
    source: "sample",
    ratio: 1.33
  },
  {
    id: "terra-forms",
    title: "Terra Forms",
    src: "/artworks/terra-forms.svg",
    source: "sample",
    ratio: 1
  }
];

const SIZE_OPTIONS: SizeOption[] = [
  { id: "50x70", label: "50 x 70 cm", widthCm: 50, heightCm: 70 },
  { id: "60x90", label: "60 x 90 cm", widthCm: 60, heightCm: 90 },
  { id: "80x120", label: "80 x 120 cm", widthCm: 80, heightCm: 120 }
];

const INITIAL_SCAN: ScanStats = {
  active: false,
  progress: 0,
  yawMin: 0,
  yawMax: 0,
  pitchMin: 0,
  pitchMax: 0,
  startedAt: null,
  baseline: null
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeAngle(value: number) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function createLinkArtwork(src: string, index: number): Artwork {
  return {
    id: `link-${index}-${src}`,
    title: `Client image ${index + 1}`,
    src,
    source: "link",
    ratio: 0.8
  };
}

function sourceLabel(source: ArtworkSource) {
  if (source === "link") return "Link";
  if (source === "upload") return "Upload";
  return "Sample";
}

function readQueryArtwork(): Artwork[] {
  if (typeof window === "undefined") return [];

  const params = new URLSearchParams(window.location.search);
  const repeated = params.getAll("art");
  const bundled = params
    .get("images")
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const urls = Array.from(new Set([...repeated, ...(bundled ?? [])])).filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  });

  return urls.map(createLinkArtwork);
}

export function PictureMode() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const [sourceMode, setSourceMode] = useState<SourceMode>("sample");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraMessage, setCameraMessage] = useState("Camera not started");
  const [wallPhotoUrl, setWallPhotoUrl] = useState<string | null>(null);
  const [linkArtworks, setLinkArtworks] = useState<Artwork[]>([]);
  const [uploadedArtworks, setUploadedArtworks] = useState<Artwork[]>([]);
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<string[]>([
    SAMPLE_ARTWORKS[0].id
  ]);
  const [activeArtworkId, setActiveArtworkId] = useState(SAMPLE_ARTWORKS[0].id);
  const [selectedSizeId, setSelectedSizeId] = useState(SIZE_OPTIONS[1].id);
  const [distanceMeters, setDistanceMeters] = useState(2.4);
  const [orientation, setOrientation] = useState<OrientationSnapshot | null>(null);
  const [motionMessage, setMotionMessage] = useState("Motion not requested");
  const [scan, setScan] = useState<ScanStats>(INITIAL_SCAN);
  const [placedPrints, setPlacedPrints] = useState<PlacedPrint[]>([]);
  const [newArtworkUrl, setNewArtworkUrl] = useState("");

  const artworks = useMemo(
    () => [...linkArtworks, ...uploadedArtworks, ...SAMPLE_ARTWORKS],
    [linkArtworks, uploadedArtworks]
  );

  const selectedSize = useMemo(
    () => SIZE_OPTIONS.find((size) => size.id === selectedSizeId) ?? SIZE_OPTIONS[1],
    [selectedSizeId]
  );

  const activeArtwork = useMemo(
    () => artworks.find((artwork) => artwork.id === activeArtworkId) ?? artworks[0],
    [activeArtworkId, artworks]
  );

  const sourceReady =
    sourceMode === "sample" ||
    (sourceMode === "photo" && Boolean(wallPhotoUrl)) ||
    (sourceMode === "camera" && cameraState === "ready");
  const wallReady = sourceReady && scan.progress >= 100;
  const yawRange = scan.yawMax - scan.yawMin;
  const pitchRange = scan.pitchMax - scan.pitchMin;

  useEffect(() => {
    const queryArtworks = readQueryArtwork();
    if (queryArtworks.length === 0) return;

    setLinkArtworks(queryArtworks);
    setSelectedArtworkIds(queryArtworks.map((artwork) => artwork.id));
    setActiveArtworkId(queryArtworks[0].id);
  }, []);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const next = {
        alpha: event.alpha ?? 0,
        beta: event.beta ?? 0,
        gamma: event.gamma ?? 0
      };
      setOrientation(next);

      setScan((current) => {
        if (!current.active) return current;

        const baseline = current.baseline ?? next;
        const yawDelta = normalizeAngle(next.alpha - baseline.alpha);
        const pitchDelta = next.beta - baseline.beta;

        return {
          ...current,
          baseline,
          yawMin: Math.min(current.yawMin, yawDelta),
          yawMax: Math.max(current.yawMax, yawDelta),
          pitchMin: Math.min(current.pitchMin, pitchDelta),
          pitchMax: Math.max(current.pitchMax, pitchDelta)
        };
      });
    };

    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  useEffect(() => {
    if (!scan.active) return;

    const timer = window.setInterval(() => {
      setScan((current) => {
        if (!current.active || !current.startedAt) return current;

        const elapsed = Date.now() - current.startedAt;
        const timeScore = clamp(elapsed / 6200, 0, 1);
        const yawScore = clamp((current.yawMax - current.yawMin) / 36, 0, 1);
        const pitchScore = clamp((current.pitchMax - current.pitchMin) / 18, 0, 1);
        const progress = sourceReady
          ? Math.round(clamp(timeScore * 0.65 + yawScore * 0.25 + pitchScore * 0.1, 0, 1) * 100)
          : 0;

        return {
          ...current,
          active: progress < 100,
          progress
        };
      });
    }, 180);

    return () => {
      window.clearInterval(timer);
    };
  }, [scan.active, sourceReady]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (sourceMode !== "camera") {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraState((current) => (current === "ready" ? "idle" : current));
    }
  }, [sourceMode]);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setCameraMessage("This browser does not expose camera access.");
      return;
    }

    setSourceMode("camera");
    setCameraState("starting");
    setCameraMessage("Requesting rear camera");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("ready");
      setCameraMessage("Camera ready");
    } catch (error) {
      setCameraState("error");
      setCameraMessage(error instanceof Error ? error.message : "Camera failed to start.");
    }
  }

  async function requestMotion() {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setMotionMessage("This browser does not expose device orientation.");
      return;
    }

    const orientationEvent = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<PermissionState>;
    };

    if (typeof orientationEvent.requestPermission === "function") {
      try {
        const permission = await orientationEvent.requestPermission();
        setMotionMessage(permission === "granted" ? "Motion enabled" : "Motion denied");
      } catch (error) {
        setMotionMessage(error instanceof Error ? error.message : "Motion permission failed.");
      }
      return;
    }

    setMotionMessage("Motion enabled if the browser provides it.");
  }

  async function beginScan() {
    if (sourceMode === "camera" && cameraState !== "ready") {
      await startCamera();
    }

    await requestMotion();

    setScan({
      ...INITIAL_SCAN,
      active: true,
      startedAt: Date.now(),
      baseline: orientation
    });
  }

  function resetScan() {
    setScan(INITIAL_SCAN);
  }

  function completeManualCalibration() {
    if (!sourceReady) return;

    setScan({
      ...INITIAL_SCAN,
      progress: 100,
      baseline: orientation
    });
  }

  function addArtworkUrl() {
    const trimmed = newArtworkUrl.trim();
    if (!trimmed) return;

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
    } catch {
      return;
    }

    const next = createLinkArtwork(trimmed, linkArtworks.length);
    setLinkArtworks((current) => [next, ...current]);
    setSelectedArtworkIds((current) => Array.from(new Set([next.id, ...current])));
    setActiveArtworkId(next.id);
    setNewArtworkUrl("");
  }

  function handleArtworkUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length === 0) return;

    const nextArtworks = files.map((file, index) => {
      const src = URL.createObjectURL(file);
      objectUrlsRef.current.push(src);
      const id = `upload-${Date.now()}-${index}`;
      const artwork: Artwork = {
        id,
        title: file.name.replace(/\.[^/.]+$/, "") || `Uploaded image ${index + 1}`,
        src,
        source: "upload",
        ratio: 0.8
      };

      const image = new window.Image();
      image.onload = () => {
        setUploadedArtworks((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ratio: clamp(image.naturalWidth / image.naturalHeight, 0.35, 2.4)
                }
              : item
          )
        );
      };
      image.src = src;

      return artwork;
    });

    setUploadedArtworks((current) => [...nextArtworks, ...current]);
    setSelectedArtworkIds((current) =>
      Array.from(new Set([...nextArtworks.map((artwork) => artwork.id), ...current]))
    );
    setActiveArtworkId(nextArtworks[0].id);
    event.target.value = "";
  }

  function handleWallPhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    if (wallPhotoUrl) URL.revokeObjectURL(wallPhotoUrl);

    const nextUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(nextUrl);
    setWallPhotoUrl(nextUrl);
    setSourceMode("photo");
    resetScan();
    event.target.value = "";
  }

  function toggleArtwork(artworkId: string) {
    setSelectedArtworkIds((current) => {
      if (current.includes(artworkId)) {
        if (current.length === 1) {
          setActiveArtworkId(artworkId);
          return current;
        }

        const next = current.filter((id) => id !== artworkId);
        if (activeArtworkId === artworkId) {
          setActiveArtworkId(next[0]);
        }
        return next;
      }

      setActiveArtworkId(artworkId);
      return [...current, artworkId];
    });
  }

  function handleStagePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!wallReady || !activeArtwork) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0.05, 0.95);
    const y = clamp((event.clientY - rect.top) / rect.height, 0.08, 0.92);

    setPlacedPrints((current) => [
      ...current,
      {
        id: `placed-${Date.now()}`,
        artworkId: activeArtwork.id,
        x,
        y,
        widthCm: selectedSize.widthCm,
        heightCm: selectedSize.heightCm,
        baseDistance: distanceMeters,
        baseOrientation: orientation,
        rotationZ: clamp((x - 0.5) * -6, -4, 4)
      }
    ]);
  }

  function clearPlacedPrints() {
    setPlacedPrints([]);
  }

  function renderPlacedPrint(placed: PlacedPrint) {
    const artwork = artworks.find((item) => item.id === placed.artworkId);
    if (!artwork) return null;

    const baseOrientation = placed.baseOrientation;
    const yawDelta =
      orientation && baseOrientation ? normalizeAngle(orientation.alpha - baseOrientation.alpha) : 0;
    const pitchDelta = orientation && baseOrientation ? orientation.beta - baseOrientation.beta : 0;
    const rollDelta = orientation && baseOrientation ? orientation.gamma - baseOrientation.gamma : 0;
    const x = clamp(placed.x - Math.tan((yawDelta * Math.PI) / 180) * 0.38, -0.18, 1.18);
    const y = clamp(placed.y + pitchDelta * 0.008, -0.12, 1.12);
    const scale = clamp(placed.baseDistance / distanceMeters, 0.45, 1.85);
    const widthPercent = clamp((placed.widthCm / 180) * 32 * scale, 10, 52);
    const rotateY = clamp(-yawDelta * 0.62 - rollDelta * 0.18, -34, 34);
    const rotateX = clamp(-pitchDelta * 0.22, -14, 14);
    const rotateZ = clamp(placed.rotationZ + rollDelta * 0.08, -8, 8);
    const style: CSSProperties = {
      left: `${x * 100}%`,
      top: `${y * 100}%`,
      width: `${widthPercent}%`,
      aspectRatio: `${placed.widthCm} / ${placed.heightCm}`,
      transform: `translate(-50%, -50%) perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
      transformStyle: "preserve-3d"
    };

    return (
      <button
        key={placed.id}
        className="wall-print-shadow absolute origin-center rounded-md border-[10px] border-white bg-card shadow-2xl outline-none ring-primary transition-transform focus-visible:ring-[3px]"
        style={style}
        title={`${artwork.title} placed on wall`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setPlacedPrints((current) => current.filter((item) => item.id !== placed.id));
        }}
      >
        <img
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
          src={artwork.src}
        />
      </button>
    );
  }

  const scanLabel = wallReady
    ? "Wall locked"
    : scan.active
      ? "Scanning wall"
      : sourceReady
        ? "Ready to scan"
        : "Choose a wall source";

  return (
    <main className="min-h-screen px-4 py-4 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-4">
        <header className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold leading-tight">Preview Picture</h1>
              <Badge variant="secondary">No auth</Badge>
              <Badge variant={wallReady ? "default" : "outline"}>{scanLabel}</Badge>
            </div>
            <p className="max-w-3xl text-sm leading-5 text-muted-foreground">
              Select client artwork, scan a wall, tap to place, then adjust viewing distance while the preview responds to phone motion.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm lg:min-w-[360px]">
            <div className="rounded-md border bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">Selected</div>
              <div className="font-semibold">{selectedArtworkIds.length}</div>
            </div>
            <div className="rounded-md border bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">Placed</div>
              <div className="font-semibold">{placedPrints.length}</div>
            </div>
            <div className="rounded-md border bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">Distance</div>
              <div className="font-semibold">{distanceMeters.toFixed(1)} m</div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers3 data-icon="inline-start" />
                  Paintings
                </CardTitle>
                <CardDescription>
                  URL images from a client link appear here automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    aria-label="Artwork image URL"
                    placeholder="Paste artwork image URL"
                    value={newArtworkUrl}
                    onChange={(event) => setNewArtworkUrl(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addArtworkUrl();
                    }}
                  />
                  <Button aria-label="Add artwork link" size="icon" type="button" onClick={addArtworkUrl}>
                    <LinkIcon />
                  </Button>
                </div>

                <Button asChild variant="outline">
                  <label className="cursor-pointer">
                    <Upload data-icon="inline-start" />
                    Upload artwork
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleArtworkUpload}
                    />
                  </label>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  {artworks.map((artwork) => {
                    const selected = selectedArtworkIds.includes(artwork.id);
                    const active = activeArtworkId === artwork.id;

                    return (
                      <button
                        key={artwork.id}
                        className={cn(
                          "group flex min-h-[158px] flex-col overflow-hidden rounded-lg border bg-background text-left shadow-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          selected && "border-primary",
                          active && "bg-accent"
                        )}
                        type="button"
                        onClick={() => toggleArtwork(artwork.id)}
                      >
                        <span className="relative block h-24 bg-muted">
                          <img
                            alt=""
                            className="h-full w-full object-cover"
                            draggable={false}
                            src={artwork.src}
                          />
                          {selected ? (
                            <span className="absolute right-2 top-2 rounded-md bg-primary p-1 text-primary-foreground">
                              <Check />
                            </span>
                          ) : null}
                        </span>
                        <span className="flex flex-1 flex-col gap-1 p-2">
                          <span className="truncate text-sm font-medium">{artwork.title}</span>
                          <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>{sourceLabel(artwork.source)}</span>
                            {active ? <span className="font-medium text-primary">Active</span> : null}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler data-icon="inline-start" />
                  Size and distance
                </CardTitle>
                <CardDescription>
                  Distance controls scale. Moving farther makes placed prints smaller.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ToggleGroup
                  className="grid grid-cols-3"
                  type="single"
                  value={selectedSizeId}
                  variant="outline"
                  onValueChange={(value) => {
                    if (value) setSelectedSizeId(value);
                  }}
                >
                  {SIZE_OPTIONS.map((size) => (
                    <ToggleGroupItem key={size.id} value={size.id}>
                      {size.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">Viewing distance</span>
                    <span className="text-muted-foreground">{distanceMeters.toFixed(1)} m</span>
                  </div>
                  <Slider
                    min={0.9}
                    max={5}
                    step={0.1}
                    value={[distanceMeters]}
                    onValueChange={(value) => setDistanceMeters(value[0] ?? distanceMeters)}
                  />
                  <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                    <span>Closer</span>
                    <span>Farther</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="flex min-w-0 flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScanLine data-icon="inline-start" />
                  Picture mode
                </CardTitle>
                <CardDescription>
                  Start from camera, a wall photo, or the sample room. Placement unlocks after calibration.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <ToggleGroup
                    type="single"
                    value={sourceMode}
                    variant="outline"
                    onValueChange={(value) => {
                      if (value) {
                        setSourceMode(value as SourceMode);
                        resetScan();
                      }
                    }}
                  >
                    <ToggleGroupItem value="camera">
                      <Camera data-icon="inline-start" />
                      Camera
                    </ToggleGroupItem>
                    <ToggleGroupItem value="photo">
                      <ImageIcon data-icon="inline-start" />
                      Wall photo
                    </ToggleGroupItem>
                    <ToggleGroupItem value="sample">
                      <Move3D data-icon="inline-start" />
                      Sample wall
                    </ToggleGroupItem>
                  </ToggleGroup>

                  <div className="flex flex-wrap items-center gap-2">
                    {sourceMode === "camera" ? (
                      <Button
                        type="button"
                        variant={cameraState === "ready" ? "secondary" : "default"}
                        onClick={startCamera}
                      >
                        <Camera data-icon="inline-start" />
                        {cameraState === "ready" ? "Restart camera" : "Start camera"}
                      </Button>
                    ) : null}
                    {sourceMode === "photo" ? (
                      <Button asChild variant="outline">
                        <label className="cursor-pointer">
                          <Upload data-icon="inline-start" />
                          Choose wall photo
                          <input
                            className="sr-only"
                            type="file"
                            accept="image/*"
                            onChange={handleWallPhotoUpload}
                          />
                        </label>
                      </Button>
                    ) : null}
                    <Button disabled={!sourceReady} type="button" onClick={beginScan}>
                      <ScanLine data-icon="inline-start" />
                      Scan and calibrate
                    </Button>
                    <Button
                      disabled={!sourceReady || scan.active}
                      type="button"
                      variant="outline"
                      onClick={completeManualCalibration}
                    >
                      <Check data-icon="inline-start" />
                      Lock wall
                    </Button>
                    <Button type="button" variant="ghost" onClick={clearPlacedPrints}>
                      <RefreshCcw data-icon="inline-start" />
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div
                    className="camera-mask stage-grid relative aspect-[16/10] min-h-[360px] overflow-hidden rounded-xl border bg-[#2f332f] shadow-inner"
                    role="application"
                    aria-label="Wall preview stage"
                    onPointerDown={handleStagePointerDown}
                  >
                    {sourceMode === "camera" ? (
                      <>
                        <video
                          ref={videoRef}
                          className={cn(
                            "h-full w-full object-cover",
                            cameraState !== "ready" && "opacity-20"
                          )}
                          muted
                          playsInline
                        />
                        {cameraState !== "ready" ? (
                          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
                            <div className="flex max-w-sm flex-col items-center gap-3 rounded-lg border border-white/20 bg-black/40 p-4">
                              <Camera />
                              <div className="text-lg font-semibold">{cameraMessage}</div>
                              <div className="text-sm text-white/75">
                                Camera previews require browser permission and usually HTTPS on a phone.
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : null}

                    {sourceMode === "photo" ? (
                      wallPhotoUrl ? (
                        <img
                          alt=""
                          className="h-full w-full object-cover"
                          draggable={false}
                          src={wallPhotoUrl}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted p-6 text-center">
                          <div className="flex max-w-sm flex-col items-center gap-3">
                            <ImageIcon />
                            <div className="text-lg font-semibold">Choose a wall photo</div>
                            <div className="text-sm text-muted-foreground">
                              A straight-on wall photo is the fastest client-safe preview.
                            </div>
                          </div>
                        </div>
                      )
                    ) : null}

                    {sourceMode === "sample" ? (
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        draggable={false}
                        src="/wall-room.svg"
                      />
                    ) : null}

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45" />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-32 -translate-x-1/2 bg-white/35" />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-px -translate-y-1/2 bg-white/35" />

                    {placedPrints.map(renderPlacedPrint)}

                    <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                      <Badge variant={wallReady ? "default" : "secondary"}>{scanLabel}</Badge>
                      <Badge variant="outline" className="bg-background/85">
                        {activeArtwork?.title ?? "No active artwork"}
                      </Badge>
                    </div>

                    {!wallReady ? (
                      <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-white/20 bg-black/48 p-3 text-white backdrop-blur">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium">Calibration required</span>
                            <span>{scan.progress}%</span>
                          </div>
                          <Progress value={scan.progress} />
                          <div className="text-xs leading-5 text-white/75">
                            Move slowly across the wall, then tap Lock wall when the guide is aligned.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-white/20 bg-black/48 p-3 text-white backdrop-blur">
                        <div className="text-sm font-medium">Tap the wall to place the active painting.</div>
                        <div className="text-xs leading-5 text-white/75">
                          Tap a placed painting to remove it.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Tracking status</div>
                        <div className="text-xs text-muted-foreground">{scanLabel}</div>
                      </div>
                      <Badge variant={wallReady ? "default" : "outline"}>
                        {wallReady ? "Ready" : "Blocked"}
                      </Badge>
                    </div>
                    <Progress value={scan.progress} />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-md border bg-card p-3">
                        <div className="text-xs text-muted-foreground">Yaw sweep</div>
                        <div className="font-semibold">{Math.round(yawRange)} deg</div>
                      </div>
                      <div className="rounded-md border bg-card p-3">
                        <div className="text-xs text-muted-foreground">Pitch sweep</div>
                        <div className="font-semibold">{Math.round(pitchRange)} deg</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Camera</span>
                        <span className="font-medium">{cameraMessage}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Motion</span>
                        <span className="font-medium">{motionMessage}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Orientation</span>
                        <span className="font-medium">
                          {orientation
                            ? `${Math.round(orientation.alpha)} / ${Math.round(
                                orientation.beta
                              )} / ${Math.round(orientation.gamma)}`
                            : "No samples"}
                        </span>
                      </div>
                    </div>
                    <Separator />
                    <div className="rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">
                      Browser Picture mode uses camera/photo preview plus calibration. Native ARKit wall anchors are not available from a normal web link, so distance is calibrated and orientation controls perspective.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
