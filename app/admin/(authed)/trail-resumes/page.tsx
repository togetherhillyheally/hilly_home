import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import type { TrailResumeRow } from "@/lib/trail-resume";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TrailResumesPage() {
  const { rows, total } = await adminList<TrailResumeRow>(
    "trail_resumes?select=id,name,phone,email,submitted_at,trail_experiences&order=submitted_at.desc",
    { from: 0, to: 999, count: true }
  );

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          트레일 이력서
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          동서트레일 조사 제출본 · 총 {total.toLocaleString()}건 ·{" "}
          <Link
            href="/trail-resume"
            target="_blank"
            className="text-orange-300 hover:text-orange-200"
          >
            제출 폼 열기 ↗
          </Link>
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          제출된 이력서가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-white/[0.03] text-gray-200 text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">이름</th>
                <th className="text-left px-4 py-3 font-semibold">휴대전화</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-center px-3 py-3 font-semibold">
                  경력 수
                </th>
                <th className="text-left px-4 py-3 font-semibold">제출 시각</th>
                <th className="text-right px-3 py-3 font-semibold w-12"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const expCount = Array.isArray(r.trail_experiences)
                  ? r.trail_experiences.length
                  : 0;
                return (
                  <tr
                    key={r.id}
                    className="border-t border-white/5 hover:bg-white/[0.04] group"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/trail-resumes/${r.id}`}
                        className="text-white hover:text-orange-300"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      {r.phone ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      {r.email ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-gray-300">
                      {expCount}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap tabular-nums">
                      {formatDate(r.submitted_at)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/admin/trail-resumes/${r.id}`}
                        className="inline-flex text-gray-500 group-hover:text-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
