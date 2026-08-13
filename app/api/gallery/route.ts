import { getPublicGalleryPage } from "@/lib/convex-public-gallery";
import { noStoreJson } from "@/lib/private-api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cursor = new URL(request.url).searchParams.get("cursor")?.trim().slice(0, 500) || undefined;
  const page = await getPublicGalleryPage(cursor);

  return noStoreJson(page);
}
