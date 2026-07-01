import {
  formatDecimalFeetFromMeters,
  makePreviewBundlePrintFromCentimeters,
  makePreviewBundlePrintFromDimensions,
  type PreviewBundlePrint
} from "./preview-bundle-contract";

export type ArAssetPath = string;

export type ArSample = {
  id: string;
  title: string;
  description: string;
  print: PreviewBundlePrint;
  assets: {
    glb: ArAssetPath;
    usdz: ArAssetPath;
    poster: ArAssetPath;
  };
};

const PRINT_SIZE: ArSample["print"] = makePreviewBundlePrintFromCentimeters(45, 90);

export const AR_SAMPLES: ArSample[] = [
  {
    id: "chicago-final-1",
    title: "Pathways to Success",
    description: "Chicago skyline artwork with the Bean, students, and the Pathways to Success message.",
    print: makePreviewBundlePrintFromDimensions({ width: 60, height: 50, unit: "in" }),
    assets: {
      glb: "/ar/chicago-final-1.glb",
      usdz: "/ar/chicago-final-1.usdz",
      poster: "/artworks/chicago-final-1.png"
    }
  },
  {
    id: "chicago-final-2",
    title: "Lakefront Day",
    description: "Chicago lakefront artwork with the skyline, trail, sailboats, and summer shoreline activity.",
    print: makePreviewBundlePrintFromDimensions({ width: 36, height: 60, unit: "in" }),
    assets: {
      glb: "/ar/chicago-final-2.glb",
      usdz: "/ar/chicago-final-2.usdz",
      poster: "/artworks/chicago-final-2.png"
    }
  },
  {
    id: "chicago-final-3",
    title: "River Train Crossing",
    description: "Chicago train artwork with elevated tracks, river bridge, skyline, and commuters.",
    print: makePreviewBundlePrintFromDimensions({ width: 48, height: 60, unit: "in" }),
    assets: {
      glb: "/ar/chicago-final-3.glb",
      usdz: "/ar/chicago-final-3.usdz",
      poster: "/artworks/chicago-final-3.png"
    }
  },
  {
    id: "dragon-wall-print",
    title: "Ember Dragon",
    description: "A high-detail cinematic dragon artwork for proving native AR wall placement.",
    print: PRINT_SIZE,
    assets: {
      glb: "/ar/dragon-wall-print.glb",
      usdz: "/ar/dragon-wall-print.usdz",
      poster: "/artworks/dragon-wall-print.png"
    }
  },
  {
    id: "elven-wall-print",
    title: "Moonlit Elven Portrait",
    description: "An original high-fantasy portrait with luminous forest detail and silver ceremonial styling.",
    print: PRINT_SIZE,
    assets: {
      glb: "/ar/elven-wall-print.glb",
      usdz: "/ar/elven-wall-print.usdz",
      poster: "/artworks/elven-wall-print.png"
    }
  },
  {
    id: "cyberpunk-wall-print",
    title: "Neon Rain City",
    description: "A neon rain-soaked city scene built for a bold sci-fi wall print.",
    print: PRINT_SIZE,
    assets: {
      glb: "/ar/cyberpunk-wall-print.glb",
      usdz: "/ar/cyberpunk-wall-print.usdz",
      poster: "/artworks/cyberpunk-wall-print.png"
    }
  }
];

export const DEFAULT_AR_SAMPLE = AR_SAMPLES[0];

export const AR_SAMPLE_IDS = AR_SAMPLES.map((sample) => sample.id);

export function getArSample(id: string) {
  return AR_SAMPLES.find((sample) => sample.id === id) ?? DEFAULT_AR_SAMPLE;
}

export function formatMeters(value: number) {
  return formatDecimalFeetFromMeters(value);
}

export function formatPrintSize(print: ArSample["print"]) {
  return `${formatMeters(print.widthMeters)} wide x ${formatMeters(print.heightMeters)} tall`;
}
