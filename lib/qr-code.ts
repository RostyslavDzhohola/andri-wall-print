// Dependency-light QR generation for the composite_only / desktop share states.
//
// Wraps the battle-tested pure-JS `qrcode-generator` (no canvas, no network)
// and emits a self-contained, accessible SVG string we can drop straight into
// the DOM. Kept as pure functions so vitest (node env) can assert the output
// without a DOM renderer.
//
// A previous review found the composite_only copy said "scan the QR" while no
// QR actually existed — this closes that gap.
import qrcode from "qrcode-generator";

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export type QrSvgOptions = {
  // Number of SVG user-space units per QR module (the viewBox scales freely, so
  // this only affects the internal coordinate resolution, not the rendered size).
  moduleSize?: number;
  // Quiet-zone width in modules. The QR spec recommends 4; we allow overriding
  // it down for tight layouts.
  margin?: number;
  errorCorrectionLevel?: QrErrorCorrectionLevel;
  // Foreground (dark modules) and background (light) colors.
  foreground?: string;
  background?: string;
  // Accessible label for the <svg role="img">.
  title?: string;
};

const DEFAULTS = {
  moduleSize: 4,
  margin: 4,
  errorCorrectionLevel: "M" as QrErrorCorrectionLevel,
  foreground: "#18181b",
  background: "#ffffff"
} as const;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Encode `data` (typically a share/page URL) as an SVG QR code string.
 *
 * Uses type-number 0 (auto-fit) so it grows to hold longer URLs. Dark modules
 * are merged into a single <path> for a compact, crisp result at any size.
 */
export function createQrSvg(data: string, options: QrSvgOptions = {}): string {
  if (!data) {
    throw new Error("createQrSvg: data must be a non-empty string.");
  }

  const moduleSize = options.moduleSize ?? DEFAULTS.moduleSize;
  const margin = options.margin ?? DEFAULTS.margin;
  const level = options.errorCorrectionLevel ?? DEFAULTS.errorCorrectionLevel;
  const foreground = options.foreground ?? DEFAULTS.foreground;
  const background = options.background ?? DEFAULTS.background;
  const title = options.title ?? "QR code";

  const qr = qrcode(0, level);
  qr.addData(data);
  qr.make();

  const count = qr.getModuleCount();
  const dimension = (count + margin * 2) * moduleSize;

  let path = "";
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) {
        const x = (col + margin) * moduleSize;
        const y = (row + margin) * moduleSize;
        path += `M${x} ${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" ` +
    `role="img" aria-label="${escapeXml(title)}" shape-rendering="crispEdges">` +
    `<rect width="${dimension}" height="${dimension}" fill="${escapeXml(background)}"/>` +
    `<path d="${path}" fill="${escapeXml(foreground)}"/>` +
    `</svg>`
  );
}

/**
 * Encode `data` as an `image/svg+xml` data URL — convenient for an <img src>.
 */
export function createQrDataUrl(data: string, options: QrSvgOptions = {}): string {
  const svg = createQrSvg(data, options);

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
