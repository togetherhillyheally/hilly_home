import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readAdminSession } from "@/lib/admin-session";
import AdminSidebar from "./AdminSidebar";
import BadgeCount from "./BadgeCount";

export const dynamic = "force-dynamic";

export default async function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readAdminSession();
  if (!session) redirect("/admin");

  return (
    <div className="min-h-screen">
      <AdminSidebar
        allowedMenuKeys={Array.from(session.menuKeys)}
        session={{
          nickname: session.nickname,
          phoneNumber: session.phoneNumber,
        }}
        badgeSlots={{
          pendingDeletions: (
            <Suspense fallback={null}>
              <BadgeCount query="account_deletion_requests?select=id&status=eq.pending" />
            </Suspense>
          ),
          pendingReports: (
            <Suspense fallback={null}>
              <BadgeCount query="content_reports?select=id&resolved=eq.false" />
            </Suspense>
          ),
        }}
      />
      <div className="lg:pl-64 min-w-0">{children}</div>
    </div>
  );
}
