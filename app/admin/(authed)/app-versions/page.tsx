import { adminList } from "@/lib/admin-rest";
import AppVersionCard, { type AppVersion } from "./AppVersionCard";

export const dynamic = "force-dynamic";

export default async function AppVersionsPage() {
  const { rows } = await adminList<AppVersion>(
    "app_versions?select=*&order=platform.asc"
  );

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          앱 버전
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          iOS / Android 버전 정책과 강제 업데이트를 설정합니다.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          등록된 플랫폼이 없습니다.
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {rows.map((v) => (
            <AppVersionCard key={v.id} version={v} />
          ))}
        </div>
      )}
    </main>
  );
}
