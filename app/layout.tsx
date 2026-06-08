import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/components/app-providers";

import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { readClerkPublishableKey, readConvexRuntimeUrl } from "@/lib/runtime-env";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Wall Print Pro",
  description: "Admin workspace for wall preview links.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png"
  }
};

export const dynamic = "force-dynamic";

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
