import { redirect } from "next/navigation";

export default function DashboardSlugRoot({ params }: { params: { slug: string } }) {
  redirect(`/dashboard/${params.slug}/overview`);
}
