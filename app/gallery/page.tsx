import type { Metadata } from "next";

import { ArtworkGallerySurface } from "@/components/ar/artwork-gallery-surface";
import { getPublicGalleryPage } from "@/lib/convex-public-gallery";
import { resolveGalleryInitialDesignId, type GallerySearchParamsInput } from "@/lib/gallery-page-defaults";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Choose Wall Print Pro artwork and see it on your wall.",
  alternates: { canonical: "/gallery" }
};

type GalleryPageProps = {
  searchParams?: Promise<GallerySearchParamsInput>;
};

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const communityPage = await getPublicGalleryPage();

  return (
    <ArtworkGallerySurface
      initialCommunityPage={communityPage}
      initialSampleId={resolveGalleryInitialDesignId(resolvedSearchParams)}
    />
  );
}
