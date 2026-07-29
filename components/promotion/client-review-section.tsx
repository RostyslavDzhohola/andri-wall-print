import { HOME_TESTIMONIAL } from "@/lib/product-copy";

export function ClientReviewSection() {
  return (
    <section
      aria-labelledby="home-client-review-heading"
      className="border-t border-border bg-background px-5 py-16 md:px-8 md:py-24"
      data-testid="home-client-review"
    >
      <div className="mx-auto max-w-4xl text-center">
        <h2
          className="text-sm font-semibold uppercase tracking-[0.16em] text-primary"
          id="home-client-review-heading"
        >
          Client review
        </h2>
        <blockquote className="mt-6" data-testid="home-testimonial">
          <p className="text-balance text-2xl font-medium leading-snug tracking-[-0.02em] text-foreground sm:text-3xl md:text-4xl md:leading-tight">
            &ldquo;{HOME_TESTIMONIAL.quote}&rdquo;
          </p>
          <footer className="mt-6 text-sm font-semibold text-muted-foreground">
            {HOME_TESTIMONIAL.attribution}
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
