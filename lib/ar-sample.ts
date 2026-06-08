export type ArAssetPath = string;

export type ArSample = {
  id: string;
  title: string;
  description: string;
  print: {
    aspectRatio: string;
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
    id: "chicago-final-1",
    title: "Chicago Final 1",
    description: "Client-supplied Chicago wall artwork with the original 60 x 50 inch PDF proportions.",
    print: {
      aspectRatio: "6:5",
      widthMeters: 1.524,
      heightMeters: 1.27,
      label: "152 x 127 cm"
    },
    assets: {
      glb: "/ar/chicago-final-1.glb",
      usdz: "/ar/chicago-final-1.usdz",
      poster: "/artworks/chicago-final-1.png"
    }
  },
  {
    id: "chicago-final-2",
    title: "Chicago Final 2",
    description: "Client-supplied Chicago lakefront artwork with the original 36 x 60 inch PDF proportions.",
    print: {
      aspectRatio: "3:5",
      widthMeters: 0.914,
      heightMeters: 1.524,
      label: "91 x 152 cm"
    },
    assets: {
      glb: "/ar/chicago-final-2.glb",
      usdz: "/ar/chicago-final-2.usdz",
      poster: "/artworks/chicago-final-2.png"
    }
  },
  {
    id: "chicago-final-3",
    title: "Chicago Final 3",
    description: "Client-supplied Chicago train artwork with the original 48 x 60 inch PDF proportions.",
    print: {
      aspectRatio: "4:5",
      widthMeters: 1.22,
      heightMeters: 1.524,
      label: "122 x 152 cm"
    },
    assets: {
      glb: "/ar/chicago-final-3.glb",
      usdz: "/ar/chicago-final-3.usdz",
      poster: "/artworks/chicago-final-3.png"
    }
  },
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
