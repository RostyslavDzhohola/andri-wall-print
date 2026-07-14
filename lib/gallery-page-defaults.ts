import { AR_SAMPLE_IDS } from "./ar-sample";

export type GallerySearchParamsInput = {
  designId?: string | string[];
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveGalleryInitialDesignId(searchParams: GallerySearchParamsInput | undefined) {
  const designId = firstSearchParam(searchParams?.designId)?.trim();

  if (!designId || !AR_SAMPLE_IDS.includes(designId)) {
    return undefined;
  }

  return designId;
}
