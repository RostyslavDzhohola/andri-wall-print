import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buildWorkJobMetadata } from "@/lib/work-metadata";
import { getWorkJob, getWorkSlugs } from "@/lib/work-content";

export const revalidate = 3600;
// Keep dynamicParams enabled so unknown slugs reach our redirect() to /work
// (design-spec interaction) instead of Next's default 404.
export const dynamicParams = true;

type WorkJobPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getWorkSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: WorkJobPageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = getWorkJob(slug);

  if (!job) {
    return {};
  }

  return buildWorkJobMetadata(job);
}

export default async function WorkJobPage({ params }: WorkJobPageProps) {
  const { slug } = await params;
  const job = getWorkJob(slug);

  // Design-spec interaction: unknown slug redirects to the index, not a 404 page.
  if (!job) {
    redirect("/work");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8">
      <Link
        href="/work"
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        ← All wall printing Chicago work
      </Link>

      <header className="mt-6 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {job.title}
        </h1>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <div className="flex gap-1.5">
            <dt className="font-medium text-foreground">Neighborhood</dt>
            <dd>
              {job.neighborhood}, {job.area}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium text-foreground">Size</dt>
            <dd>{job.size}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium text-foreground">Surface</dt>
            <dd>{job.surface}</dd>
          </div>
        </dl>
      </header>

      <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground">{job.story}</p>

      <div className="mt-10 grid gap-6">
        {job.photos.map((photo, index) => (
          <div
            key={photo.src}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-[0.625rem] border border-border bg-muted shadow-[0_24px_70px_rgba(35,31,25,.12)]"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 896px) 800px, 100vw"
              priority={index === 0}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="mt-12">
        <Link
          href="/gallery"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Preview custom wall printing on your wall
        </Link>
      </div>
    </main>
  );
}
