const ENV_KEYS = {
  clerkPublishableKey: "NEXT_PUBLIC" + "_CLERK_PUBLISHABLE_KEY",
  clerkSecretKey: "CLERK" + "_SECRET_KEY",
  convexUrl: "CONVEX" + "_URL",
  publicConvexUrl: "NEXT_PUBLIC" + "_CONVEX_URL",
  phase0PreviewLocalFallback: "PHASE0" + "_PREVIEW_LOCAL_FALLBACK"
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
