import { describe, expect, it } from "vitest";

import { buildLocalBusinessJsonLd, LOCAL_BUSINESS_NAP } from "@/lib/local-business";

describe("LocalBusiness JSON-LD", () => {
  it("builds valid, serializable JSON-LD with @type LocalBusiness and NAP fields", () => {
    const jsonLd = buildLocalBusinessJsonLd();

    // Serializes and re-parses cleanly (this is what the component embeds).
    const roundTripped = JSON.parse(JSON.stringify(jsonLd));

    expect(roundTripped["@context"]).toBe("https://schema.org");
    expect(roundTripped["@type"]).toBe("LocalBusiness");

    // Name.
    expect(roundTripped.name).toBe(LOCAL_BUSINESS_NAP.name);

    // Address (the "A" of NAP).
    expect(roundTripped.address["@type"]).toBe("PostalAddress");
    expect(roundTripped.address.addressLocality).toBe("Des Plaines");
    expect(roundTripped.address.streetAddress).toBe(LOCAL_BUSINESS_NAP.streetAddress);
    expect(roundTripped.address.postalCode).toBe(LOCAL_BUSINESS_NAP.postalCode);

    // Service area.
    expect(roundTripped.areaServed).toEqual({
      "@type": "AdministrativeArea",
      name: "Cook County"
    });
    expect(roundTripped.geo).toBeUndefined();

    // Phone (the "P" of NAP).
    expect(roundTripped.telephone).toBe(LOCAL_BUSINESS_NAP.telephone);

    expect(roundTripped.url.startsWith("http")).toBe(true);
  });
});
