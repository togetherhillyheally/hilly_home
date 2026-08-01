import { adminList } from "@/lib/admin-rest";
import { QuizCreate, QuizRowActions, type QuizRow } from "./QuizEditor";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  trivia: "상식",
  dadjoke: "아재개그",
  outdoor: "아웃도어",
};

export default async function QuizPoolPage() {
  const { rows, total } = await adminList<QuizRow>(
    "quiz_pool?select=*&order=category.asc,created_at.desc",
    { from: 0, to: 499, count: true }
  );

  const activeCount = rows.filter((r) => r.is_active).length;

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            자동 퀴즈 풀
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            스탬프 &quot;자동 퀴즈&quot; 포인트에서 도착 시 랜덤 출제 · 총{" "}
            {total.toLocaleString()}개 (활성 {activeCount}) · 수학은 앱에서 자동
            생성
          </p>
        </div>
        <QuizCreate />
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          등록된 퀴즈가 없습니다. 우측 상단에서 추가해보세요.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-300">
                    {CATEGORY_LABEL[r.category] ?? r.category}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {r.question}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.choices.map((c, i) => (
                    <span
                      key={i}
                      className={`rounded-md px-2 py-0.5 text-xs ${
                        i === r.answer_index
                          ? "bg-emerald-500/15 text-emerald-300 font-semibold"
                          : "bg-white/5 text-gray-400"
                      }`}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <QuizRowActions row={r} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
