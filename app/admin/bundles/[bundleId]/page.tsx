import { BundleDetail } from "@/components/seller/bundle-detail";

type BundleDetailPageProps = {
  params: Promise<{
    bundleId: string;
  }>;
};

export default async function BundleDetailPage({ params }: BundleDetailPageProps) {
  const { bundleId } = await params;

  return <BundleDetail bundleId={bundleId} />;
}
