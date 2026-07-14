const ENV_KEYS = {
  clerkPublishableKey: "NEXT_PUBLIC" + "_CLERK_PUBLISHABLE_KEY",
  clerkSecretKey: "CLERK" + "_SECRET_KEY",
  convexUrl: "CONVEX" + "_URL",
  publicConvexUrl: "NEXT_PUBLIC" + "_CONVEX_URL",
  phase0PreviewLocalFallback: "PHASE0" + "_PREVIEW_LOCAL_FALLBACK",
  wallPrintProPublicPhone: "WALL_PRINT_PRO" + "_PUBLIC_PHONE",
  wallPrintProPublicContactUrl: "WALL_PRINT_PRO" + "_PUBLIC_CONTACT_URL",
  wallPrintProReserveUrl: "WALL_PRINT_PRO" + "_RESERVE_URL",
  wallPrintProAiConceptsEnabled: "WALL_PRINT_PRO" + "_AI_CONCEPTS_ENABLED",
  openaiApiKey: "OPENAI" + "_API_KEY"
} as const;

function readRuntimeEnv(key: string) {
  return process.env[key];
}

export function readClerkPublishableKey() {
  return readRuntimeEnv(ENV_KEYS.clerkPublishableKey);
}

export function readClerkSecretKey() {
  return readRuntimeEnv(ENV_KEYS.clerkSecretKey);
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
  return readWallPrintProAiConceptsEnabled() && Boolean(readRuntimeEnv(ENV_KEYS.openaiApiKey));
}
