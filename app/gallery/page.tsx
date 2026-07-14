import type { Metadata } from "next";

import { ArtworkGallerySurface } from "@/components/ar/artwork-gallery-surface";
import { resolveGalleryInitialDesignId, type GallerySearchParamsInput } from "@/lib/gallery-page-defaults";

export const metadata: Metadata = {
  title: "Gallery | Wall Print Pro",
  description: "Choose Wall Print Pro artwork and see it on your wall."
};

type GalleryPageProps = {
  searchParams?: Promise<GallerySearchParamsInput>;
};

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <ArtworkGallerySurface
      initialSampleId={resolveGalleryInitialDesignId(resolvedSearchParams)}
    />
  );
}
