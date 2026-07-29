export type SocialProofItem = {
  id: string;
  platform: "facebook" | "instagram";
  kind: "reel" | "post";
  title: string;
  summary: string;
  canonicalUrl: string;
  placement:
    | "customer-result"
    | "business-branding"
    | "speed-cleanliness"
    | "customer-story"
    | "commercial-project"
    | "service-explanation";
  embedStatus: "verified-facebook-embed" | "instagram-embed";
  directMediaAccount?: "wall_printpro";
};

export const SOCIAL_PROOF_ITEMS = [
  {
    id: "happy-customer",
    platform: "facebook",
    kind: "reel",
    title: "Another happy customer",
    summary: "Watch a finished custom wall print in a real customer space.",
    canonicalUrl: "https://www.facebook.com/reel/2183497552487204/",
    placement: "customer-result",
    embedStatus: "verified-facebook-embed"
  },
  {
    id: "business-logo-wall",
    platform: "instagram",
    kind: "reel",
    title: "A business logo, printed directly on the wall",
    summary: "A branding example for offices, studios, restaurants, and retail spaces.",
    canonicalUrl: "https://www.instagram.com/wall_printpro/reel/DZLMtbGseuj/",
    placement: "business-branding",
    embedStatus: "instagram-embed",
    directMediaAccount: "wall_printpro"
  },
  {
    id: "one-day-result",
    platform: "instagram",
    kind: "reel",
    title: "No dust. No mess. Ready in one day.",
    summary: "A quick look at the clean installation process and bright finished print.",
    canonicalUrl: "https://www.instagram.com/wall_printpro/reel/DX_9ifJtsPg/",
    placement: "speed-cleanliness",
    embedStatus: "instagram-embed",
    directMediaAccount: "wall_printpro"
  },
  {
    id: "first-client-story",
    platform: "instagram",
    kind: "post",
    title: "Three Chicago-inspired prints for a first client",
    summary: "A customer project featuring three high-resolution designs printed directly on the wall.",
    canonicalUrl: "https://www.instagram.com/iam_sushi/p/DYfNmX-kf05/",
    placement: "customer-story",
    embedStatus: "instagram-embed"
  },
  {
    id: "label808-studio",
    platform: "instagram",
    kind: "post",
    title: "A recording studio brought to life",
    summary: "A commercial wall-printing project created for the Label808 music studio.",
    canonicalUrl: "https://www.instagram.com/wall_printpro/p/DY0fWs8jcoi/",
    placement: "commercial-project",
    embedStatus: "instagram-embed",
    directMediaAccount: "wall_printpro"
  },
  {
    id: "wall-printing-explained",
    platform: "instagram",
    kind: "post",
    title: "What wall printing can do",
    summary: "See the available colors, print dimensions, production speed, and supported surfaces.",
    canonicalUrl: "https://www.instagram.com/wall_printpro/p/DXuOrnmDUG8/",
    placement: "service-explanation",
    embedStatus: "instagram-embed",
    directMediaAccount: "wall_printpro"
  }
] as const satisfies readonly SocialProofItem[];

export function getFacebookEmbedUrl(item: SocialProofItem): string | null {
  if (item.embedStatus !== "verified-facebook-embed") {
    return null;
  }

  const query = new URLSearchParams({
    href: item.canonicalUrl,
    show_text: "false",
    width: "500"
  });

  return `https://www.facebook.com/plugins/video.php?${query.toString()}`;
}

export function getInstagramMediaIdentity(value: string): { mediaType: "p" | "reel"; shortcode: string } | null {
  const url = new URL(value);
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const mediaTypeIndex = pathSegments.findIndex((segment) => segment === "p" || segment === "reel");
  const mediaType = pathSegments[mediaTypeIndex];
  const shortcode = pathSegments[mediaTypeIndex + 1];

  if ((mediaType !== "p" && mediaType !== "reel") || !shortcode) {
    return null;
  }

  return { mediaType, shortcode };
}

export function getInstagramEmbedPermalink(item: SocialProofItem): string | null {
  if (item.platform !== "instagram" || item.embedStatus !== "instagram-embed") {
    return null;
  }

  const identity = getInstagramMediaIdentity(item.canonicalUrl);

  return identity ? `https://www.instagram.com/${identity.mediaType}/${identity.shortcode}/` : null;
}

export const FACEBOOK_PROFILE_URL = "https://www.facebook.com/profile.php?id=61587045900230";
export const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/wall_printpro/";
