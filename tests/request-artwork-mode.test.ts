import { describe, expect, it } from "vitest";

import { resolveRequestArtworkMode } from "@/lib/request-artwork-mode";

const baseInput = {
  aiEnabled: true,
  communityGalleryEnabled: true,
  conceptPrompt: "Blue and gold Chicago mural",
  hasExistingDesign: false,
  hasUpload: false,
  galleryPublicationConsent: false
};

describe("request artwork mode", () => {
  it("requires consent only when the request will generate new AI artwork", () => {
    expect(resolveRequestArtworkMode(baseInput)).toEqual({
      willGenerateAiConcept: true,
      requiresGalleryConsent: true,
      submissionFields: { conceptPrompt: "Blue and gold Chicago mural" }
    });

    expect(resolveRequestArtworkMode({ ...baseInput, galleryPublicationConsent: true }).submissionFields).toEqual({
      conceptPrompt: "Blue and gold Chicago mural",
      galleryPublicationConsent: true
    });
  });

  it("stores an existing design as project context without generation or publication consent", () => {
    expect(resolveRequestArtworkMode({ ...baseInput, hasExistingDesign: true })).toEqual({
      willGenerateAiConcept: false,
      requiresGalleryConsent: false,
      submissionFields: { wallDescription: "Blue and gold Chicago mural" }
    });
  });

  it("stores an uploaded-artwork idea as project context without generation or publication consent", () => {
    expect(resolveRequestArtworkMode({ ...baseInput, hasUpload: true, galleryPublicationConsent: true })).toEqual({
      willGenerateAiConcept: false,
      requiresGalleryConsent: false,
      submissionFields: { wallDescription: "Blue and gold Chicago mural" }
    });
  });

  it("does not request consent when AI generation is unavailable", () => {
    expect(resolveRequestArtworkMode({ ...baseInput, aiEnabled: false })).toEqual({
      willGenerateAiConcept: false,
      requiresGalleryConsent: false,
      submissionFields: { wallDescription: "Blue and gold Chicago mural" }
    });
  });
});
