import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { absoluteUrl } from "@/lib/site-url";
import { loadWorkJobs } from "@/lib/work-content";

export const revalidate = 3600;

const PAGE_TITLE = "Wall Printing Chicago — Recent Work | Wall Print Pro";
const PAGE_DESCRIPTION =
  "See custom wall murals Chicago homes and businesses have installed with Wall Print Pro — real large-format wall printing across Chicago neighborhoods.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/work") },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl("/work"),
    type: "website",
    images: [{ url: absoluteUrl("/artworks/chicago-final-1.png") }]
  }
};

export default function WorkIndexPage() {
  const jobs = loadWorkJobs();

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Wall printing Chicago</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Custom wall murals Chicago walls are already wearing
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          A look at recent large-format wall prints and murals we have installed across Chicago
          neighborhoods — from Loop lobbies to West Loop cafes.
        </p>
      </header>

      <ul className="mt-12 grid gap-8 sm:grid-cols-2">
        {jobs.map((job) => {
          const cover = job.photos[0];

          return (
            <li key={job.slug}>
              <Link
                href={`/work/${job.slug}`}
                className="group flex min-h-11 flex-col overflow-hidden rounded-[0.625rem] border border-border bg-card shadow-[0_24px_70px_rgba(35,31,25,.12)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:-translate-y-0.5"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  <Image
                    src={cover.src}
                    alt={cover.alt}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-5">
                  <h2 className="text-lg font-semibold text-foreground">{job.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {job.neighborhood} · {job.size}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
