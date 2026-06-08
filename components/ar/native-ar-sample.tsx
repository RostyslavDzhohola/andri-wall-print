import { ArPreviewSurface } from "@/components/ar/ar-preview-surface";
import { AR_SAMPLES } from "@/lib/ar-sample";

type NativeArSampleProps = {
  samples?: typeof AR_SAMPLES;
  heading?: string;
  intro?: string;
};

export function NativeArSample({
  samples = AR_SAMPLES,
  heading = "Place this print on your wall.",
  intro = "Choose a picture, open the wall preview, and move around there to see how the selected print looks on the wall."
}: NativeArSampleProps) {
  return <ArPreviewSurface brandName="Preview Picture" heading={heading} intro={intro} samples={samples} />;
}
