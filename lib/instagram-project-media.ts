import { getInstagramMediaIdentity, SOCIAL_PROOF_ITEMS } from "@/lib/social-proof";

export type InstagramProjectMedia = {
  projectId: string;
  mediaId: string;
  kind: "image" | "video";
  mediaUrl: string;
  posterUrl: string | null;
  canonicalUrl: string;
  title: string;
  summary: string;
};

type InstagramGraphMedia = {
  id?: unknown;
  media_type?: unknown;
  media_url?: unknown;
  thumbnail_url?: unknown;
  permalink?: unknown;
  children?: {
    data?: InstagramGraphMedia[];
  };
};

export type InstagramGraphMediaResponse = {
  data?: InstagramGraphMedia[];
};

function asHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function selectRenderableMedia(media: InstagramGraphMedia): InstagramGraphMedia | null {
  if (media.media_type === "IMAGE" || media.media_type === "VIDEO") {
    return media;
  }

  if (media.media_type !== "CAROUSEL_ALBUM" || !Array.isArray(media.children?.data)) {
    return null;
  }

  return media.children.data.find((child) => child.media_type === "IMAGE" || child.media_type === "VIDEO") ?? null;
}

export function resolveInstagramProjectMedia(payload: InstagramGraphMediaResponse): InstagramProjectMedia[] {
  const graphMedia = Array.isArray(payload.data) ? payload.data : [];
  const mediaByShortcode = new Map<string, InstagramGraphMedia>();

  for (const media of graphMedia) {
    const permalink = asHttpsUrl(media.permalink);
    const shortcode = permalink ? getInstagramMediaIdentity(permalink)?.shortcode : null;

    if (shortcode) {
      mediaByShortcode.set(shortcode, media);
    }
  }

  return SOCIAL_PROOF_ITEMS.flatMap((project) => {
    if (project.platform !== "instagram") {
      return [];
    }

    // A collaborator's post must authorize its own API access before the
    // catalog can opt it into this seller-owned connection.
    if (!("directMediaAccount" in project) || project.directMediaAccount !== "wall_printpro") {
      return [];
    }

    const shortcode = getInstagramMediaIdentity(project.canonicalUrl)?.shortcode;
    const graphItem = shortcode ? mediaByShortcode.get(shortcode) : null;
    const renderable = graphItem ? selectRenderableMedia(graphItem) : null;
    const mediaUrl = renderable ? asHttpsUrl(renderable.media_url) : null;

    if (!graphItem || !renderable || !mediaUrl || typeof graphItem.id !== "string") {
      return [];
    }

    const posterUrl = renderable.media_type === "VIDEO" ? asHttpsUrl(renderable.thumbnail_url) : null;

    return [
      {
        projectId: project.id,
        mediaId: graphItem.id,
        kind: renderable.media_type === "VIDEO" ? "video" : "image",
        mediaUrl,
        posterUrl,
        canonicalUrl: project.canonicalUrl,
        title: project.title,
        summary: project.summary
      } satisfies InstagramProjectMedia
    ];
  });
}
