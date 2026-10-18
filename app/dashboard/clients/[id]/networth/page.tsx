import { redirect } from "next/navigation";

export default async function NetWorthAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/clients/${id}/net-worth`);
}

