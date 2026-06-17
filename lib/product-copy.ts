export type PreviewStatusGroup = "ready" | "preparing" | "needsAttention" | "disabled";

export function previewStatusGroup(status: string): PreviewStatusGroup {
  if (status === "ready") {
    return "ready";
  }

  if (status === "uploaded" || status === "validating" || status === "generating" || status === "preparing") {
    return "preparing";
  }

  if (status === "revoked") {
    return "disabled";
  }

  return "needsAttention";
}

export function previewStatusLabel(status: string) {
  const group = previewStatusGroup(status);

  if (group === "ready") {
    return "Ready";
  }

  if (group === "preparing") {
    return "Preparing";
  }

  if (group === "disabled") {
    return "Disabled";
  }

  return "Needs attention";
}

export function previewSourceLabel(sourceKind: string) {
  if (sourceKind === "sample") {
    return "Saved artwork";
  }

  if (sourceKind === "upload") {
    return "Uploaded artwork";
  }

  if (sourceKind === "ai_concept") {
    return "Concept draft";
  }

  return "Artwork";
}

export function previewCreationLabel(createdVia: string) {
  if (createdVia === "builder") {
    return "Invite page";
  }

  return "Admin workspace";
}

export function inviteLinkStatusLabel(status: string) {
  if (status === "valid") {
    return "Ready";
  }

  if (status === "expired" || status === "revoked" || status === "not_found") {
    return "Disabled";
  }

  return "Needs attention";
}

export const demoLinkStatusLabel = inviteLinkStatusLabel;

export function wallPreviewIssueMessage() {
  return "This client preview needs attention. Try preparing it again.";
}
