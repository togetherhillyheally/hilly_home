import { redirect } from "next/navigation";
import { readAdminSession } from "@/lib/admin-session";
import AdminSidebar from "./AdminSidebar";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fetchCount(path: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
    cache: "no-store",
  });
  const range = res.headers.get("content-range");
  if (!range) return 0;
  const total = range.split("/")[1];
  return Number(total) || 0;
}

export default async function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readAdminSession();
  if (!session) redirect("/admin");

  const [pendingDeletions, pendingReports] = await Promise.all([
    fetchCount("account_deletion_requests?select=id&status=eq.pending"),
    fetchCount("content_reports?select=id&resolved=eq.false"),
  ]);

  return (
    <div className="min-h-screen">
      <AdminSidebar
        session={{
          nickname: session.nickname,
          phoneNumber: session.phoneNumber,
        }}
        badges={{ pendingDeletions, pendingReports }}
      />
      <div className="lg:pl-64 min-w-0">{children}</div>
    </div>
  );
}
