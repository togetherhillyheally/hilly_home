import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import { adminList } from "@/lib/admin-rest";

export const dynamic = "force-dynamic";

type Response = {
  survey_slug: string;
  user_id: string | null;
  submitted_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SurveysPage() {
  const { rows, total } = await adminList<Response>(
    "survey_responses?select=survey_slug,user_id,submitted_at&order=submitted_at.desc",
    { from: 0, to: 4999, count: true }
  );

  type Group = {
    slug: string;
    count: number;
    latest: string;
    uniqueUsers: Set<string>;
  };
  const groups = new Map<string, Group>();
  rows.forEach((r) => {
    const cur = groups.get(r.survey_slug) ?? {
      slug: r.survey_slug,
      count: 0,
      latest: r.submitted_at,
      uniqueUsers: new Set<string>(),
    };
    cur.count += 1;
    if (
      new Date(r.submitted_at).getTime() > new Date(cur.latest).getTime()
    ) {
      cur.latest = r.submitted_at;
    }
    if (r.user_id) cur.uniqueUsers.add(r.user_id);
    groups.set(r.survey_slug, cur);
  });

  const groupArr = Array.from(groups.values()).sort(
    (a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime()
  );

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          설문 응답
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          설문 {groupArr.length}개 · 응답 {total.toLocaleString()}건
        </p>
      </header>

      {groupArr.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          수집된 응답이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupArr.map((g) => (
            <Link
              key={g.slug}
              href={`/survey/${g.slug}/admin`}
              className="group rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-colors p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="h-5 w-5 text-orange-300" />
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-white" />
              </div>
              <div className="text-sm text-gray-500 mb-1">설문 슬러그</div>
              <h2 className="text-base font-semibold text-white truncate mb-4">
                {g.slug}
              </h2>

              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-gray-500">응답 수</dt>
                  <dd className="text-white text-lg font-bold mt-0.5">
                    {g.count.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">고유 응답자</dt>
                  <dd className="text-white text-lg font-bold mt-0.5">
                    {g.uniqueUsers.size.toLocaleString()}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-gray-500">
                최근 응답 · {formatDate(g.latest)}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5 text-xs text-gray-400">
        <p className="mb-1.5 text-white">상세 응답 보기</p>
        <p>
          각 설문 카드를 클릭하면{" "}
          <code className="px-1 py-0.5 rounded bg-white/[0.06] text-gray-300">
            /survey/[slug]/admin
          </code>{" "}
          페이지로 이동합니다. 이 페이지는 별도의 관리자 키(`SURVEY_ADMIN_KEY`)로
          보호됩니다.
        </p>
      </div>
    </main>
  );
}
