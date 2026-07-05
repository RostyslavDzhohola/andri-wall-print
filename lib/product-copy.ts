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
// copy strings live here so the client copy pass can happen in one file. D10
// deposit rule is binding: the $100 reserves the print-job slot and is credited
// to the final price — never "buy art".
// ---------------------------------------------------------------------------

export const HOME_NAV_RESERVE_CTA = "Reserve a spot — $100";
export const HOME_LOCATION_BADGE = "Chicago · wall prints from $600";

// Chicago local-SEO woven in naturally (human-first, no stuffing).
export const HOME_HEADLINE = "Not wallpaper. Not vinyl. Printed straight onto your wall.";
export const HOME_SUBHEAD =
  "Custom wall printing in Chicago. Choose a design, upload your own art or logo, or describe an idea — then see it on your actual wall before you commit.";

// Three-entry chooser labels + primary CTA. Kept short (≤11 chars) so all three
// render untruncated inside the segmented control at 375px.
export const HOME_ENTRY_CHOOSE = "Our designs";
export const HOME_ENTRY_UPLOAD = "Your art";
export const HOME_ENTRY_DESCRIBE = "Describe it";
export const HOME_SEE_ON_WALL_CTA = "See it on your wall";

// D10 binding licensing line shown wherever generation appears.
export const HOME_GENERATION_LICENSING_NOTE =
  "Custom artwork must be licensed or original; printability confirmed at your estimate.";

// Interaction-state copy (styling the already-wired states to spec).
export const HOME_GENERATION_LOADING = "Drafting your concept — about 30s";
export const HOME_AT_CAPACITY_TITLE = "We're at capacity for concepts today.";
export const HOME_AT_CAPACITY_BODY = "Leave your email — you're first in line tomorrow.";
export const HOME_COMPOSITE_ONLY_BODY =
  "Here's your concept on the wall. Scan the QR to open it on your phone, or leave this open and come back — we'll also follow up by email.";
export const HOME_UPLOAD_ACCEPTED_FORMATS = "Accepted formats: JPEG, PNG, WebP.";
// Upload entry promises the real flow: there is no public upload→AR pipeline on
// this branch (lead capture only), so we don't over-promise "see it on your wall".
export const HOME_UPLOAD_ENTRY_BODY = "Send us your art or logo — we'll show it on your wall at your estimate.";

// Specs band.
export const HOME_SPECS = [
  { value: "1200 DPI", label: "photo-sharp detail" },
  { value: "Dries instantly", label: "no cure time" },
  { value: "0 seams", label: "one continuous print" },
  { value: "~1 day", label: "typical install" }
] as const;

// Comparison table. LAUNCH GATE numbers are flagged at the call site in the
// homepage component.
export const HOME_COMPARISON_HEADING = "Wall printing vs. everything else";
export const HOME_COMPARISON_SUBHEAD =
  "Why Chicago homes and businesses are choosing direct-to-wall printing.";
export const HOME_COMPARISON_COLUMNS = ["Wall Print Pro", "Vinyl wrap", "Hand-painted"] as const;

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
    feature: "Seams & peeling over time",
    wallPrintPro: "None",
    vinylWrap: "Common",
    handPainted: "None"
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
  },
  {
    feature: "Typical starting price",
    wallPrintPro: "$600",
    vinylWrap: "$450+",
    handPainted: "$2,500+",
    needsClientVerification: true
  }
] as const;

// Testimonial — clearly a placeholder needing a real quote from the client.
export const HOME_TESTIMONIAL = {
  quote:
    "They showed me the mural on my own wall from my phone before I paid a cent. Sold.",
  attribution: "PLACEHOLDER — replace with a real, attributed Chicago client quote before launch.",
  needsClientQuote: true
} as const;

// Dark reserve strip.
export const HOME_RESERVE_STRIP_HEADLINE = "Reserve your spot — $100, credited to your print.";
export const HOME_RESERVE_STRIP_BODY =
  "Lock a print-job slot for your wall. Your $100 deposit is credited toward the final print price — it never buys artwork.";
export const HOME_RESERVE_STRIP_CTA = "Reserve now";

// Sections.
export const HOME_WORK_HEADING = "Recent Chicago wall prints";
export const HOME_WORK_SUBHEAD = "Real installs, filmed and photographed on real Chicago walls.";
export const HOME_PORTFOLIO_TEASER_CTA = "See our Chicago work";

// Process steps.
export const HOME_PROCESS_HEADING = "From idea to installed in three steps.";
export const HOME_PROCESS_STEPS = [
  {
    title: "Bring the art",
    body: "Choose a starting design, upload a logo or artwork file, or describe a custom wall-print idea."
  },
  {
    title: "See it on your wall",
    body: "Preview the print on your actual wall in AR from your phone, and we confirm it prints sharp at wall scale."
  },
  {
    title: "We print & install",
    body: "We print at 1200 DPI and install it seam-free on your Chicago wall — usually in about a day."
  }
] as const;

// Footer.
export const HOME_FOOTER_TAGLINE = "Custom wall printing in Chicago — murals and prints on your actual walls.";
