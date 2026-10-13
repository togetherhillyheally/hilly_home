import { NextResponse } from "next/server";
import { hasMenuAccess, readAdminSession } from "@/lib/admin-session";
import { adminList } from "@/lib/admin-rest";
import {
  buildClaimsParams,
  formatKst,
  parseClaimFilters,
  KIND_LABELS,
  type ClaimRow,
} from "@/lib/treasure-claims";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 5000;

/** 보물찾기 획득자 명단 CSV — 목록 페이지와 같은 필터(kind/q/trail/from/to). 엑셀용 BOM 포함 */
export async function GET(req: Request) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasMenuAccess(session, "treasures")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const url = new URL(req.url);
  const sp: Record<string, string | undefined> = {};
  url.searchParams.forEach((v, k) => {
    sp[k] = v;
  });
  const filters = parseClaimFilters(sp);
  const params = buildClaimsParams(filters);

  const { rows } = await adminList<ClaimRow>(`session_treasures?${params.toString()}`, {
    from: 0,
    to: MAX_ROWS - 1,
  });

  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    "획득시각(KST)",
    "닉네임",
    "전화번호",
    "보상종류",
    "보상",
    "씨앗수",
    "보물번호",
    "보물지도",
    "세션제목",
    "세션유형",
    "세션시작(KST)",
    "세션ID",
    "회원ID",
    "보물ID",
  ];
  const lines = rows.map((r) =>
    [
      formatKst(r.claimed_at),
      r.claimer?.nickname ?? "",
      r.claimer?.phone_number ?? "",
      KIND_LABELS[r.reward_kind] ?? r.reward_kind,
      r.reward_label,
      r.reward_kind === "seed" ? r.reward_value : "",
      r.seq + 1,
      r.hiking_sessions?.trails?.name ?? "",
      r.hiking_sessions?.title ?? "",
      r.hiking_sessions?.is_solo ? "혼자" : "함께",
      formatKst(r.hiking_sessions?.started_at ?? null),
      r.session_id,
      r.claimer?.id ?? "",
      r.id,
    ]
      .map(esc)
      .join(",")
  );
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  const kindTag = filters.kind === "all" ? "all" : filters.kind;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="treasure-claims-${kindTag}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
