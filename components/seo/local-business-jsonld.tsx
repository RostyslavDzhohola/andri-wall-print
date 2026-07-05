import { buildLocalBusinessJsonLd } from "@/lib/local-business";

/**
 * Renders the LocalBusiness structured data for the homepage.
 *
 * Exported for the homepage-redesign task to mount from `app/page.tsx` (or the
 * root layout) without rework. Emits a single <script type="application/ld+json">.
 */
export function LocalBusinessJsonLd() {
  const jsonLd = buildLocalBusinessJsonLd();

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe structured data, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
