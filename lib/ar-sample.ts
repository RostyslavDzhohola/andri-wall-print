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

const PRINT_SIZE: ArSample["print"] = {
  aspectRatio: "1:2",
  widthMeters: 0.45,
  heightMeters: 0.9,
  label: "45 x 90 cm"
};

export const AR_SAMPLES: ArSample[] = [
  {
    id: "dragon-wall-print",
    title: "Dragon Wall Print",
    description: "A high-detail cinematic dragon artwork for proving native AR wall placement.",
    print: PRINT_SIZE,
    assets: {
      glb: "/ar/dragon-wall-print.glb",
      usdz: "/ar/dragon-wall-print.usdz",
      poster: "/artworks/dragon-wall-print.png"
    }
  },
  {
    id: "terra-forms",
    title: "Terra Forms",
    description: "A warm abstract composition with organic shapes and grounded gallery colors.",
    print: PRINT_SIZE,
    assets: {
      glb: "/ar/terra-forms.glb",
      usdz: "/ar/terra-forms.usdz",
      poster: "/artworks/terra-forms.png"
    }
  },
  {
    id: "coastal-blocks",
    title: "Coastal Blocks",
    description: "A coastal color-block print with layered waves, sun, and clean graphic lines.",
    print: PRINT_SIZE,
    assets: {
      glb: "/ar/coastal-blocks.glb",
      usdz: "/ar/coastal-blocks.usdz",
      poster: "/artworks/coastal-blocks.png"
    }
  },
  {
    id: "botanical-study",
    title: "Botanical Study",
    description: "A tall botanical illustration with layered leaves and restrained natural accents.",
    print: PRINT_SIZE,
    assets: {
      glb: "/ar/botanical-study.glb",
      usdz: "/ar/botanical-study.usdz",
      poster: "/artworks/botanical-study.png"
    }
  },
  {
    id: "elven-wall-print",
    title: "Elven Portrait",
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
    title: "Cyberpunk Skyline",
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
  return `${Math.round(value * 100)} cm`;
}
