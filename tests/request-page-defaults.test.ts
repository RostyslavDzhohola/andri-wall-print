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
      defaultConceptPrompt: "Gold leaf logo wall"
    });
  });

  it("truncates oversized concept prompts before they reach the request form", () => {
    const defaults = resolveRequestPageDefaults({
      conceptPrompt: "x".repeat(LEAD_CONCEPT_PROMPT_MAX_LENGTH + 50)
    });

    expect(defaults.defaultConceptPrompt).toHaveLength(LEAD_CONCEPT_PROMPT_MAX_LENGTH);
  });

  it("turns a valid design id into editable request context", () => {
    expect(resolveRequestPageDefaults({ designId: "dragon-wall-print" })).toMatchObject({
      defaultIntent: "concept",
      defaultConceptPrompt: expect.stringContaining("Ember Dragon"),
      defaultDesignContext: {
        id: "dragon-wall-print",
        title: "Ember Dragon"
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
        title: "Pathways to Success"
      }
    });
  });

  it("ignores unknown design ids instead of falling back to a default design", () => {
    expect(resolveRequestPageDefaults({ designId: "missing-design" })).toEqual({
      defaultIntent: "concept"
    });
  });
});
