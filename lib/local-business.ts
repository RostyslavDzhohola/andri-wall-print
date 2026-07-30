import { getSiteUrl } from "./site-url";

export const LOCAL_BUSINESS_NAP = {
  name: "Wall Print Pro",
  county: "Cook County",
  streetAddress: "1453 E Walnut Ave",
  addressLocality: "Des Plaines",
  addressRegion: "IL",
  postalCode: "60016",
  addressCountry: "US",
  telephone: "(708) 543-3826",
  email: "hello@wallprintpro.com"
} as const;

export function buildLocalBusinessJsonLd() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#localbusiness`,
    name: LOCAL_BUSINESS_NAP.name,
    description:
      "Custom wall printing in Chicago — large-format wall murals and prints installed on interior walls across the city.",
    url: siteUrl,
    telephone: LOCAL_BUSINESS_NAP.telephone,
    email: LOCAL_BUSINESS_NAP.email,
    image: `${siteUrl}/artworks/chicago-final-1.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: LOCAL_BUSINESS_NAP.streetAddress,
      addressLocality: LOCAL_BUSINESS_NAP.addressLocality,
      addressRegion: LOCAL_BUSINESS_NAP.addressRegion,
      postalCode: LOCAL_BUSINESS_NAP.postalCode,
      addressCountry: LOCAL_BUSINESS_NAP.addressCountry
    },
    areaServed: {
      "@type": "AdministrativeArea",
      name: LOCAL_BUSINESS_NAP.county
    }
  };
}
