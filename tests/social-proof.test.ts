import { describe, expect, it } from "vitest";

import { FACEBOOK_PROFILE_URL, INSTAGRAM_PROFILE_URL } from "@/lib/social-proof";

describe("social profile URLs", () => {
  it("keeps valid public Facebook and Instagram profile URLs for the site footer", () => {
    expect(FACEBOOK_PROFILE_URL).toMatch(/^https:\/\/(?:www\.)?facebook\.com\//);
    expect(INSTAGRAM_PROFILE_URL).toMatch(/^https:\/\/(?:www\.)?instagram\.com\//);
  });
});
