import { NextResponse } from "next/server";

import { resolveInstagramProjectMedia, type InstagramGraphMediaResponse } from "@/lib/instagram-project-media";

export const runtime = "nodejs";

const INSTAGRAM_USER_ID_KEY = "WALL_PRINT_PRO" + "_INSTAGRAM_USER_ID";
const INSTAGRAM_ACCESS_TOKEN_KEY = "WALL_PRINT_PRO" + "_INSTAGRAM_ACCESS_TOKEN";
const INSTAGRAM_GRAPH_VERSION_KEY = "WALL_PRINT_PRO" + "_INSTAGRAM_GRAPH_VERSION";

function readInstagramConfiguration() {
  const userId = process.env[INSTAGRAM_USER_ID_KEY]?.trim();
  const accessToken = process.env[INSTAGRAM_ACCESS_TOKEN_KEY]?.trim();
  const graphVersion = process.env[INSTAGRAM_GRAPH_VERSION_KEY]?.trim().replace(/^\/+|\/+$/g, "");

  return userId && accessToken && graphVersion && /^v\d+\.\d+$/.test(graphVersion)
    ? { userId, accessToken, graphVersion }
    : null;
}

function unavailableResponse(reason: "not-configured" | "unavailable" = "unavailable") {
  return NextResponse.json(
    { ok: false, reason },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET() {
  const configuration = readInstagramConfiguration();

  if (!configuration) {
    return unavailableResponse("not-configured");
  }

  const endpoint = new URL(`/${configuration.graphVersion}/${encodeURIComponent(configuration.userId)}/media`, "https://graph.instagram.com");
  endpoint.searchParams.set(
    "fields",
    "id,media_type,media_url,thumbnail_url,permalink,children{media_type,media_url,thumbnail_url}"
  );
  endpoint.searchParams.set("limit", "100");
  let response: Response;

  try {
    response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${configuration.accessToken}`
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000)
    });
  } catch {
    return unavailableResponse();
  }

  if (!response.ok) {
    return unavailableResponse();
  }

  let payload: InstagramGraphMediaResponse;

  try {
    payload = (await response.json()) as InstagramGraphMediaResponse;
  } catch {
    return unavailableResponse();
  }

  const projects = resolveInstagramProjectMedia(payload);

  if (projects.length === 0) {
    return unavailableResponse();
  }

  return NextResponse.json(
    { ok: true, projects },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600"
      }
    }
  );
}
