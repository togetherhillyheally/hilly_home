import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import type { TrailExperience, TrailResumeRow } from "@/lib/trail-resume";

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

function formatPeriod(exp: TrailExperience): string {
  const from = exp.period_from || "";
  const to = exp.period_to || (exp.period_from ? "진행중" : "");
  if (!from && !to) return "";
  return `${from}${to ? ` ~ ${to}` : ""}`;
}

export default async function TrailResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { rows } = await adminList<TrailResumeRow>(
    `trail_resumes?id=eq.${id}&select=*&limit=1`
  );
  const r = rows[0];
  if (!r) notFound();

  const exps: TrailExperience[] = Array.isArray(r.trail_experiences)
    ? r.trail_experiences
    : [];

  return (
    <main className="p-6 lg:p-10">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/admin/trail-resumes"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> 이력서 목록
        </Link>
        <Link
          href={`/print/trail-resume/${r.id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/90 hover:bg-orange-500 px-3.5 h-9 text-sm font-semibold text-white"
        >
          <Printer className="h-4 w-4" /> 인쇄 / PDF 저장
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 lg:p-8 max-w-3xl">
        <div className="flex items-start gap-6 mb-8">
          {r.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r.photo_url}
              alt=""
              className="w-28 h-36 rounded-lg object-cover bg-white/[0.04]"
            />
          ) : (
            <div className="w-28 h-36 rounded-lg bg-white/[0.04] flex items-center justify-center text-xs text-gray-600">
              사진 없음
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              {r.name}
            </h1>
            <p className="text-[11px] text-gray-500 mb-3">
              제출 {formatDate(r.submitted_at)}
            </p>
            <dl className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-gray-400">주민번호</dt>
              <dd className="text-gray-100">
                {r.resident_number ?? <span className="text-gray-600">—</span>}
              </dd>
              <dt className="text-gray-400">주소</dt>
              <dd className="text-gray-100 break-words">
                {r.address ?? <span className="text-gray-600">—</span>}
              </dd>
              <dt className="text-gray-400">휴대전화</dt>
              <dd className="text-gray-100">
                {r.phone ?? <span className="text-gray-600">—</span>}
              </dd>
              <dt className="text-gray-400">Email</dt>
              <dd className="text-gray-100 break-all">
                {r.email ?? <span className="text-gray-600">—</span>}
              </dd>
            </dl>
          </div>
        </div>

        <section className="pt-6 border-t border-white/5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">
            트레일 경력 ({exps.length}건)
          </h2>
          {exps.length === 0 ? (
            <p className="text-sm text-gray-500">기재된 경력이 없습니다.</p>
          ) : (
            <ul className="space-y-4">
              {exps.map((e, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="text-[11px] text-gray-500 font-mono mb-1">
                    {formatPeriod(e) || "기간 미기입"}
                  </div>
                  <div className="text-sm font-semibold text-white mb-1.5">
                    {e.title || "(제목 없음)"}
                  </div>
                  {e.description ? (
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {e.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {r.notes ? (
          <section className="pt-6 mt-6 border-t border-white/5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">
              추가 안내
            </h2>
            <p className="text-sm text-gray-200 whitespace-pre-wrap">
              {r.notes}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
