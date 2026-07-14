import { describe, expect, it } from "vitest";

import {
  RESERVED_DEPOSIT_COPY,
  RESERVED_DEPOSIT_HEADLINE,
  RESERVED_LICENSING_COPY,
  RESERVED_STEPS,
  resolveReservedPageModel
} from "@/lib/reserved-page-content";

describe("/reserved page content", () => {
  it("renders the receipt line with a truncated session id when session_id is present", () => {
    const model = resolveReservedPageModel({ session_id: "cs_live_a1B2c3D4e5F6g7H8" });

    expect(model.sessionId).toBe("cs_live_a1B2c3D4e5F6g7H8");
    expect(model.receiptLine).toBeDefined();
    // Truncated: only the tail is shown, never the full session id.
    expect(model.receiptLine).toContain("g7H8");
    expect(model.receiptLine).not.toContain("cs_live_a1B2c3D4e5F6g7H8");

    // Repeated ?session_id= params fold to the first (Next searchParams array form).
    expect(resolveReservedPageModel({ session_id: ["cs_test_first", "cs_test_second"] }).sessionId).toBe("cs_test_first");
  });

  it("renders the complete page model without session_id (no receipt line)", () => {
    for (const searchParams of [undefined, {}, { session_id: "" }, { session_id: "   " }]) {
      const model = resolveReservedPageModel(searchParams);

      expect(model.sessionId).toBeUndefined();
      expect(model.receiptLine).toBeUndefined();
    }

    // Malformed / non-Stripe-shaped ids are dropped rather than displayed.
    expect(resolveReservedPageModel({ session_id: "<script>alert(1)</script>" }).receiptLine).toBeUndefined();

    // The page body does not depend on the session at all — steps and copy are
    // static and always present.
    expect(RESERVED_STEPS).toHaveLength(3);
    expect(RESERVED_STEPS[0].title).toBe("Estimate visit scheduled");
    expect(RESERVED_STEPS[1].title).toBe("Design confirmed & printability checked");
    expect(RESERVED_STEPS[2].title).toBe("Print day");
  });

  it("guards the D10 deposit copy: reserves + credited language, artwork exclusion, licensing line", () => {
    expect(RESERVED_DEPOSIT_COPY).toContain("reserves your print-job slot");
    expect(RESERVED_DEPOSIT_COPY).toContain("credited toward your final print price");
    expect(RESERVED_DEPOSIT_COPY).toContain("never purchases artwork");
    expect(RESERVED_LICENSING_COPY).toBe(
      "Custom artwork must be licensed or original; printability is confirmed at your estimate."
    );
    expect(RESERVED_DEPOSIT_HEADLINE).toBe("You're in line. Here's exactly what happens next.");
  });
});
