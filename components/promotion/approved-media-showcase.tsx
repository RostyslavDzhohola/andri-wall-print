import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  APPROVED_HOMEPAGE_MEDIA,
  APPROVED_OUR_WORK_MEDIA,
  type ApprovedMedia,
} from "@/lib/approved-media";
import { cn } from "@/lib/utils";

function MediaVisual({
  item,
  priority = false,
}: {
  item: ApprovedMedia;
  priority?: boolean;
}) {
  if (item.kind === "video") {
    return (
      // biome-ignore lint/a11y/useMediaCaption: workshop b-roll with no dialogue; aria-label describes the content
      <video
        aria-label={item.alt}
        className="h-full w-full object-cover"
        controls
        playsInline
        poster={item.sources.poster.path}
        preload="metadata"
      >
        <source src={item.sources.mp4.path} type="video/mp4" />
        Your browser does not support embedded video.
      </video>
    );
  }

  return (
    <picture>
      <source
        srcSet={`${item.sources.avif960.path} 960w, ${item.sources.avif1600.path} 1600w`}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        type="image/avif"
      />
      <img
        alt={item.alt}
        className="h-full w-full object-cover"
        decoding="async"
        height={1600}
        loading={priority ? "eager" : "lazy"}
        src={item.sources.jpeg1600.path}
        width={1200}
      />
    </picture>
  );
}
function MediaCard({
  item,
  className,
  priority,
}: {
  item: ApprovedMedia;
  className?: string;
  priority?: boolean;
}) {
  const isWorkshop = item.label === "Workshop demonstration";

  return (
    <figure
      className={cn(
        "group overflow-hidden rounded-[0.875rem] border border-border bg-card shadow-[0_24px_70px_rgba(35,31,25,.10)]",
        className,
      )}
    >
      <div className="aspect-[4/5] overflow-hidden bg-muted">
        <MediaVisual item={item} priority={priority} />
      </div>
      <figcaption className="grid gap-2 p-4">
        <span
          className={cn(
            "w-fit rounded-full border px-2.5 py-1 text-xs font-semibold",
            isWorkshop
              ? "border-amber-800/20 bg-amber-50 text-amber-900"
              : "border-primary/20 bg-primary/5 text-primary",
          )}
        >
          {item.label}
        </span>
        <span className="text-base font-semibold text-foreground">
          {item.title}
        </span>
      </figcaption>
    </figure>
  );
}

export function ApprovedHomepageMediaSection() {
  return (
    <section
      aria-labelledby="approved-homepage-media-heading"
      className="border-t bg-background px-5 py-20 md:px-8 md:py-28"
      data-testid="approved-homepage-media"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              Real Wall Print Pro work
            </p>
            <h2
              className="mt-3 text-3xl font-semibold leading-tight text-foreground md:text-5xl"
              id="approved-homepage-media-heading"
            >
              From blank wall to finished statement
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              See finished Chicago-inspired wall prints, plus three clearly
              labeled moments from a vertical printing workshop demonstration.
            </p>
          </div>
          <Button asChild className="min-h-11 rounded-full px-6" size="lg">
            <Link href="/work">
              Explore our work
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {APPROVED_HOMEPAGE_MEDIA.map((item, index) => (
            <MediaCard
              item={item}
              key={
                item.kind === "image"
                  ? item.sources.jpeg1600.path
                  : item.sources.mp4.path
              }
              priority={index === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function ApprovedWorkGallery() {
  return (
    <section
      aria-labelledby="approved-work-gallery-heading"
      className="px-5 pb-24 pt-8 sm:px-8 md:pb-32"
      data-testid="approved-work-gallery"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <h2
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            id="approved-work-gallery-heading"
          >
            Finished prints and process demonstrations
          </h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Completed wall prints are identified separately from workshop
            demonstrations, so you can distinguish client-ready results from
            controlled printing examples.
          </p>
        </div>

        <div className="mt-10 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {APPROVED_OUR_WORK_MEDIA.map((item, index) => (
            <MediaCard item={item} key={item.original} priority={index === 0} />
          ))}
        </div>

        <div className="mt-14 rounded-[0.875rem] bg-primary px-6 py-8 text-primary-foreground sm:flex sm:items-center sm:justify-between sm:gap-8 md:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
              Your wall is next
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Share your wall and idea for a free project estimate.
            </h2>
          </div>
          <Button
            asChild
            className="mt-6 min-h-11 shrink-0 rounded-full bg-background px-6 text-foreground hover:bg-background/90 sm:mt-0"
            size="lg"
          >
            <Link href="/request">
              Request an estimate
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
