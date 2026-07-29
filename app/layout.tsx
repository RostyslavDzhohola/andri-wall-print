import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/components/app-providers";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { StickyReserveBar } from "@/components/site/sticky-reserve-bar";

import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { readConvexRuntimeUrl } from "@/lib/runtime-env";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const SITE_NAME = "Wall Print Pro";
const ROOT_TITLE = "Wall Print Pro — Custom wall printing in Chicago";
const ROOT_DESCRIPTION =
  "Custom wall printing in Chicago. Choose a design, upload your art or logo, or describe an idea — then see it on your actual wall in AR before you commit. Wall prints from $500.";
const OG_IMAGE = absoluteUrl("/media/wall-print-pro/homepage/og-1200x630.jpg");

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: ROOT_TITLE,
    template: "%s | Wall Print Pro"
  },
  description: ROOT_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: ROOT_TITLE,
    description: ROOT_DESCRIPTION,
    url: getSiteUrl(),
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Chicago train illustration printed directly on a wall by Wall Print Pro" }]
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
  themeColor: "#fafafa"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const estimateHref = "/request";

  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body>
        <AppProviders convexUrl={readConvexRuntimeUrl()}>
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <div
              className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
              data-testid="site-header-shell"
            >
              <div className="mx-auto w-full max-w-6xl px-4 py-3 md:px-6">
                <SiteHeader estimateHref={estimateHref} />
              </div>
            </div>
            <div className="flex-1">{children}</div>
            <SiteFooter />
            <StickyReserveBar estimateHref={estimateHref} />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
