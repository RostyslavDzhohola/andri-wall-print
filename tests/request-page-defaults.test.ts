import { describe, expect, it } from "vitest";

import { LEAD_CONCEPT_PROMPT_MAX_LENGTH } from "@/lib/lead-request-contract";
import { resolveRequestPageDefaults } from "@/lib/request-page-defaults";

describe("request page defaults", () => {
  it("prefills a safe concept prompt from search params", () => {
    expect(
      resolveRequestPageDefaults({
        intent: "concept",
        conceptPrompt: "  Gold   leaf logo wall  "
      })
    ).toEqual({
      defaultIntent: "concept",
      defaultConceptPrompt: "Gold leaf logo wall",
      focusUpload: false
    });
  });

  it("truncates oversized concept prompts before they reach the request form", () => {
    const defaults = resolveRequestPageDefaults({
      conceptPrompt: "x".repeat(LEAD_CONCEPT_PROMPT_MAX_LENGTH + 50)
    });

    expect(defaults.defaultConceptPrompt).toHaveLength(LEAD_CONCEPT_PROMPT_MAX_LENGTH);
  });

  it("turns a valid design id into editable request context", () => {
    expect(resolveRequestPageDefaults({ designId: "chicago-final-2" })).toMatchObject({
      defaultIntent: "concept",
      defaultConceptPrompt: expect.stringContaining("Lakefront Day"),
      defaultDesignContext: {
        id: "chicago-final-2",
        title: "Lakefront Day",
        print: expect.objectContaining({ label: "3 ft x 5 ft" })
      }
    });
  });

  it("keeps a supplied prompt while preserving valid selected-design context", () => {
    expect(
      resolveRequestPageDefaults({
        conceptPrompt: "Make this work for a reception wall",
        designId: "chicago-final-1"
      })
    ).toMatchObject({
      defaultConceptPrompt: "Make this work for a reception wall",
      defaultDesignContext: {
        id: "chicago-final-1",
        title: "Pathways to Success",
        print: expect.objectContaining({ label: "5 ft x 4.2 ft" })
      }
    });
  });

  it("ignores unknown design ids instead of falling back to a default design", () => {
    expect(resolveRequestPageDefaults({ designId: "missing-design" })).toEqual({
      defaultIntent: "concept",
      focusUpload: false
    });
  });

  it("uses only server-resolved community gallery metadata", () => {
    const publishedDesign = {
      id: "published-safe-slug",
      title: "Community AI concept",
      description: "An anonymous published concept.",
      print: {
        aspectRatio: "5:4",
        widthMeters: 1.524,
        heightMeters: 1.2192,
        label: "5 ft x 4 ft"
      }
    };

    expect(
      resolveRequestPageDefaults(
        {
          gallerySlug: "published-safe-slug",
          conceptPrompt: "Attacker-supplied title and prompt"
        },
        publishedDesign
      )
    ).toMatchObject({
      defaultDesignContext: publishedDesign,
      defaultConceptPrompt: expect.stringContaining("Community AI concept")
    });

    expect(resolveRequestPageDefaults({ gallerySlug: "attacker-slug" }, publishedDesign)).toEqual({
      defaultIntent: "concept",
      focusUpload: false
    });
    expect(
      resolveRequestPageDefaults(
        { gallerySlug: "attacker-slug", conceptPrompt: "Attacker-supplied prompt" },
        publishedDesign
      )
    ).toEqual({ defaultIntent: "concept", focusUpload: false });
  });

  it("marks the upload-first workflow from the homepage CTA", () => {
    expect(resolveRequestPageDefaults({ focus: "upload" })).toMatchObject({
      defaultIntent: "concept",
      focusUpload: true
    });
  });
});
