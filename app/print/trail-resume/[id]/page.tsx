import { notFound } from "next/navigation";
import { adminList } from "@/lib/admin-rest";
import { readAdminSession } from "@/lib/admin-session";
import type { TrailExperience, TrailResumeRow } from "@/lib/trail-resume";

export const dynamic = "force-dynamic";

function formatPeriod(exp: TrailExperience): string {
  const from = exp.period_from || "";
  const to = exp.period_to || (exp.period_from ? "진행중" : "");
  if (!from && !to) return "";
  return `${from}${to ? ` ~ ${to}` : ""}`;
}

/** 트레일 경력 정렬 — 시작일 최신 순. 날짜 미기입은 맨 아래. */
function sortByDateDesc(exps: TrailExperience[]): TrailExperience[] {
  return [...exps].sort((a, b) => {
    const av = a.period_from?.trim() || "";
    const bv = b.period_from?.trim() || "";
    if (!av && !bv) return 0;
    if (!av) return 1;
    if (!bv) return -1;
    return bv.localeCompare(av);
  });
}

/**
 * A4 인쇄용 뷰. 흰 배경 + 검정 텍스트 + 인쇄 CSS.
 * 페이지 진입 시 자동으로 브라우저 인쇄 대화상자 오픈 (PDF 저장).
 */
export default async function TrailResumePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 어드민 세션 없으면 404 (URL 노출 방지)
  const session = await readAdminSession();
  if (!session) notFound();

  const { id } = await params;
  const { rows } = await adminList<TrailResumeRow>(
    `trail_resumes?id=eq.${id}&select=*&limit=1`
  );
  const r = rows[0];
  if (!r) notFound();

  const exps: TrailExperience[] = sortByDateDesc(
    Array.isArray(r.trail_experiences) ? r.trail_experiences : []
  );

  return (
    <>
      <style
        // 화면에서는 A4 시트가 회색 배경 위에 떠 있는 프리뷰 모드,
        // 인쇄에서는 회색 배경/그림자 제거하고 순수 A4 흰 페이지만 남김.
        dangerouslySetInnerHTML={{
          __html: `
            html, body { background: #f3f4f6; color: #111827; margin: 0; }
            @page { size: A4; margin: 20mm 18mm; }
            @media print {
              html, body { background: #ffffff !important; }
              .no-print { display: none !important; }
              .a4-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: 0 !important; padding: 0 !important; }
            }
          `,
        }}
      />
      <main
        className="a4-sheet mx-auto my-8 bg-white shadow-lg text-[13px] leading-relaxed"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "20mm 18mm",
        }}
      >
        {/* 헤더 — 제목 + 사진 */}
        <header className="flex items-start justify-between gap-6 pb-6 mb-6 border-b-2 border-gray-800">
          <div>
            <div className="text-[28px] font-light text-gray-400 leading-none mb-1">
              이력서
            </div>
            <div className="text-[36px] font-bold text-gray-900 leading-tight">
              {r.name}
            </div>
          </div>
          {r.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r.photo_url}
              alt=""
              width={90}
              height={120}
              loading="eager"
              decoding="sync"
              className="w-[90px] h-[120px] object-cover border border-gray-300"
            />
          ) : null}
        </header>

        {/* 인적사항 */}
        <section className="mb-8">
          <ResumeRow label="인적사항">
            <table className="w-full text-[12.5px] border-t border-gray-300">
              <tbody>
                <ResumeCell label="성명" value={r.name} />
                {r.resident_number ? (
                  <ResumeCell label="주민번호" value={r.resident_number} />
                ) : null}
                {r.address ? (
                  <ResumeCell label="주소" value={r.address} />
                ) : null}
                {r.phone ? (
                  <ResumeCell label="휴대전화" value={r.phone} />
                ) : null}
                {r.email ? (
                  <ResumeCell label="Email" value={r.email} />
                ) : null}
              </tbody>
            </table>
          </ResumeRow>
        </section>

        {/* 트레일 경력 */}
        <section className="mb-8">
          <ResumeRow label="트레일 경력">
            {exps.length === 0 ? (
              <p className="text-gray-500 pt-3">기재된 경력이 없습니다.</p>
            ) : (
              <div className="border-t border-gray-300">
                {exps.map((e, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[140px_1fr] py-4 border-b border-gray-200"
                  >
                    <div className="font-mono text-gray-600 tabular-nums pt-0.5">
                      {formatPeriod(e) || "-"}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">
                        {e.title || "-"}
                      </div>
                      {e.description ? (
                        <div className="text-gray-700 whitespace-pre-wrap">
                          {e.description}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ResumeRow>
        </section>

      </main>
    </>
  );
}

function ResumeRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-6">
      <div className="text-[13px] font-bold text-gray-800 pt-3">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function ResumeCell({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-gray-200">
      <td className="w-[100px] py-2 text-gray-600 align-top">{label}</td>
      <td className="py-2 text-gray-900 break-words">{value}</td>
    </tr>
  );
}
