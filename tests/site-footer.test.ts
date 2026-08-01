import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "@/components/site/site-footer";

describe("shared site footer", () => {
  it("renders the business contact details and safe social profile links", () => {
    const html = renderToStaticMarkup(createElement(SiteFooter));

    expect(html).toContain('data-testid="site-footer"');
    expect(html).toContain("Wall Print Pro");
    expect(html).toContain("Cook County");
    expect(html).toContain("1453 E Walnut Ave");
    expect(html).toContain("Des Plaines, IL 60016");
    expect(html).toContain('href="tel:7085433826"');
    expect(html).toContain('href="mailto:thewallprintpro@gmail.com"');
    expect(html).toContain('data-testid="site-footer-facebook"');
    expect(html).toContain('href="https://www.facebook.com/profile.php?id=61587045900230"');
    expect(html).toContain('data-testid="site-footer-instagram"');
    expect(html).toContain('href="https://www.instagram.com/wall_printpro/"');
    expect(html.match(/target="_blank"/g)).toHaveLength(2);
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
  });
});
