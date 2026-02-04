import { redirect } from "next/navigation";

export default function AdminTripRedirect({ params }: { params: { id: string } }) {
  redirect(`/admin/trips/${params.id}/overview`);
}
