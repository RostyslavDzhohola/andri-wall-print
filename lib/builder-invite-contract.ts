export const BUILDER_INVITE_DEFAULT_EXPIRY_DAYS = 14;
export const BUILDER_INVITE_MAX_GENERATIONS = 5;
export const BUILDER_INVITE_MAX_UPLOAD_STARTS = 10;
export const BUILDER_INVITE_TOKEN_BYTES = 24;

export type BuilderInviteStatus = "valid" | "expired" | "revoked" | "not_found";

export type BuilderInviteLike = {
  expiresAt: number;
  generatedCount: number;
  maxGenerations: number;
  uploadStartedCount: number;
  maxUploadStarts: number;
  revokedAt?: number;
};

export type BuilderInviteAccess =
  | {
      status: "valid";
      remainingGenerations: number;
      remainingUploadStarts: number;
      expiresAt: number;
    }
  | {
      status: Exclude<BuilderInviteStatus, "valid">;
      remainingGenerations: 0;
      remainingUploadStarts: 0;
      expiresAt: number | null;
    };

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getDefaultBuilderInviteExpiresAt(now = Date.now()) {
  return now + BUILDER_INVITE_DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
}

export function createBuilderInviteToken(randomBytes?: Uint8Array) {
  const bytes = randomBytes ?? crypto.getRandomValues(new Uint8Array(BUILDER_INVITE_TOKEN_BYTES));

  if (bytes.length < BUILDER_INVITE_TOKEN_BYTES) {
    throw new Error("Invite token entropy is too short.");
  }

  return bytesToHex(bytes);
}

export function isBuilderInviteTokenShape(token: string) {
  return /^[a-f0-9]{48}$/i.test(token);
}

export async function hashBuilderInviteToken(token: string) {
  if (!crypto.subtle) {
    throw new Error("crypto.subtle is required to hash invite tokens.");
  }

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));

  return bytesToHex(new Uint8Array(digest));
}

export function getBuilderInviteAccess(invite: BuilderInviteLike | null | undefined, now = Date.now()): BuilderInviteAccess {
  if (!invite) {
    return {
      status: "not_found",
      remainingGenerations: 0,
      remainingUploadStarts: 0,
      expiresAt: null
    };
  }

  if (invite.revokedAt) {
    return {
      status: "revoked",
      remainingGenerations: 0,
      remainingUploadStarts: 0,
      expiresAt: invite.expiresAt
    };
  }

  if (invite.expiresAt <= now) {
    return {
      status: "expired",
      remainingGenerations: 0,
      remainingUploadStarts: 0,
      expiresAt: invite.expiresAt
    };
  }

  return {
    status: "valid",
    remainingGenerations: Math.max(0, invite.maxGenerations - invite.generatedCount),
    remainingUploadStarts: Math.max(0, invite.maxUploadStarts - invite.uploadStartedCount),
    expiresAt: invite.expiresAt
  };
}

export function canGenerateWithBuilderInvite(invite: BuilderInviteLike | null | undefined, now = Date.now()) {
  const access = getBuilderInviteAccess(invite, now);

  if (access.status !== "valid") {
    return {
      ok: false as const,
      code: access.status,
      message: builderInviteStatusMessage(access.status)
    };
  }

  if (access.remainingGenerations <= 0) {
    return {
      ok: false as const,
      code: "generation_limit_reached" as const,
      message: "This invite link has reached its preview link limit."
    };
  }

  return {
    ok: true as const,
    access
  };
}

export function canStartUploadWithBuilderInvite(invite: BuilderInviteLike | null | undefined, now = Date.now()) {
  const access = getBuilderInviteAccess(invite, now);

  if (access.status !== "valid") {
    return {
      ok: false as const,
      code: access.status,
      message: builderInviteStatusMessage(access.status)
    };
  }

  if (access.remainingUploadStarts <= 0) {
    return {
      ok: false as const,
      code: "upload_limit_reached" as const,
      message: "This invite link has reached its upload limit."
    };
  }

  return {
    ok: true as const,
    access
  };
}

export function builderInviteStatusMessage(status: BuilderInviteStatus) {
  if (status === "expired") {
    return "This invite link has expired.";
  }

  if (status === "revoked") {
    return "This invite link has been disabled.";
  }

  if (status === "not_found") {
    return "This invite link is not valid.";
  }

  return "This invite link is ready.";
}
