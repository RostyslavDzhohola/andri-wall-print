import { NextResponse } from "next/server";

export const PRIVATE_API_CACHE_CONTROL = "no-store";

export function noStoreJson<T>(body: T, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", PRIVATE_API_CACHE_CONTROL);

  return NextResponse.json(body, {
    ...init,
    headers
  });
}
