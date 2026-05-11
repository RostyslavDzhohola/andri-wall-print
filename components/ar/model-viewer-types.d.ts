import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        alt?: string;
        ar?: boolean | "";
        "ar-modes"?: string;
        "camera-controls"?: boolean | "";
        "disable-zoom"?: boolean | "";
        "ios-src"?: string;
        poster?: string;
        "reveal"?: "auto" | "interaction" | "manual";
        "shadow-intensity"?: string;
        src?: string;
        "touch-action"?: string;
      };
    }
  }
}
