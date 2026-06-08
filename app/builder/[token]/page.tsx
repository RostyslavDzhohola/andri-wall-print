import { redirect } from "next/navigation";

type LegacyBuilderPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function LegacyBuilderPage({ params }: LegacyBuilderPageProps) {
  const { token } = await params;

  redirect(`/invite/${token}`);
}
