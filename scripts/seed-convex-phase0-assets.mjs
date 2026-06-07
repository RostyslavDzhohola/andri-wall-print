import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
const seedToken = process.env.PHASE0_SEED_TOKEN;

if (!convexUrl) {
  throw new Error("Set CONVEX_URL or NEXT_PUBLIC_CONVEX_URL before seeding Phase 0 assets.");
}

if (!seedToken) {
  throw new Error("Set PHASE0_SEED_TOKEN before seeding Phase 0 assets.");
}

const normalizedConvexUrl = convexUrl.replace(/\/+$/, "");

const seeds = [
  {
    slug: "chicago-final-1",
    title: "Chicago Final 1",
    description: "Client-supplied Chicago wall artwork with the original 60 x 50 inch PDF proportions.",
    print: {
      aspectRatio: "6:5",
      widthMeters: 1.524,
      heightMeters: 1.27,
      label: "152 x 127 cm"
    },
    sourcePdfName: "Chicago final1.pdf"
  },
  {
    slug: "chicago-final-2",
    title: "Chicago Final 2",
    description: "Client-supplied Chicago lakefront artwork with the original 36 x 60 inch PDF proportions.",
    print: {
      aspectRatio: "3:5",
      widthMeters: 0.914,
      heightMeters: 1.524,
      label: "91 x 152 cm"
    },
    sourcePdfName: "Chicago final2.pdf"
  },
  {
    slug: "chicago-final-3",
    title: "Chicago Final 3",
    description: "Client-supplied Chicago train artwork with the original 48 x 60 inch PDF proportions.",
    print: {
      aspectRatio: "4:5",
      widthMeters: 1.22,
      heightMeters: 1.524,
      label: "122 x 152 cm"
    },
    sourcePdfName: "Chicago final3.pdf"
  }
];

const assetKinds = {
  poster: {
    relativePath: (slug) => join("public", "artworks", `${slug}.png`),
    fileName: (slug) => `${slug}.png`,
    contentType: "image/png"
  },
  glb: {
    relativePath: (slug) => join("public", "ar", `${slug}.glb`),
    fileName: (slug) => `${slug}.glb`,
    contentType: "model/gltf-binary"
  },
  usdz: {
    relativePath: (slug) => join("public", "ar", `${slug}.usdz`),
    fileName: (slug) => `${slug}.usdz`,
    contentType: "model/vnd.usdz+zip"
  }
};

async function runConvexMutation(path, args) {
  const response = await fetch(`${normalizedConvexUrl}/api/mutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      path,
      args,
      format: "json"
    })
  });

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}.`);
  }

  const body = await response.json();

  if (body.status !== "success") {
    throw new Error(`${path} failed: ${body.errorMessage ?? "unknown Convex error"}`);
  }

  return body.value;
}

async function uploadAsset(kind, slug) {
  const descriptor = assetKinds[kind];
  const filePath = descriptor.relativePath(slug);
  const [bytes, stats] = await Promise.all([readFile(filePath), stat(filePath)]);
  const uploadUrl = await runConvexMutation("arPreviews:generateSeedUploadUrl", { seedToken });
  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": descriptor.contentType
    },
    body: bytes
  });

  if (!upload.ok) {
    throw new Error(`Upload failed for ${filePath}: HTTP ${upload.status}.`);
  }

  const { storageId } = await upload.json();

  return {
    storageId,
    meta: {
      fileName: descriptor.fileName(slug),
      contentType: descriptor.contentType,
      byteLength: stats.size
    }
  };
}

for (const seed of seeds) {
  const uploaded = {
    poster: await uploadAsset("poster", seed.slug),
    glb: await uploadAsset("glb", seed.slug),
    usdz: await uploadAsset("usdz", seed.slug)
  };

  const id = await runConvexMutation("arPreviews:upsertSeedPreview", {
    seedToken,
    slug: seed.slug,
    title: seed.title,
    description: seed.description,
    print: seed.print,
    sourcePdfName: seed.sourcePdfName,
    assetStorageIds: {
      poster: uploaded.poster.storageId,
      glb: uploaded.glb.storageId,
      usdz: uploaded.usdz.storageId
    },
    assetMeta: {
      poster: uploaded.poster.meta,
      glb: uploaded.glb.meta,
      usdz: uploaded.usdz.meta
    }
  });

  console.log(`Seeded ${seed.slug} as ${id}`);
}
