import { describe, expect, it } from "vitest";

import { parseHomepageArtworkPostBody } from "@/lib/homepage-artwork-contract";

const validCreateBody = {
  action: "create" as const,
  input: {
    sourceStorageId: "storage-id",
    originalFileName: "prepared.png",
    contentType: "image/png" as const,
    byteLength: 1_024,
    sourceFingerprint: "a".repeat(64),
    title: "  Lobby   artwork  ",
    print: {
      aspectRatio: "5:4",
      widthMeters: 1.524,
      heightMeters: 1.2192,
      label: "attacker-controlled label"
    }
  }
};

describe("homepage artwork API contract", () => {
  it("accepts only known actions and strict create fields", () => {
    expect(parseHomepageArtworkPostBody({ action: "upload_url" })).toEqual({ action: "upload_url" });
    expect(parseHomepageArtworkPostBody({ action: "delete" })).toBeNull();
    expect(parseHomepageArtworkPostBody({ ...validCreateBody, unexpected: true })).toBeNull();
    expect(parseHomepageArtworkPostBody({ action: "create", input: null })).toBeNull();
  });

  it("validates upload metadata and replaces client display labels with canonical dimensions", () => {
    const parsed = parseHomepageArtworkPostBody(validCreateBody);

    expect(parsed).toMatchObject({
      action: "create",
      input: {
        title: "Lobby artwork",
        contentType: "image/png",
        byteLength: 1_024,
        print: { label: "5 ft x 4 ft" }
      }
    });
    expect(parseHomepageArtworkPostBody({
      ...validCreateBody,
      input: { ...validCreateBody.input, sourceFingerprint: "not-a-sha256" }
    })).toBeNull();
    expect(parseHomepageArtworkPostBody({
      ...validCreateBody,
      input: { ...validCreateBody.input, contentType: "text/html" }
    })).toBeNull();
  });
});
