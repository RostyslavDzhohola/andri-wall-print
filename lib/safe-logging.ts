const SAFE_ERROR_NAME = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;

export function safeErrorName(error: unknown) {
  if (error instanceof Error && SAFE_ERROR_NAME.test(error.name)) {
    return error.name;
  }

  return "UnknownError";
}
