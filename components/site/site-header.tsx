"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, GalleryHorizontal, House, MessageCircle } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { HOME_NAV_ESTIMATE_CTA } from "@/lib/product-copy";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  estimateHref: string;
};

const NAV_LINKS = [
  { href: "/", label: "Home", icon: House },
  { href: "/gallery", label: "Gallery", icon: GalleryHorizontal },
  { href: "/work", label: "Our work", icon: MessageCircle }
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ estimateHref }: SiteHeaderProps) {
  const pathname = usePathname() ?? "/";
  // On /reserved the customer just paid — keep the skeleton identical but swap
  // the CTA for a non-link confirmation chip so we never ask them to pay again.
  const isReserved = pathname === "/reserved";
  // /preview/* is a private client-invite surface outside the public estimate
  // funnel, so it keeps the shared brand + nav without a competing CTA.
  const hideReserveCta = pathname.startsWith("/preview");

  return (
    <header className="flex items-center justify-between gap-1 sm:gap-4" data-testid="site-header">
      <BrandMark
        ariaLabel="Wall Print Pro homepage"
        className="min-w-0 text-base sm:text-lg"
        iconSize="sm"
        textClassName="sr-only sm:not-sr-only sm:truncate"
      />
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);

          return (
            <Button
              asChild
              className="min-h-10 rounded-full px-2 sm:min-h-11 sm:px-4"
              key={href}
              size="lg"
              variant="ghost"
            >
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(active && "text-primary underline decoration-primary/60 decoration-2 underline-offset-8")}
                href={href}
              >
                <Icon className="size-4" />
                <span className="sr-only sm:not-sr-only">{label}</span>
              </Link>
            </Button>
          );
        })}

        {hideReserveCta ? null : isReserved ? (
          <span
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary/10 px-4 text-sm font-semibold text-primary sm:min-h-11 sm:px-5"
            data-testid="site-reserve-confirmation"
          >
            <Check className="size-4" aria-hidden="true" />
            Spot reserved
          </span>
        ) : (
          <Button asChild className="min-h-10 rounded-full px-3 min-[360px]:px-4 sm:min-h-11 sm:px-5" size="lg">
            <Link data-testid="home-nav-reserve" href={estimateHref}>
              <span className="min-[360px]:hidden">Estimate</span>
              <span className="hidden min-[360px]:inline">{HOME_NAV_ESTIMATE_CTA}</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
