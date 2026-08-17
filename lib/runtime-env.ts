const ENV_KEYS = {
  convexUrl: "CONVEX" + "_URL",
  publicConvexUrl: "NEXT_PUBLIC" + "_CONVEX_URL",
  phase0PreviewLocalFallback: "PHASE0" + "_PREVIEW_LOCAL_FALLBACK",
  wallPrintProPublicPhone: "WALL_PRINT_PRO" + "_PUBLIC_PHONE",
  wallPrintProPublicContactUrl: "WALL_PRINT_PRO" + "_PUBLIC_CONTACT_URL",
  wallPrintProReserveUrl: "WALL_PRINT_PRO" + "_RESERVE_URL",
  wallPrintProAiConceptsEnabled: "WALL_PRINT_PRO" + "_AI_CONCEPTS_ENABLED",
  wallPrintProCommunityGalleryEnabled: "WALL_PRINT_PRO" + "_COMMUNITY_GALLERY_ENABLED",
  openaiApiKey: "OPENAI" + "_API_KEY"
} as const;

function readRuntimeEnv(key: string) {
  return process.env[key];
}

export function readConvexRuntimeUrl() {
  return readRuntimeEnv(ENV_KEYS.convexUrl) ?? readRuntimeEnv(ENV_KEYS.publicConvexUrl);
}

export function readPhase0PreviewLocalFallback() {
  return readRuntimeEnv(ENV_KEYS.phase0PreviewLocalFallback) === "1";
}

export function readWallPrintProPublicPhone() {
  return readRuntimeEnv(ENV_KEYS.wallPrintProPublicPhone);
}

export function readWallPrintProPublicContactUrl() {
  return readRuntimeEnv(ENV_KEYS.wallPrintProPublicContactUrl);
}

export function readWallPrintProReserveUrl() {
  return readRuntimeEnv(ENV_KEYS.wallPrintProReserveUrl);
}

export function readWallPrintProAiConceptsEnabled() {
  const value = readRuntimeEnv(ENV_KEYS.wallPrintProAiConceptsEnabled);

  return value === "1" || value === "true";
}

export function readWallPrintProAiConceptsConfigured() {
  return readWallPrintProAiConceptsEnabled() && Boolean(readConvexRuntimeUrl());
}

export function readWallPrintProCommunityGalleryEnabled() {
  const value = readRuntimeEnv(ENV_KEYS.wallPrintProCommunityGalleryEnabled);

  return (value === "1" || value === "true") && Boolean(readConvexRuntimeUrl());
}
