type RequestArtworkModeInput = {
  aiEnabled: boolean;
  communityGalleryEnabled: boolean;
  conceptPrompt: string;
  hasExistingDesign: boolean;
  hasUpload: boolean;
  galleryPublicationConsent: boolean;
};

export function resolveRequestArtworkMode(input: RequestArtworkModeInput) {
  const requestArtworkDescription = input.conceptPrompt.trim();
  const willGenerateAiConcept = Boolean(
    input.aiEnabled && requestArtworkDescription && !input.hasExistingDesign && !input.hasUpload
  );
  const requiresGalleryConsent = input.communityGalleryEnabled && willGenerateAiConcept;

  return {
    willGenerateAiConcept,
    requiresGalleryConsent,
    submissionFields: requestArtworkDescription
      ? willGenerateAiConcept
        ? {
            conceptPrompt: requestArtworkDescription,
            ...(requiresGalleryConsent && input.galleryPublicationConsent ? { galleryPublicationConsent: true as const } : {})
          }
        : { wallDescription: requestArtworkDescription }
      : {}
  };
}
