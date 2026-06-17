import Link from "next/link";

import { ArPreviewSurface } from "@/components/ar/ar-preview-surface";
import { WorkVideosSection } from "@/components/promotion/work-videos-section";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <ArPreviewSurface
      brandName="Wall Print Pro"
      heading="See how a print looks on your wall before you buy."
      intro="Choose artwork, open the wall preview on iPhone Safari or Android Chrome, and place it at true size in the home, office, or business where it will hang."
      headerAction={
        <>
          <Button asChild className="min-h-11 rounded-full px-4" size="lg" variant="ghost">
            <Link href="/gallery">Gallery</Link>
          </Button>
          <Button asChild className="min-h-11 rounded-full px-4" size="lg">
            <Link href="/request?intent=reserve">Reserve</Link>
          </Button>
          <Button asChild className="min-h-11 rounded-full px-4" size="lg" variant="outline">
            <Link href="/dashboard">Sign in</Link>
          </Button>
        </>
      }
      afterContent={<WorkVideosSection />}
    />
  );
}
