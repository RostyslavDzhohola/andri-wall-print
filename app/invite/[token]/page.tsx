import { BuilderSetupMissing as InviteSetupMissing, BuilderSurface as InviteSurface } from "@/components/builder/builder-surface";
import { readConvexRuntimeUrl } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  if (!readConvexRuntimeUrl()) {
    return <InviteSetupMissing />;
  }

  return <InviteSurface token={token} />;
}
