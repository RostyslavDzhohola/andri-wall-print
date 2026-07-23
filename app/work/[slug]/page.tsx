import { redirect } from "next/navigation";

type LegacyWorkJobPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyWorkJobPage(
  _props: LegacyWorkJobPageProps,
) {
  redirect("/work");
}
