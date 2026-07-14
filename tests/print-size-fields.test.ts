import { describe, expect, it } from "vitest";

import { PRINT_SIZE_FIELD_STEP, printSizeFieldsValueFromPrint } from "@/components/preview/print-size-fields";
import { DEFAULT_PREVIEW_BUNDLE_PRINT } from "@/lib/preview-bundle-contract";

function isNativeNumberStepValid(value: string, step: string) {
  return step === "any" || Number(value) % Number(step) === 0;
}

describe("print size fields", () => {
  it("keeps default decimal dimensions submittable by native number inputs", () => {
    // Regression: ISSUE-003 - browser step validation blocked public request submission.
    // Found by /qa on 2026-06-17.
    // Report: .gstack/qa-reports/qa-report-localhost-2026-06-17.md
    const value = printSizeFieldsValueFromPrint(DEFAULT_PREVIEW_BUNDLE_PRINT);

    expect(value).toMatchObject({ unit: "in", width: "17.7", height: "35.4" });
    expect(isNativeNumberStepValid(value.width, PRINT_SIZE_FIELD_STEP)).toBe(true);
    expect(isNativeNumberStepValid(value.height, PRINT_SIZE_FIELD_STEP)).toBe(true);
  });
});
