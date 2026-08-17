import Link from "next/link";

import { LOCAL_BUSINESS_NAP } from "@/lib/local-business";
import { HOME_FOOTER_TAGLINE } from "@/lib/product-copy";
import { FACEBOOK_PROFILE_URL, INSTAGRAM_PROFILE_URL } from "@/lib/social-proof";

function FacebookIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0 fill-current" viewBox="0 0 24 24">
      <path d="M13.6 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.6 1.6-1.6H17V3.5c-.3 0-1.5-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6v1.9H7v3.1h2.8v8h3.8Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0 fill-none stroke-current"
      viewBox="0 0 24 24"
    >
      <rect height="18" rx="5" strokeWidth="2" width="18" x="3" y="3" />
      <circle cx="12" cy="12" r="4" strokeWidth="2" />
      <circle className="fill-current stroke-none" cx="17.5" cy="6.5" r="1" />
    </svg>
  );
}

export function SiteFooter() {
  // Keep the visible business details aligned with the LocalBusiness JSON-LD.
  const telHref = `tel:${LOCAL_BUSINESS_NAP.telephone.replace(/[^\d+]/g, "")}`;

  return (
    <footer className="border-t bg-background px-4 py-12 md:px-6" data-testid="site-footer">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        <div className="grid gap-2">
          <p className="text-lg font-semibold text-foreground">{LOCAL_BUSINESS_NAP.name}</p>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">{HOME_FOOTER_TAGLINE}</p>
          <nav aria-label="Legal" className="flex gap-4 text-sm">
            <Link className="text-primary underline-offset-4 hover:underline" href="/privacy">Privacy</Link>
            <Link className="text-primary underline-offset-4 hover:underline" href="/terms">Terms</Link>
          </nav>
          <nav aria-label="Social media" className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-testid="site-footer-facebook"
              href={FACEBOOK_PROFILE_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              <FacebookIcon />
              Facebook
            </a>
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-testid="site-footer-instagram"
              href={INSTAGRAM_PROFILE_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              <InstagramIcon />
              Instagram
            </a>
          </nav>
        </div>
        <address className="grid gap-1 text-sm not-italic text-muted-foreground md:justify-self-end md:text-right">
          <span>{LOCAL_BUSINESS_NAP.county}</span>
          <span>{LOCAL_BUSINESS_NAP.streetAddress}</span>
          <span>
            {LOCAL_BUSINESS_NAP.addressLocality}, {LOCAL_BUSINESS_NAP.addressRegion} {LOCAL_BUSINESS_NAP.postalCode}
          </span>
          <a className="inline-flex min-h-11 items-center font-medium text-primary hover:underline md:justify-end" href={telHref}>
            {LOCAL_BUSINESS_NAP.telephone}
          </a>
          <a
            className="inline-flex min-h-11 items-center font-medium text-primary hover:underline md:justify-end"
            href={`mailto:${LOCAL_BUSINESS_NAP.email}`}
          >
            {LOCAL_BUSINESS_NAP.email}
          </a>
        </address>
      </div>
    </footer>
  );
}
