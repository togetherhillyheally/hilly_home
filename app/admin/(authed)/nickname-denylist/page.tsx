import { adminList } from "@/lib/admin-rest";
import { DenyCreate, DenyRowActions, type DenyRow } from "./DenyEditor";

export const dynamic = "force-dynamic";

const MATCH_LABEL: Record<string, string> = {
  exact: "정확히 일치",
  contains: "포함",
};

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

export default async function NicknameDenylistPage() {
  const { rows, total } = await adminList<DenyRow>(
    "nickname_denylist?select=*&order=created_at.desc",
    { from: 0, to: 499, count: true }
  );

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            닉네임 차단
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            일반 유저가 등록·수정할 수 없는 닉네임 목록 · 총 {total.toLocaleString()}개
            <br />
            <span className="text-gray-500">
              슈퍼 관리자(master) 는 이 목록에 상관없이 사용 가능합니다. 대소문자 무시.
            </span>
          </p>
        </div>
        <DenyCreate />
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          차단된 닉네임이 없어요. 우측 상단에서 추가해보세요.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      r.match_type === "exact"
                        ? "bg-orange-500/15 text-orange-300"
                        : "bg-violet-500/15 text-violet-300"
                    }`}
                  >
                    {MATCH_LABEL[r.match_type] ?? r.match_type}
                  </span>
                  <span className="text-sm font-semibold text-white break-all">
                    {r.pattern}
                  </span>
                </div>
                {r.note ? (
                  <p className="text-xs text-gray-400 mt-0.5">{r.note}</p>
                ) : null}
                <p className="text-[11px] text-gray-500 mt-1">
                  등록 {formatDate(r.created_at)}
                </p>
              </div>
              <DenyRowActions row={r} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
