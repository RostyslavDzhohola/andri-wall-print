import { redirect } from "next/navigation";

type LegacySellerBundlePageProps = {
  params: Promise<{
    bundleId: string;
  }>;
};

export default async function LegacySellerBundlePage({ params }: LegacySellerBundlePageProps) {
  const { bundleId } = await params;

  redirect(`/admin/bundles/${bundleId}`);
}
