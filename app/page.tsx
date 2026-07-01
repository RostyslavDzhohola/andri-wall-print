import Link from "next/link";
import { ArrowRight, GalleryHorizontal, LogIn, MessageCircle } from "lucide-react";

import { ArPreviewSurface } from "@/components/ar/ar-preview-surface";
import { WorkVideosSection } from "@/components/promotion/work-videos-section";
import { Button } from "@/components/ui/button";

const processSteps = [
  {
    title: "Bring the art",
    body: "Use your artwork, work with one of our artists, or describe what you want and create a polished concept here for free."
  },
  {
    title: "Demo it on your wall",
    body: "Open it on your phone and place the artwork at wall scale so the look and placement are easy to judge."
  },
  {
    title: "Book an estimate",
    body: "When the direction feels right, Wall Print Pro reviews the artwork, checks production details, and prices the project."
  }
] as const;

function SalesPilotSections() {
  return (
    <>
      <WorkVideosSection />

      <section className="border-t bg-muted/35 px-4 py-12 md:px-6 md:py-16" data-testid="sales-pilot-process">
        <div className="mx-auto grid max-w-4xl gap-6">
          <div className="grid gap-4">
            <div className="grid gap-3">
              <p className="font-semibold uppercase text-primary">Process</p>
              <h2 className="text-3xl font-semibold leading-tight md:text-5xl">Turn the artwork into a wall demo before the estimate.</h2>
            </div>

            <div className="grid gap-3">
              {processSteps.map((step, index) => (
                <article className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 rounded-lg border bg-background p-4" key={step.title}>
                  <div className="grid size-10 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </div>
                  <div className="grid gap-1">
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{step.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Home() {
  return (
    <ArPreviewSurface
      brandName="Wall Print Pro"
      heading="See the final result before you put down your credit card."
      headingClassName="max-w-3xl sm:max-w-3xl md:max-w-4xl lg:max-w-[14ch]"
      intro="You do not have to imagine it. Put your art on your wall right now and see how the final result could feel before the estimate."
      headerAction={
        <>
          <Button asChild className="min-h-10 rounded-full px-3 sm:min-h-11 sm:px-4" size="lg" variant="ghost">
            <Link href="/gallery">
              <GalleryHorizontal className="size-4" />
              Gallery
            </Link>
          </Button>
          <Button asChild className="min-h-10 rounded-full px-3 sm:min-h-11 sm:px-4" size="lg">
            <Link href="/request">
              <MessageCircle className="size-4" />
              Request
            </Link>
          </Button>
          <Button asChild className="min-h-10 rounded-full px-3 sm:min-h-11 sm:px-4" size="lg" variant="outline">
            <Link href="/dashboard">
              <LogIn className="size-4" />
              <span className="sr-only sm:not-sr-only">Sign in</span>
            </Link>
          </Button>
        </>
      }
      sideContent={
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-3">
            <Button asChild className="min-h-11 rounded-full px-5" size="lg">
              <Link href="/request">
                <ArrowRight className="size-4" />
                Request a demo
              </Link>
            </Button>
          </div>
        </div>
      }
      afterContent={<SalesPilotSections />}
    />
  );
}
