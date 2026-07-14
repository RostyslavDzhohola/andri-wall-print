import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QrCode } from "@/components/ui/qr-code";
import { createQrDataUrl, createQrSvg } from "@/lib/qr-code";

describe("QR code generation", () => {
  it("encodes a URL into a valid, self-contained SVG", () => {
    const svg = createQrSvg("https://www.wallprintpro.com/preview/chicago-final-1");

    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("viewBox=");
    // Dark modules are emitted as a single path with actual geometry.
    expect(svg).toMatch(/<path d="M/);
    expect(svg).toContain('role="img"');
  });

  it("produces different matrices for different URLs (real encoding, not a static image)", () => {
    const a = createQrSvg("https://example.com/a");
    const b = createQrSvg("https://example.com/bbbbbbbbbbbbbbbbbbbb");

    expect(a).not.toBe(b);
  });

  it("escapes the accessible title so it cannot break out of the SVG attribute", () => {
    const svg = createQrSvg("https://example.com", { title: 'evil" onload="x' });

    expect(svg).not.toContain('onload="x"');
    expect(svg).toContain("&quot;");
  });

  it("builds an image/svg+xml data URL", () => {
    const dataUrl = createQrDataUrl("https://example.com");

    expect(dataUrl.startsWith("data:image/svg+xml,")).toBe(true);
    expect(decodeURIComponent(dataUrl)).toContain("<svg");
  });

  it("rejects empty input", () => {
    expect(() => createQrSvg("")).toThrow();
  });

  it("renders the QrCode component to inline SVG markup", () => {
    const html = renderToStaticMarkup(
      createElement(QrCode, { value: "https://www.wallprintpro.com/preview/chicago-final-1" })
    );

    expect(html).toContain('data-testid="share-qr-code"');
    expect(html).toContain("<svg");
    expect(html).toContain('role="img"');
  });
});
