import type { Metadata } from "next";

import { ArtworkGallerySurface } from "@/components/ar/artwork-gallery-surface";

export const metadata: Metadata = {
  title: "Gallery | Wall Print Pro",
  description: "Choose Wall Print Pro artwork and see it on your wall."
};

export default function GalleryPage() {
  return <ArtworkGallerySurface dashboardHref="/dashboard" dashboardLabel="Sign in" dashboardKind="signIn" />;
}
