import { getSiteUrl } from "./site-url";

// LAUNCH GATE: real NAP (name, address, phone) from client.
// Every field below except the site URL is a placeholder and must be replaced
// with the client's verified business details before launch.
export const LOCAL_BUSINESS_NAP = {
  name: "Wall Print Pro",
  streetAddress: "123 W Example St, Suite 100",
  addressLocality: "Chicago",
  addressRegion: "IL",
  postalCode: "60601",
  addressCountry: "US",
  telephone: "+1-312-555-0100",
  email: "hello@wallprintpro.com"
} as const;

// Approximate Chicago city-center coordinates. LAUNCH GATE: replace with the
// client's real service-area or storefront geo.
const CHICAGO_GEO = {
  latitude: 41.8781,
  longitude: -87.6298
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
    geo: {
      "@type": "GeoCoordinates",
      latitude: CHICAGO_GEO.latitude,
      longitude: CHICAGO_GEO.longitude
    },
    areaServed: {
      "@type": "City",
      name: "Chicago"
    }
  };
}
