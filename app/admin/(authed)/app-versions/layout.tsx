import { requireMenuSession } from "@/lib/admin-session";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMenuSession("app-versions");
  return <>{children}</>;
}
