import {
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
  handleImageOptimization,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

import { AR_ASSET_FILE_NAMES } from "../lib/ar-sample";

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: {
          format: string;
          quality: number;
        }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const AR_ASSET_ROUTE = "/api/ar/";
const SAFE_AR_ASSET_NAME = /^[a-z0-9-]+\.(?:glb|usdz)$/;
const HTML_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://ajax.googleapis.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://www.thewallprintpro.com https://*.convex.cloud https://*.convex.site",
  "media-src 'self' blob:",
  "connect-src 'self' https://ajax.googleapis.com https://*.convex.cloud https://*.convex.site wss://*.convex.cloud",
  "worker-src 'self' blob:"
].join("; ");

function withArContentType(pathname: string, response: Response) {
  const contentType = pathname.endsWith(".glb")
    ? "model/gltf-binary"
    : pathname.endsWith(".usdz")
      ? "model/vnd.usdz+zip"
      : null;

  if (!contentType || !response.ok) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("content-type", contentType);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function withSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  headers.set("Cross-Origin-Resource-Policy", "same-site");

  if (response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
    headers.set("Content-Security-Policy", HTML_CONTENT_SECURITY_POLICY);
    headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    headers.set("X-Frame-Options", "DENY");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function finalizeResponse(pathname: string, response: Response) {
  return withSecurityHeaders(withArContentType(pathname, response));
}

const worker = {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith(AR_ASSET_ROUTE)) {
      const fileName = url.pathname.slice(AR_ASSET_ROUTE.length);

      if (
        !SAFE_AR_ASSET_NAME.test(fileName) ||
        !AR_ASSET_FILE_NAMES.has(fileName)
      ) {
        return finalizeResponse(fileName, new Response("Not found", { status: 404 }));
      }

      const assetUrl = new URL(`/ar/${fileName}`, request.url);
      const assetRequest = new Request(assetUrl, request);
      const assetResponse = env?.ASSETS
        ? await env.ASSETS.fetch(assetRequest)
        : await fetch(assetRequest);
      return finalizeResponse(fileName, assetResponse);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];

      const response = await handleImageOptimization(
        request,
        {
          fetchAsset: (path) =>
            env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality });
            return result.response();
          },
        },
        allowedWidths,
      );

      return finalizeResponse(url.pathname, response);
    }

    const response = await handler.fetch(request, env, ctx);
    return finalizeResponse(url.pathname, response);
  },
};

export default worker;
