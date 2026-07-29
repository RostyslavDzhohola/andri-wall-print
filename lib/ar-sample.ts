import {
  formatDecimalFeetFromMeters,
  makePreviewBundlePrintFromDimensions,
  type PreviewBundlePrint
} from "./preview-bundle-contract";

export type ArAssetPath = string;

export type ArSample = {
  id: string;
  title: string;
  description: string;
  shareUrl?: string;
  print: PreviewBundlePrint;
  assets: {
    glb: ArAssetPath;
    usdz: ArAssetPath;
    poster: ArAssetPath;
  };
};

export const AR_SAMPLES: ArSample[] = [
  {
    id: "chicago-final-1",
    title: "Pathways to Success",
    description: "Chicago skyline artwork with the Bean, students, and the Pathways to Success message.",
    print: makePreviewBundlePrintFromDimensions({ width: 60, height: 50, unit: "in" }),
    assets: {
      glb: "/api/ar/chicago-final-1.glb",
      usdz: "/api/ar/chicago-final-1.usdz",
      poster: "/artworks/chicago-final-1.jpg"
    }
  },
  {
    id: "chicago-final-2",
    title: "Lakefront Day",
    description: "Chicago lakefront artwork with the skyline, trail, sailboats, and summer shoreline activity.",
    print: makePreviewBundlePrintFromDimensions({ width: 36, height: 60, unit: "in" }),
    assets: {
      glb: "/api/ar/chicago-final-2.glb",
      usdz: "/api/ar/chicago-final-2.usdz",
      poster: "/artworks/chicago-final-2.jpg"
    }
  },
  {
    id: "chicago-final-3",
    title: "River Train Crossing",
    description: "Chicago train artwork with elevated tracks, river bridge, skyline, and commuters.",
    print: makePreviewBundlePrintFromDimensions({ width: 48, height: 60, unit: "in" }),
    assets: {
      glb: "/api/ar/chicago-final-3.glb",
      usdz: "/api/ar/chicago-final-3.usdz",
      poster: "/artworks/chicago-final-3.jpg"
    }
  }
];

export const DEFAULT_AR_SAMPLE = AR_SAMPLES[0];

export const AR_SAMPLE_IDS = AR_SAMPLES.map((sample) => sample.id);

export const AR_ASSET_FILE_NAMES = new Set(
  AR_SAMPLES.flatMap((sample) => [sample.assets.glb, sample.assets.usdz]).map(
    (path) => path.slice(path.lastIndexOf("/") + 1),
  ),
);

export function getArSample(id: string) {
  return AR_SAMPLES.find((sample) => sample.id === id) ?? DEFAULT_AR_SAMPLE;
}

export function formatMeters(value: number) {
  return formatDecimalFeetFromMeters(value);
}

export function formatPrintSize(print: ArSample["print"]) {
  return `${formatMeters(print.widthMeters)} wide x ${formatMeters(print.heightMeters)} tall`;
}
