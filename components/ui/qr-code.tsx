import { createQrSvg } from "@/lib/qr-code";
import { cn } from "@/lib/utils";

type QrCodeProps = {
  // The URL (or any string) to encode. Typically the current page/share URL.
  value: string;
  // Accessible label describing where the QR leads.
  title?: string;
  className?: string;
};

/**
 * Renders a real, scannable QR code as inline SVG for the composite_only and
 * desktop share states ("scan the QR to open on your phone").
 *
 * The SVG is generated from `lib/qr-code.ts` (pure, dependency-light) and
 * inlined so it needs no network request and scales crisply at any size. Colors
 * are pinned to the design tokens (deep-teal foreground on white) for contrast.
 */
export function QrCode({ value, title = "Scan to open on your phone", className }: QrCodeProps) {
  const svg = createQrSvg(value, {
    foreground: "#1c4f59",
    background: "#ffffff",
    title
  });

  return (
    <div
      className={cn("h-28 w-28 shrink-0 rounded-md border border-border bg-white p-2", className)}
      data-testid="share-qr-code"
      // Generated structured SVG, not user input.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
