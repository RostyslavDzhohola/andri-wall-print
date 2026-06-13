import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";

import { ArtworkGallerySurface } from "@/components/ar/artwork-gallery-surface";
import { getAccountDashboardPath, getClerkUserEmail } from "@/lib/account-routing";
import { readClerkPublishableKey, readClerkSecretKey } from "@/lib/runtime-env";

export const metadata: Metadata = {
  title: "Gallery | Wall Print Pro",
  description: "Choose Wall Print Pro artwork and see it on your wall."
};

function galleryAuthRuntimeAvailable() {
  return Boolean(readClerkPublishableKey() && readClerkSecretKey());
}

export default async function GalleryPage() {
  if (!galleryAuthRuntimeAvailable()) {
    return <ArtworkGallerySurface dashboardHref="/dashboard" dashboardLabel="Sign in" dashboardKind="signIn" />;
  }

  const { userId } = await auth();

  if (!userId) {
    return <ArtworkGallerySurface dashboardHref="/dashboard" dashboardLabel="Sign in" dashboardKind="signIn" />;
  }

  const user = await currentUser();
  const email = getClerkUserEmail(user);
  const dashboardHref = getAccountDashboardPath({ subject: userId, email });

  return (
    <ArtworkGallerySurface
      dashboardHref={dashboardHref}
      dashboardLabel={dashboardHref === "/admin" ? "Admin dashboard" : "Saved previews"}
      dashboardKind={dashboardHref === "/admin" ? "admin" : "account"}
      showUserButton
    />
  );
}
