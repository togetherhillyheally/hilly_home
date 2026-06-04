import { redirect } from "next/navigation";
import { readAdminSession } from "@/lib/admin-session";
import AdminLoginForm from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await readAdminSession();
  if (session) redirect("/admin/dashboard");

  return (
    <main className="container mx-auto px-4 py-20">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">관리자 로그인</h1>
        <p className="text-sm text-gray-400 mb-8">
          등록된 관리자 휴대폰 번호로만 로그인할 수 있어요.
        </p>
        <AdminLoginForm />
      </div>
    </main>
  );
}
