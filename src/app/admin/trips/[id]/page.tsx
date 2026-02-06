import { redirect } from "next/navigation";

export default async function AdminTripIndex({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const p = params instanceof Promise ? await params : params;
  const id = String(p?.id || "").trim();
  if (!id) redirect("/admin/trips");
  redirect(`/admin/trips/${encodeURIComponent(id)}/overview`);
}