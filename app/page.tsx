import Link from "next/link";
import { GalleryHorizontal, LogIn, MessageCircle } from "lucide-react";

import { ArPreviewSurface } from "@/components/ar/ar-preview-surface";
import { HomepageDemoActions } from "@/components/promotion/homepage-demo-actions";
import { WorkVideosSection } from "@/components/promotion/work-videos-section";
import { Button } from "@/components/ui/button";

const processSteps = [
  {
    title: "Bring the art",
    body: "Choose a starting design, upload a logo or artwork file, or describe a custom wall-print concept."
  },
  {
    title: "Send the request",
    body: "Wall Print Pro receives the contact details, wall context, print size, and concept direction in one lead request."
  },
  {
    title: "Review the draft",
    body: "AI concept drafts stay behind the request flow so the seller can review the visual before the next client conversation."
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
      heading="Choose artwork, upload yours, or describe the wall you want."
      headingClassName="max-w-3xl sm:max-w-3xl md:max-w-4xl lg:max-w-[14ch]"
      intro="Start with real Wall Print Pro proof, then send the idea through a contact-gated request so the draft stays tied to a real follow-up."
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
      sideContent={<HomepageDemoActions />}
      afterContent={<SalesPilotSections />}
    />
  );
}
