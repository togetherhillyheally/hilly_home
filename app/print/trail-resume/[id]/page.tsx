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

/** 사진 URL 을 서버에서 fetch 해 data:image base64 로 반환. 실패 시 null (인쇄 preview 대기 방지). */
async function fetchPhotoDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    return `data:${contentType};base64,${b64}`;
  } catch {
    return null;
  }
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

  const exps: TrailExperience[] = Array.isArray(r.trail_experiences)
    ? r.trail_experiences
    : [];
  const photoData = await fetchPhotoDataUrl(r.photo_url);

  return (
    <>
      <style
        // 화면·인쇄 모두 이 스타일 우선 적용. body 를 흰색으로 덮음.
        dangerouslySetInnerHTML={{
          __html: `
            html, body { background: #ffffff !important; color: #111827 !important; }
            body { margin: 0; }
            @page { size: A4; margin: 20mm 18mm; }
            @media print {
              .no-print { display: none !important; }
            }
          `,
        }}
      />
      <div className="no-print bg-amber-50 border-b border-amber-200 px-8 py-3 text-xs text-amber-900">
        <strong>PDF 저장:</strong> ⌘+P (Mac) / Ctrl+P (Windows) → 대상을 &quot;PDF로 저장&quot; 선택.
      </div>

      <main className="mx-auto max-w-[210mm] px-8 py-10 print:p-0 text-[13px] leading-relaxed">
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
          {photoData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoData}
              alt=""
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

        {r.notes ? (
          <section className="mb-8">
            <ResumeRow label="추가 안내">
              <p className="pt-3 whitespace-pre-wrap text-gray-800">
                {r.notes}
              </p>
            </ResumeRow>
          </section>
        ) : null}
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
