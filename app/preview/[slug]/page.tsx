import Link from "next/link";

import { NativeArSample } from "@/components/ar/native-ar-sample";
import { getPublicPreview } from "@/lib/convex-public-preview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicPreviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublicPreviewPage({ params }: PublicPreviewPageProps) {
  const { slug } = await params;
  const preview = await getPublicPreview(slug);

  if (preview.status === "ready") {
    return (
      <NativeArSample
        samples={[preview.sample]}
        heading={preview.sample.title}
        intro="Open native AR from this public preview link to check the print at its real wall size."
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-6 text-[#171717]">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-3xl place-items-center">
        <div className="grid gap-5 rounded-lg border border-[#d7d1c5] bg-[#fffdf8] p-6 shadow-[0_24px_70px_rgba(35,31,25,0.12)]">
          <div className="grid gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0px] text-[#6a665f]">Preview unavailable</p>
            <h1 className="text-3xl font-semibold tracking-[0px] md:text-5xl">This AR preview is not ready.</h1>
          </div>
          <p className="text-base leading-7 text-[#5f5c55]" data-testid="preview-unavailable-reason">
            {preview.reason}
          </p>
          <div className="rounded-lg border border-[#ded8cc] bg-[#f7f1e5] p-3 text-sm text-[#4f4a42]">
            Requested preview: <span className="font-semibold">{slug}</span>
          </div>
          <Link
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-[#1c4f59] px-5 py-2.5 text-sm font-semibold text-white"
            href="/"
          >
            Open sample gallery
          </Link>
        </div>
      </section>
    </main>
  );
}
