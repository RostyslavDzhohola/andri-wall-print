import { describe, expect, it } from "vitest";

import {
  BUILDER_INVITE_DEFAULT_EXPIRY_DAYS,
  BUILDER_INVITE_MAX_GENERATIONS,
  BUILDER_INVITE_MAX_UPLOAD_STARTS,
  type BuilderInviteLike,
  builderInviteStatusMessage,
  canGenerateWithBuilderInvite,
  canStartUploadWithBuilderInvite,
  createBuilderInviteToken,
  getBuilderInviteAccess,
  getDefaultBuilderInviteExpiresAt,
  hashBuilderInviteToken,
  isBuilderInviteTokenShape
} from "@/lib/builder-invite-contract";

const NOW = Date.UTC(2026, 5, 8);

function invite(overrides: Partial<BuilderInviteLike> = {}): BuilderInviteLike {
  return {
    expiresAt: NOW + 1000,
    generatedCount: 0,
    maxGenerations: BUILDER_INVITE_MAX_GENERATIONS,
    uploadStartedCount: 0,
    maxUploadStarts: BUILDER_INVITE_MAX_UPLOAD_STARTS,
    ...overrides
  };
}

describe("builder invite contract", () => {
  it("creates a one-time token shape and hashes without storing the raw token", async () => {
    const token = createBuilderInviteToken(new Uint8Array(24).fill(7));

    expect(token).toHaveLength(48);
    expect(isBuilderInviteTokenShape(token)).toBe(true);
    expect(await hashBuilderInviteToken(token)).toMatch(/^[a-f0-9]{64}$/);
    await expect(hashBuilderInviteToken(token)).resolves.toBe(await hashBuilderInviteToken(token));
  });

  it("defaults builder invite links to fourteen days", () => {
    expect(getDefaultBuilderInviteExpiresAt(NOW)).toBe(NOW + BUILDER_INVITE_DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  });

  it("reports expired and revoked invites before allowing generation", () => {
    expect(getBuilderInviteAccess(invite({ expiresAt: NOW }), NOW)).toMatchObject({
      status: "expired",
      remainingGenerations: 0
    });
    expect(canGenerateWithBuilderInvite(invite({ expiresAt: NOW }), NOW)).toEqual({
      ok: false,
      code: "expired",
      message: "This invite link has expired."
    });

    expect(getBuilderInviteAccess(invite({ revokedAt: NOW - 1 }), NOW)).toMatchObject({
      status: "revoked",
      remainingUploadStarts: 0
    });
    expect(builderInviteStatusMessage("revoked")).toBe("This invite link has been disabled.");
  });

  it("enforces preview generation limits", () => {
    expect(canGenerateWithBuilderInvite(invite({ generatedCount: 4 }), NOW)).toMatchObject({
      ok: true
    });
    expect(canGenerateWithBuilderInvite(invite({ generatedCount: 5 }), NOW)).toEqual({
      ok: false,
      code: "generation_limit_reached",
      message: "This invite link has reached its preview link limit."
    });
  });

  it("enforces upload start limits separately from generation limits", () => {
    expect(canStartUploadWithBuilderInvite(invite({ uploadStartedCount: 9 }), NOW)).toMatchObject({
      ok: true
    });
    expect(canStartUploadWithBuilderInvite(invite({ uploadStartedCount: 10 }), NOW)).toEqual({
      ok: false,
      code: "upload_limit_reached",
      message: "This invite link has reached its upload limit."
    });
  });
});
