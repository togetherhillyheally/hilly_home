import { Search, Tent } from "lucide-react";
import { adminList, escapeIlike } from "@/lib/admin-rest";
import Pagination from "../Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Profile = {
  id: string;
  nickname: string | null;
  phone_number: string | null;
  created_at: string;
};

type CampRow = {
  user_id: string;
  is_active: boolean;
  name: string | null;
  status_message: string | null;
  placed_objects: unknown;
  slot_index: number;
  updated_at: string;
};

type InventoryRow = { user_id: string };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function placedCount(placed: unknown): number {
  if (Array.isArray(placed)) return placed.length;
  if (placed && typeof placed === "object")
    return Object.keys(placed as Record<string, unknown>).length;
  return 0;
}

export default async function UserCampsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const params = new URLSearchParams({
    select: "id,nickname,phone_number,created_at",
    order: "created_at.desc",
  });
  if (q) {
    const t = escapeIlike(q);
    params.set(
      "or",
      `(nickname.ilike.*${t}*,phone_number.ilike.*${t}*,email.ilike.*${t}*)`
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { rows: profiles, total } = await adminList<Profile>(
    `profiles?${params.toString()}`,
    { from, to, count: true }
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const userIds = profiles.map((p) => p.id);
  type AggregatedCamp = {
    activeSlot: CampRow | null;
    slotCount: number;
    latestUpdated: string | null;
  };
  const campMap = new Map<string, AggregatedCamp>();
  const invCountMap = new Map<string, number>();

  if (userIds.length > 0) {
    const inList = userIds.join(",");
    const [{ rows: camps }, { rows: invs }] = await Promise.all([
      adminList<CampRow>(
        `user_basecamp?select=user_id,is_active,name,status_message,placed_objects,slot_index,updated_at&user_id=in.(${inList})&order=user_id.asc,slot_index.asc`
      ),
      adminList<InventoryRow>(
        `user_basecamp_inventory?select=user_id&user_id=in.(${inList})`,
        { from: 0, to: 4999 }
      ),
    ]);

    camps.forEach((c) => {
      const cur = campMap.get(c.user_id) ?? {
        activeSlot: null,
        slotCount: 0,
        latestUpdated: null,
      };
      cur.slotCount += 1;
      if (c.is_active && !cur.activeSlot) cur.activeSlot = c;
      if (
        !cur.latestUpdated ||
        new Date(c.updated_at).getTime() >
          new Date(cur.latestUpdated).getTime()
      ) {
        cur.latestUpdated = c.updated_at;
      }
      campMap.set(c.user_id, cur);
    });

    invs.forEach((i) =>
      invCountMap.set(i.user_id, (invCountMap.get(i.user_id) ?? 0) + 1)
    );
  }

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          사용자 캠프
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          유저별 캠프 배치/인벤토리 요약 · 총 {total.toLocaleString()}명
        </p>
      </header>

      <form
        action="/admin/user-camps"
        method="get"
        className="mb-4 flex gap-2 max-w-md"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            name="q"
            type="text"
            placeholder="닉네임 / 휴대폰 / 이메일"
            defaultValue={q}
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
          />
        </div>
        <button
          type="submit"
          className="px-4 h-10 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm"
        >
          검색
        </button>
      </form>

      {profiles.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500">
          결과가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-white/[0.03] text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">유저</th>
                  <th className="text-left px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Tent className="h-3 w-3 text-orange-300" />
                      활성 캠프
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">상태메시지</th>
                  <th className="text-center px-4 py-3 font-medium">슬롯</th>
                  <th className="text-center px-4 py-3 font-medium">배치</th>
                  <th className="text-center px-4 py-3 font-medium">인벤토리</th>
                  <th className="text-left px-4 py-3 font-medium">마지막 수정</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => {
                  const camp = campMap.get(p.id);
                  const inv = invCountMap.get(p.id) ?? 0;
                  const placed = placedCount(
                    camp?.activeSlot?.placed_objects ?? null
                  );
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <div className="text-white">
                          {p.nickname ?? (
                            <span className="text-gray-600">(없음)</span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-gray-500">
                          {p.phone_number ?? ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {camp?.activeSlot ? (
                          <div className="text-white">
                            {camp.activeSlot.name ?? (
                              <span className="text-gray-500">
                                (이름 없음)
                              </span>
                            )}
                            <span className="ml-2 text-[10px] text-gray-500">
                              슬롯 #{camp.activeSlot.slot_index}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300 max-w-[220px]">
                        {camp?.activeSlot?.status_message ? (
                          <span className="truncate inline-block max-w-full align-bottom">
                            {camp.activeSlot.status_message}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-300">
                        {camp?.slotCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        <span
                          className={
                            placed > 0 ? "text-pink-200" : "text-gray-600"
                          }
                        >
                          {placed}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        <span
                          className={
                            inv > 0 ? "text-orange-200" : "text-gray-600"
                          }
                        >
                          {inv}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {camp?.latestUpdated
                          ? formatDate(camp.latestUpdated)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        basePath="/admin/user-camps"
        page={page}
        totalPages={totalPages}
        query={{ q: q || undefined }}
      />
    </main>
  );
}
