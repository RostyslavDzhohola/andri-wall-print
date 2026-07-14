export type Phase0DeviceMatrixEntry = {
  platform: "ios" | "android";
  device: string;
  browser: string;
  expectedViewer: string;
  acceptance: string;
};

export const PHASE0_DEVICE_MATRIX: Phase0DeviceMatrixEntry[] = [
  {
    platform: "ios",
    device: "iPhone with LiDAR or ARKit support",
    browser: "Safari",
    expectedViewer: "USDZ Quick Look",
    acceptance: "Tap Place on wall, confirm the print can be placed on a detected wall and pinch-resized."
  },
  {
    platform: "android",
    device: "ARCore-capable Android phone",
    browser: "Chrome",
    expectedViewer: "Scene Viewer",
    acceptance: "Tap Place on wall, confirm the print opens in native AR and can be pinch-resized."
  }
];
