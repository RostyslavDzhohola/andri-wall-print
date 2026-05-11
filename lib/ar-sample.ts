export type ArAssetPath = `/${string}`;

export type ArSample = {
  id: string;
  title: string;
  description: string;
  print: {
    aspectRatio: "1:2";
    widthMeters: number;
    heightMeters: number;
    label: string;
  };
  assets: {
    glb: ArAssetPath;
    usdz: ArAssetPath;
    poster: ArAssetPath;
  };
  fallbackHref: ArAssetPath;
};

export const AR_SAMPLE: ArSample = {
  id: "static-tall-print",
  title: "Static Tall Print",
  description: "A checked-in 1:2 flat wall print for proving native AR placement.",
  print: {
    aspectRatio: "1:2",
    widthMeters: 0.45,
    heightMeters: 0.9,
    label: "45 x 90 cm"
  },
  assets: {
    glb: "/ar/static-tall-print.glb",
    usdz: "/ar/static-tall-print.usdz",
    poster: "/ar/static-tall-print-poster.svg"
  },
  fallbackHref: "/picture-mode"
};

export function formatMeters(value: number) {
  return `${Math.round(value * 100)} cm`;
}
