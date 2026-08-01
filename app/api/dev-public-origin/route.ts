import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type NgrokTunnel = {
  public_url?: unknown;
  proto?: unknown;
};

function configuredClientPreviewOrigin() {
  const value =
    process.env.NEXT_PUBLIC_CLIENT_PREVIEW_BASE_URL ??
    process.env.NEXT_PUBLIC_PUBLIC_PREVIEW_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL;

  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function publicOriginFromTunnel(tunnel: NgrokTunnel) {
  if (tunnel.proto !== "https" || typeof tunnel.public_url !== "string") {
    return null;
  }

  try {
    return new URL(tunnel.public_url).origin;
  } catch {
    return null;
  }
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  const configuredOrigin = configuredClientPreviewOrigin();

  if (configuredOrigin) {
    return NextResponse.json({ origin: configuredOrigin, source: "configured" });
  }

  try {
    const response = await fetch("http://127.0.0.1:4040/api/tunnels", { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json({ origin: null, source: "none" });
    }

    const payload = (await response.json()) as { tunnels?: NgrokTunnel[] };
    const origin = payload.tunnels?.map(publicOriginFromTunnel).find((value): value is string => Boolean(value)) ?? null;

    return NextResponse.json({ origin, source: origin ? "ngrok" : "none" });
  } catch {
    return NextResponse.json({ origin: null, source: "none" });
  }
}
