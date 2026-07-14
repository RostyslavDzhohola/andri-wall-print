import type { ArSample } from "./ar-sample";

export type ArAssetKind = "poster" | "glb" | "usdz";

export const AR_ASSET_CONTENT_TYPES: Record<ArAssetKind, string> = {
  poster: "image/png",
  glb: "model/gltf-binary",
  usdz: "model/vnd.usdz+zip"
};

export const AR_ASSET_SIZE_BUDGET_BYTES: Record<ArAssetKind, number> = {
  poster: 4_250_000,
  glb: 4_250_000,
  usdz: 4_250_000
};

export const AR_SAMPLE_TOTAL_SIZE_BUDGET_BYTES = 12_750_000;

export type AssetDeliveryCheck = {
  kind: ArAssetKind;
  url: string;
  status: number;
  redirected: boolean;
  contentType: string;
  contentLength: number | null;
  ok: boolean;
  problems: string[];
};

export type AssetDeliveryFetch = (
  input: string,
  init: { method: "HEAD"; redirect: "follow" }
) => Promise<Pick<Response, "headers" | "ok" | "redirected" | "status">>;

export function getFixedScaleQuickLookHref(usdzHref: string) {
  const [withoutHash, rawHash = ""] = usdzHref.split("#", 2);
  const params = new URLSearchParams(rawHash);

  params.set("allowsContentScaling", "0");

  return `${withoutHash}#${params.toString()}`;
}

export function getAssetKindFromHref(href: string): ArAssetKind {
  const pathname = href.split("#", 1)[0].split("?", 1)[0];

  if (pathname.endsWith(".glb")) {
    return "glb";
  }

  if (pathname.endsWith(".usdz")) {
    return "usdz";
  }

  return "poster";
}

export function getAssetContentType(href: string) {
  return AR_ASSET_CONTENT_TYPES[getAssetKindFromHref(href)];
}

function hasAssetUrl(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasReadyArAssetUrls(sample: ArSample) {
  return hasAssetUrl(sample.assets.poster) && hasAssetUrl(sample.assets.glb) && hasAssetUrl(sample.assets.usdz);
}

export async function checkAssetDelivery(
  kind: ArAssetKind,
  url: string,
  fetcher: AssetDeliveryFetch = fetch
): Promise<AssetDeliveryCheck> {
  const response = await fetcher(url, { method: "HEAD", redirect: "follow" });
  const expectedContentType = AR_ASSET_CONTENT_TYPES[kind];
  const contentType = response.headers.get("content-type") ?? "";
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader === null ? null : Number(contentLengthHeader);
  const problems: string[] = [];

  if (!response.ok) {
    problems.push(`Expected 2xx status, received ${response.status}.`);
  }

  if (!contentType.toLowerCase().includes(expectedContentType)) {
    problems.push(`Expected ${expectedContentType}, received ${contentType || "no content-type"}.`);
  }

  if (contentLength !== null && Number.isFinite(contentLength) && contentLength > AR_ASSET_SIZE_BUDGET_BYTES[kind]) {
    problems.push(`Expected ${kind} under ${AR_ASSET_SIZE_BUDGET_BYTES[kind]} bytes, received ${contentLength}.`);
  }

  return {
    kind,
    url,
    status: response.status,
    redirected: response.redirected,
    contentType,
    contentLength: Number.isFinite(contentLength) ? contentLength : null,
    ok: problems.length === 0,
    problems
  };
}
