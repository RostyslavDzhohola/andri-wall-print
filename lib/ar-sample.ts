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
};

export const AR_SAMPLE: ArSample = {
  id: "dragon-wall-print",
  title: "Dragon Wall Print",
  description: "A high-detail cinematic dragon artwork for proving native AR wall placement.",
  print: {
    aspectRatio: "1:2",
    widthMeters: 0.45,
    heightMeters: 0.9,
    label: "45 x 90 cm"
  },
  assets: {
    glb: "/ar/dragon-wall-print.glb",
    usdz: "/ar/dragon-wall-print.usdz",
    poster: "/artworks/dragon-wall-print.png"
  }
};

export function formatMeters(value: number) {
  return `${Math.round(value * 100)} cm`;
}
