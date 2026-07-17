"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { InstagramProjectCarousel } from "@/components/promotion/instagram-project-carousel";
import { Button } from "@/components/ui/button";
import type { InstagramProjectMedia } from "@/lib/instagram-project-media";
import { HOME_TESTIMONIAL } from "@/lib/product-copy";
import {
  FACEBOOK_PROFILE_URL,
  getFacebookEmbedUrl,
  getInstagramEmbedPermalink,
  SOCIAL_PROOF_ITEMS,
  type SocialProofItem
} from "@/lib/social-proof";

declare global {
  interface Window {
    instgrm?: { Embeds?: { process: () => void } };
  }
}

type SocialProofSectionProps = {
  variant?: "homepage" | "library";
  beforeProjects?: ReactNode;
};

type InstagramEmbedStatus = "loading" | "rendered" | "failed";

const INSTAGRAM_EMBED_ATTEMPT_MS = 4_000;
let instagramProcessTimer: number | undefined;

function scheduleInstagramProcessing(delay = 0) {
  if (typeof window === "undefined") {
    return;
  }

  if (instagramProcessTimer) {
    window.clearTimeout(instagramProcessTimer);
  }

  instagramProcessTimer = window.setTimeout(() => {
    instagramProcessTimer = undefined;
    window.instgrm?.Embeds?.process();
  }, delay);
}

const PROOF_CATEGORY_LABELS: Record<SocialProofItem["placement"], string> = {
  "customer-result": "Customer result",
  "business-branding": "Business branding",
  "speed-cleanliness": "Speed and cleanliness",
  "customer-story": "Customer story",
  "commercial-project": "Commercial installation",
  "service-explanation": "Service capabilities"
};

function InstagramProofEmbed({ item, index }: { item: SocialProofItem; index: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<InstagramEmbedStatus>("loading");
  const embedPermalink = getInstagramEmbedPermalink(item);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || status === "rendered" || status === "failed") {
      return;
    }

    const markRendered = () => {
      if (!container.querySelector("iframe")) {
        return false;
      }

      setStatus("rendered");
      return true;
    };

    if (markRendered()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (markRendered()) {
        observer.disconnect();
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    const timeout = window.setTimeout(() => {
      if (markRendered()) {
        return;
      }

      if (attempt === 0) {
        setAttempt(1);
        return;
      }

      setStatus("failed");
    }, INSTAGRAM_EMBED_ATTEMPT_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [attempt, status]);

  useEffect(() => {
    if (attempt > 0) {
      scheduleInstagramProcessing();
    }
  }, [attempt]);

  return (
    <li className="grid content-start gap-5 border-t border-border pt-6" data-testid="social-proof-embed" data-social-proof-id={item.id}>
      <div className="grid gap-2">
        <span className="text-sm font-semibold tabular-nums text-primary" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {PROOF_CATEGORY_LABELS[item.placement]}
        </span>
        <h3 className="text-xl font-semibold leading-snug text-foreground">{item.title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{item.summary}</p>
      </div>
      <div
        className="instagram-proof-viewport overflow-hidden rounded-[0.625rem] border border-border bg-card p-1"
        data-embed-status={status}
        data-testid="instagram-proof-container"
        ref={containerRef}
      >
        {status === "failed" ? (
          <div className="grid min-h-28 content-center gap-2 p-5" data-testid="instagram-proof-fallback">
            <p className="text-sm font-medium text-foreground">Instagram preview unavailable</p>
            <a className="min-h-11 w-fit content-center font-semibold text-primary underline underline-offset-4" href={item.canonicalUrl} rel="noopener noreferrer" target="_blank">
              View {item.title} on Instagram
            </a>
          </div>
        ) : (
          <>
            {status === "loading" ? (
              <div className="grid min-h-28 content-center gap-2 p-5" data-testid="instagram-proof-loading" role="status">
                <p className="text-sm font-medium text-foreground">Loading Instagram preview…</p>
                <a className="min-h-11 w-fit content-center text-sm font-semibold text-primary underline underline-offset-4" href={item.canonicalUrl} rel="noopener noreferrer" target="_blank">
                  Open the original post
                </a>
              </div>
            ) : null}
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={embedPermalink ?? item.canonicalUrl}
              data-instgrm-version="14"
              data-testid="instagram-proof-embed"
              key={attempt}
              style={{ background: "#fff", border: 0, margin: 0, maxWidth: "540px", minWidth: "326px", padding: 0, width: "100%" }}
            >
              <a href={item.canonicalUrl} rel="noopener noreferrer" target="_blank">
                View {item.title} on Instagram
              </a>
            </blockquote>
          </>
        )}
      </div>
    </li>
  );
}

type InstagramProjectResponse =
  | { ok: true; projects: InstagramProjectMedia[] }
  | { ok: false; reason: string };

function InstagramProjectCollection({ items }: { items: readonly SocialProofItem[] }) {
  const [projects, setProjects] = useState<InstagramProjectMedia[] | null>(null);
  const [useOfficialEmbeds, setUseOfficialEmbeds] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort("Instagram project media timed out"), 3_500);

    void fetch("/api/instagram-projects", {
      headers: { Accept: "application/json" },
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Instagram project media is unavailable");
        }

        return (await response.json()) as InstagramProjectResponse;
      })
      .then((response) => {
        if (response.ok && response.projects.length > 0) {
          setProjects(response.projects);
          return;
        }

        setUseOfficialEmbeds(true);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted || controller.signal.reason === "Instagram project media timed out") {
          setUseOfficialEmbeds(true);
        }
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  if (projects) {
    return (
      <>
        <InstagramProjectCarousel projects={projects} />
        <p className="mt-10 max-w-3xl text-xs leading-5 text-muted-foreground" data-testid="social-proof-disclosure">
          Project media is delivered through Wall Print Pro&apos;s authorized Instagram API connection. Canonical source URLs remain in the project catalog.
        </p>
      </>
    );
  }

  if (!useOfficialEmbeds) {
    return (
      <div className="mt-12 grid min-h-28 content-center gap-2 rounded-[0.625rem] border border-border bg-card p-5" data-testid="instagram-project-loading" role="status">
        <p className="text-sm font-medium text-foreground">Loading project media…</p>
      </div>
    );
  }

  return (
    <>
      <Script
        id="instagram-embed-script"
        onReady={() => scheduleInstagramProcessing(250)}
        src="https://www.instagram.com/embed.js"
        strategy="afterInteractive"
      />
      <ol className="mt-12 grid gap-x-10 gap-y-16 lg:grid-cols-2" data-testid="instagram-proof-list">
        {items.map((item, index) => (
          <InstagramProofEmbed index={index} item={item} key={item.id} />
        ))}
      </ol>
      <p className="mt-10 max-w-3xl text-xs leading-5 text-muted-foreground" data-testid="social-proof-disclosure">
        These examples are shown with Meta&apos;s official embeds. Instagram may require sign-in for some playback controls.
      </p>
    </>
  );
}

export function SocialProofSection({ beforeProjects, variant = "homepage" }: SocialProofSectionProps) {
  const [featured, ...instagramItems] = SOCIAL_PROOF_ITEMS;
  const embedUrl = getFacebookEmbedUrl(featured);
  const isHomepage = variant === "homepage";

  return (
    <section
      aria-labelledby={`${variant}-social-proof-heading`}
      className="border-t bg-background px-5 py-20 md:px-8 md:py-28"
      data-testid={`social-proof-${variant}`}
    >
      <div className="mx-auto grid max-w-6xl gap-24 md:gap-32">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:gap-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Real customer result</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground md:text-5xl" id={`${variant}-social-proof-heading`}>
              See a real wall transformation
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{featured.summary}</p>

            {isHomepage && !HOME_TESTIMONIAL.needsClientQuote ? (
              <blockquote className="mt-8 max-w-xl border-l-2 border-primary pl-5" data-testid="home-testimonial">
                <p className="text-xl font-medium leading-8 text-foreground">&ldquo;{HOME_TESTIMONIAL.quote}&rdquo;</p>
                <footer className="mt-3 text-sm font-medium text-muted-foreground">{HOME_TESTIMONIAL.attribution}</footer>
              </blockquote>
            ) : null}
          </div>

          <div className="mx-auto w-full max-w-[21rem] overflow-hidden rounded-[0.625rem] border bg-black shadow-[0_24px_70px_rgba(35,31,25,.12)]">
            {embedUrl ? (
              <iframe
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                className="aspect-[9/16] w-full border-0"
                data-testid="facebook-proof-embed"
                loading="lazy"
                src={embedUrl}
                title="Wall Print Pro customer wall transformation on Facebook"
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 lg:col-start-2" data-testid="social-proof-actions">
            {isHomepage ? (
              <Button asChild className="min-h-11 rounded-full px-6" size="lg">
                <Link data-testid="social-proof-quote-cta" href="/request">
                  Get estimate
                </Link>
              </Button>
            ) : null}
            <Button asChild className="min-h-11 rounded-full px-5" size="lg" variant="outline">
              <a href={FACEBOOK_PROFILE_URL} rel="noopener noreferrer" target="_blank">
                Follow us on Facebook
              </a>
            </Button>
          </div>
        </div>

        {beforeProjects}

        <div>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Public projects</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground md:text-4xl">See our projects</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Explore the original project posts here without leaving the website.
            </p>
          </div>

          <InstagramProjectCollection items={instagramItems} />
        </div>
      </div>
    </section>
  );
}
