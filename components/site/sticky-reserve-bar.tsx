"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HOME_NAV_RESERVE_CTA } from "@/lib/product-copy";

type StickyReserveBarProps = {
  reserveHref: string;
};

// Routes that own a competing CTA (the request form's submit button), where the
// customer has already paid (/reserved), or private client-invite surfaces
// (/preview/*) must not show the sticky reserve bar.
const HIDDEN_PATHS = new Set(["/request", "/reserved"]);

export function StickyReserveBar({ reserveHref }: StickyReserveBarProps) {
  const pathname = usePathname() ?? "/";

  if (HIDDEN_PATHS.has(pathname) || pathname.startsWith("/preview")) {
    return null;
  }

  return (
    <div className="sticky bottom-0 z-40 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_30px_rgba(35,31,25,.10)] backdrop-blur md:hidden">
      <Button asChild className="min-h-11 w-full rounded-full" size="lg">
        <Link data-testid="home-sticky-reserve" href={reserveHref}>
          {HOME_NAV_RESERVE_CTA}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
