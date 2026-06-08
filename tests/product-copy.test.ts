import { describe, expect, it } from "vitest";

import {
  demoLinkStatusLabel,
  inviteLinkStatusLabel,
  previewCreationLabel,
  previewSourceLabel,
  previewStatusGroup,
  previewStatusLabel,
  wallPreviewIssueMessage
} from "@/lib/product-copy";

describe("product UI copy helpers", () => {
  it("maps preview statuses to human labels", () => {
    expect(previewStatusLabel("ready")).toBe("Ready");
    expect(previewStatusLabel("uploaded")).toBe("Preparing");
    expect(previewStatusLabel("validating")).toBe("Preparing");
    expect(previewStatusLabel("generating")).toBe("Preparing");
    expect(previewStatusLabel("failed")).toBe("Needs attention");
    expect(previewStatusLabel("rejected")).toBe("Needs attention");
    expect(previewStatusLabel("revoked")).toBe("Disabled");
  });

  it("keeps preview status grouping stable for dashboard counts", () => {
    expect(previewStatusGroup("ready")).toBe("ready");
    expect(previewStatusGroup("uploaded")).toBe("preparing");
    expect(previewStatusGroup("failed")).toBe("needsAttention");
    expect(previewStatusGroup("revoked")).toBe("disabled");
  });

  it("maps source and creation values to product labels", () => {
    expect(previewSourceLabel("sample")).toBe("Saved artwork");
    expect(previewSourceLabel("upload")).toBe("Uploaded artwork");
    expect(previewCreationLabel("builder")).toBe("Invite page");
    expect(previewCreationLabel("seller")).toBe("Admin workspace");
  });

  it("maps invite link statuses and issue copy", () => {
    expect(inviteLinkStatusLabel("valid")).toBe("Ready");
    expect(inviteLinkStatusLabel("expired")).toBe("Disabled");
    expect(inviteLinkStatusLabel("revoked")).toBe("Disabled");
    expect(inviteLinkStatusLabel("not_found")).toBe("Disabled");
    expect(demoLinkStatusLabel("valid")).toBe("Ready");
    expect(wallPreviewIssueMessage()).toBe("This client preview needs attention. Try preparing it again.");
  });
});
