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

// ---------------------------------------------------------------------------
// Homepage marketing copy (approved C2 direction).
//
// The old "no-AI-copy" rule is retired: generation is the headline. All homepage
// copy strings live here so the client copy pass can happen in one file. Cold
// visitors are routed through the neutral estimate flow before any payment step.
// ---------------------------------------------------------------------------

export const HOME_NAV_ESTIMATE_CTA = "Get an estimate";
export const HOME_LOCATION_BADGE = "Des Plaines · Cook County · wall prints from $500";
export const HOME_AUDIENCE_LINE = "Offices · restaurants · home feature walls.";

// Chicago local-SEO woven in naturally (human-first, no stuffing).
export const HOME_HEADLINE = "Custom murals printed directly on your wall in Chicago.";
export const HOME_SUBHEAD =
  "Turn any plain wall into a custom mural in about a day, without wallpaper or vinyl. See it on your wall first with a free digital preview.";

// Three-entry chooser labels + primary CTA. Kept short (≤8 chars) so all three
// render with ZERO ellipsis in the segmented control at 375px — the control also
// hides its decorative leading icons below 400px (see homepage-demo-actions.tsx).
export const HOME_ENTRY_CHOOSE = "Designs";
export const HOME_ENTRY_UPLOAD = "Your art";
export const HOME_ENTRY_DESCRIBE = "Describe";
export const HOME_OPEN_GALLERY_CTA = "Open gallery";
export const HOME_UPLOAD_CTA = "Upload your artwork";
export const HOME_GENERATE_CTA = "Generate preview";

// D10 binding licensing line shown wherever generation appears.
// Interaction-state copy (styling the already-wired states to spec).
export const HOME_GENERATION_LOADING = "Drafting your concept — about 30s";
export const HOME_AT_CAPACITY_TITLE = "We're at capacity for concepts today.";
export const HOME_AT_CAPACITY_BODY = "Leave your email — you're first in line tomorrow.";
export const HOME_COMPOSITE_ONLY_BODY =
  "Here's your concept on the wall. Scan the QR to open it on your phone, or leave this open and come back — we'll also follow up by email.";
export const HOME_UPLOAD_ACCEPTED_FORMATS = "Accepted formats: JPEG, PNG, WebP.";
// Upload entry promises the real flow: there is no public upload→AR pipeline on
// this branch (lead capture only), so we don't over-promise "see it on your wall".
export const HOME_UPLOAD_ENTRY_BODY =
  "Upload your art or logo to see it here immediately, then send the preview to your iPhone.";

// Comparison table. LAUNCH GATE numbers are flagged at the call site in the
// homepage component.
export const HOME_COMPARISON_HEADING = "Wall printing vs. everything else";
export const HOME_COMPARISON_SUBHEAD =
  "Compare the full project — preview, production, installation, cleanup, and what happens over time.";
export const HOME_COMPARISON_COLUMNS = ["Wall Print Pro", "Vinyl wrap", "Hand painted"] as const;

export const HOME_COMPARISON_PROOF_POINTS = [
  {
    label: "Typical on-site time",
    value: "About 1 day"
  },
  {
    label: "Digital wall preview",
    value: "Free before you commit"
  }
] as const;

export type HomeComparisonRow = {
  feature: string;
  wallPrintPro: string;
  vinylWrap: string;
  handPainted: string;
  // Numbers/claims the client must verify before launch.
  needsClientVerification?: boolean;
};

export const HOME_COMPARISON_ROWS: readonly HomeComparisonRow[] = [
  {
    feature: "See it on YOUR wall first (AR)",
    wallPrintPro: "Yes — only us",
    vinylWrap: "No",
    handPainted: "No"
  },
  {
    feature: "Design, installation & cleanup",
    wallPrintPro: "Included",
    vinylWrap: "Often extra",
    handPainted: "Varies"
  },
  {
    feature: "No seams, peeling or bubbling",
    wallPrintPro: "Yes",
    vinylWrap: "No — film can lift",
    handPainted: "Yes"
  },
  {
    feature: "Can be repainted over later",
    wallPrintPro: "Yes",
    vinylWrap: "After removal",
    handPainted: "Yes"
  },
  {
    feature: "Photo-level detail",
    wallPrintPro: "1200 DPI",
    vinylWrap: "Medium",
    handPainted: "Depends on artist",
    needsClientVerification: true
  },
  {
    feature: "Typical timeline",
    wallPrintPro: "~1 day",
    vinylWrap: "2–3 days",
    handPainted: "1–2 weeks",
    needsClientVerification: true
  }
] as const;

// Client review transcribed from the supplied Instagram comment screenshot.
export const HOME_TESTIMONIAL = {
  quote: "Thanks guys! You guys did such an amazing job. Can’t wait to work with you again.",
  attribution: "@houseofhanainteriors",
  needsClientQuote: false
} as const;

// Lower-funnel reservation strip. Payment stays below proof, process, comparison,
// and public projects; cold visitors first see neutral estimate CTAs.
export const HOME_RESERVE_STRIP_HEADLINE = "Reserve your spot — $100";
export const HOME_RESERVE_STRIP_BODY_PREFIX = "When you're ready, the $100 reservation holds your print-job slot and is ";
export const HOME_RESERVE_STRIP_CREDIT = "credited to your print";
export const HOME_RESERVE_STRIP_BODY_SUFFIX = " — it isn't an extra fee.";
export const HOME_RESERVE_STRIP_CTA = "Reserve spot — $100";

// Process steps.
export const HOME_PROCESS_HEADING = "From idea to print in three steps.";
export const HOME_PROCESS_STEPS = [
  {
    title: "Choose the art",
    body: "Pick a design, upload your artwork, or describe the custom image you want."
  },
  {
    title: "Request an estimate",
    body: "Send us your wall details so we can confirm the size, surface, timing, and price."
  },
  {
    title: "We make the print",
    body: "We print your approved design directly onto your wall."
  }
] as const;

// Footer.
export const HOME_FOOTER_TAGLINE = "Custom wall printing in Chicago — murals and prints on your actual walls.";
