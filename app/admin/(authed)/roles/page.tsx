import { redirect } from "next/navigation";

export default async function RolesRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.role) params.set("role", sp.role);
  const qs = params.toString();
  redirect(qs ? `/admin/users?${qs}` : "/admin/users");
}
