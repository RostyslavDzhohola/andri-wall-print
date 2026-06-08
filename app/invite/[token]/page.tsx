import { BuilderSetupMissing as InviteSetupMissing, BuilderSurface as InviteSurface } from "@/components/builder/builder-surface";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <InviteSetupMissing />;
  }

  return <InviteSurface token={token} />;
}
