export type ClientPreviewUrlSource = "configured" | "ngrok" | "current" | "relative";

export type ClientPreviewUrlResult = {
  url: string;
  source: ClientPreviewUrlSource;
  warning: string | null;
};

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

let devPublicOriginPromise: Promise<string | null> | null = null;

function configuredClientPreviewOrigin() {
  return normalizeOrigin(
    process.env.NEXT_PUBLIC_CLIENT_PREVIEW_BASE_URL ??
      process.env.NEXT_PUBLIC_PUBLIC_PREVIEW_BASE_URL ??
      process.env.NEXT_PUBLIC_SITE_URL
  );
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isLocalBrowserOrigin() {
  return typeof window !== "undefined" && LOCAL_HOSTNAMES.has(window.location.hostname);
}

function absoluteFromOrigin(path: string, origin: string) {
  return new URL(path, origin).toString();
}

async function getDevPublicOrigin() {
  if (!devPublicOriginPromise) {
    devPublicOriginPromise = fetch("/api/dev-public-origin", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as { origin?: unknown };
        return typeof payload.origin === "string" ? normalizeOrigin(payload.origin) : null;
      })
      .catch(() => null);
  }

  return await devPublicOriginPromise;
}

export function getInitialClientPreviewUrl(path: string) {
  const configured = configuredClientPreviewOrigin();

  if (configured) {
    return absoluteFromOrigin(path, configured);
  }

  if (typeof window === "undefined" || isLocalBrowserOrigin()) {
    return "";
  }

  return absoluteFromOrigin(path, window.location.origin);
}

export async function resolveClientPreviewUrl(path: string): Promise<ClientPreviewUrlResult> {
  const configured = configuredClientPreviewOrigin();

  if (configured) {
    return {
      url: absoluteFromOrigin(path, configured),
      source: "configured",
      warning: null
    };
  }

  if (isLocalBrowserOrigin()) {
    const devPublicOrigin = await getDevPublicOrigin();

    if (devPublicOrigin) {
      return {
        url: absoluteFromOrigin(path, devPublicOrigin),
        source: "ngrok",
        warning: null
      };
    }

    return {
      url: absoluteFromOrigin(path, window.location.origin),
      source: "current",
      warning: "No ngrok tunnel was detected, so this copied link only works on this Mac."
    };
  }

  if (typeof window !== "undefined") {
    return {
      url: absoluteFromOrigin(path, window.location.origin),
      source: "current",
      warning: null
    };
  }

  return {
    url: path,
    source: "relative",
    warning: null
  };
}
