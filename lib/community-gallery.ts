export const COMMUNITY_GALLERY_CONSENT_VERSION = "2026-08-05";

export const COMMUNITY_GALLERY_CONSENT_LABEL =
  "I agree that Wall Print Pro may store this request and publicly display the AI-generated artwork anonymously in its website gallery. My email and contact details will not be shown.";

export const COMMUNITY_GALLERY_CONSENT_HELP =
  "Free AI generation is offered in exchange for permission to showcase the generated result. Publication happens only after moderation.";

export const COMMUNITY_GALLERY_CONSENT_REQUIRED_MESSAGE =
  "Agree to anonymous gallery publication before generating free artwork.";

export const COMMUNITY_GALLERY_PAGE_SIZE = 24;

export function createCommunityGalleryPublicSlug(randomBytes?: Uint8Array) {
  const bytes = randomBytes ?? crypto.getRandomValues(new Uint8Array(24));
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  return `g-${token}`;
}

export function isEnabledEnvironmentValue(value: string | undefined) {
  return value === "1" || value === "true";
}
