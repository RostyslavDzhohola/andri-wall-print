import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/components/app-providers";

import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { readClerkPublishableKey, readConvexRuntimeUrl } from "@/lib/runtime-env";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const SITE_NAME = "Wall Print Pro";
const ROOT_TITLE = "Wall Print Pro — Custom wall printing in Chicago";
const ROOT_DESCRIPTION =
  "Custom wall printing in Chicago. Choose a design, upload your art or logo, or describe an idea — then see it on your actual wall in AR before you commit. Wall murals from $600.";
// Strong real work photo (the Chicago "Pathways to Success" skyline print) as the
// default social share image.
const OG_IMAGE = absoluteUrl("/artworks/chicago-final-1.png");

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: ROOT_TITLE,
    template: "%s | Wall Print Pro"
  },
  description: ROOT_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: ROOT_TITLE,
    description: ROOT_DESCRIPTION,
    url: getSiteUrl(),
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Chicago skyline wall print by Wall Print Pro" }]
  },
  twitter: {
    card: "summary_large_image",
    title: ROOT_TITLE,
    description: ROOT_DESCRIPTION,
    images: [OG_IMAGE]
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f5f1"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body>
        <AppProviders
          clerkPublishableKey={readClerkPublishableKey()}
          convexUrl={readConvexRuntimeUrl()}
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
