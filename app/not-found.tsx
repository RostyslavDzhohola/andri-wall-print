import Link from "next/link";
import { ArrowRight, House } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="bg-background px-5 py-20 text-foreground sm:px-8 sm:py-28">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">404 · Page not found</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          That wall isn&apos;t here.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          The page may have moved, or the link may no longer be available. You can return home or browse our wall-print gallery.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild className="min-h-11 rounded-full px-5" size="lg">
            <Link href="/">
              <House className="size-4" aria-hidden="true" />
              Back home
            </Link>
          </Button>
          <Button asChild className="min-h-11 rounded-full px-5" size="lg" variant="outline">
            <Link href="/gallery">
              Open gallery
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
