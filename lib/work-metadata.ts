import type { Metadata } from "next";

import { absoluteUrl } from "./site-url";
import type { WorkJob } from "./work-content";

export function buildWorkJobMetadata(job: WorkJob): Metadata {
  const title = `${job.title} — Wall Printing Chicago | Wall Print Pro`;
  const description = `${job.story.split(". ")[0]}. Custom wall printing in ${job.neighborhood}, Chicago (${job.size}).`;
  const canonical = absoluteUrl(`/work/${job.slug}`);
  const ogImage = absoluteUrl(job.photos[0].src);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      images: [{ url: ogImage, alt: job.photos[0].alt }]
    }
  };
}
