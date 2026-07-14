// Minimal ambient types for the untyped `qrcode-generator` pure-JS package.
// Only the surface we use in lib/qr-code.ts is declared.
declare module "qrcode-generator" {
  type TypeNumber = number; // 0 = auto-detect the smallest fitting version
  type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

  interface QRCode {
    addData(data: string): void;
    make(): void;
    getModuleCount(): number;
    isDark(row: number, col: number): boolean;
    createSvgTag(options?: { cellSize?: number; margin?: number }): string;
  }

  function qrcode(typeNumber: TypeNumber, errorCorrectionLevel: ErrorCorrectionLevel): QRCode;

  export default qrcode;
}
