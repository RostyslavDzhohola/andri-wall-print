import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ReservedPage from "@/app/reserved/page";

async function renderReservedPage(searchParams?: { session_id?: string | string[] }) {
  const element = await ReservedPage({
    searchParams: searchParams ? Promise.resolve(searchParams) : undefined
  });

  return renderToStaticMarkup(element);
}

describe("/reserved page rendering", () => {
  it("renders with session_id: receipt line present with the truncated session id", async () => {
    const html = await renderReservedPage({ session_id: "cs_test_a1B2c3D4e5F6g7H8" });

    expect(html).toContain("Receipt ref");
    expect(html).toContain("g7H8");
    // Truncated — never the full session id.
    expect(html).not.toContain("cs_test_a1B2c3D4e5F6g7H8");
  });

  it("renders fully without session_id: no receipt line, page complete", async () => {
    const html = await renderReservedPage();

    expect(html).not.toContain("Receipt ref");
    // Warm confirmation + all 3 numbered steps + schedule contact block.
    expect(html).toContain("Here&#x27;s exactly what happens next");
    expect(html).toContain("Estimate visit scheduled");
    expect(html).toContain("Design confirmed &amp; printability checked");
    expect(html).toContain("Print day");
    expect(html).toContain('href="tel:7085433826"');
    expect(html).toContain('href="sms:7085433826"');
    expect(html).toContain("Call (708) 543-3826");
  });

  it("keeps the D10 deposit copy on the page: reserves + credited, never purchases artwork", async () => {
    const html = await renderReservedPage({ session_id: "cs_test_deposit_copy_check" });

    expect(html).toContain("reserves your print-job slot");
    expect(html).toContain("credited toward your final print price");
    expect(html).toContain("never purchases artwork");
    expect(html).toContain("licensed or original");
  });
});
