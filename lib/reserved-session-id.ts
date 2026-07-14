export const RESERVED_SESSION_ID_MAX_LENGTH = 255;

const RESERVED_SESSION_ID_ALLOWED_CHARS = /^[A-Za-z0-9_]+$/;

export function normalizeReservedSessionId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const sessionId = value.trim().slice(0, RESERVED_SESSION_ID_MAX_LENGTH);

  if (!sessionId || !RESERVED_SESSION_ID_ALLOWED_CHARS.test(sessionId)) {
    return null;
  }

  return sessionId;
}
