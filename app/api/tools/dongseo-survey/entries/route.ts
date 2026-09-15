import { NextRequest, NextResponse } from "next/server";
import { readToolSession } from "@/lib/tool-session";
import { adminFetch } from "@/lib/admin-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EntryPayload = {
  id: string; // client-generated uuid
  segment: string;
  itemKey: string;
  seq: number;
  kind: "point" | "range_start" | "range_end";
  label: string;
  investigator: string;
  clientTs?: string;
};

function isUuid(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}

function isKind(v: unknown): v is EntryPayload["kind"] {
  return v === "point" || v === "range_start" || v === "range_end";
}

export async function POST(req: NextRequest) {
  const session = await readToolSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const raw = (body as { entries?: unknown }).entries;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 100) {
    return NextResponse.json({ error: "entries 필요" }, { status: 400 });
  }

  const rows: Record<string, unknown>[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      return NextResponse.json({ error: "잘못된 항목" }, { status: 400 });
    }
    const e = item as Partial<EntryPayload>;
    if (
      !isUuid(e.id) ||
      typeof e.segment !== "string" ||
      typeof e.itemKey !== "string" ||
      typeof e.seq !== "number" ||
      !isKind(e.kind) ||
      typeof e.label !== "string" ||
      typeof e.investigator !== "string"
    ) {
      return NextResponse.json({ error: "필드 누락" }, { status: 400 });
    }
    rows.push({
      id: e.id,
      user_id: session.userId,
      nickname: session.nickname,
      investigator: e.investigator,
      segment: e.segment,
      item_key: e.itemKey,
      seq: e.seq,
      kind: e.kind,
      label: e.label,
      client_ts: e.clientTs ?? null,
    });
  }

  const res = await adminFetch(
    "dongseo_survey_entries?on_conflict=id",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "저장 실패", detail: text.slice(0, 500) },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, count: rows.length });
}

export async function DELETE(req: NextRequest) {
  const session = await readToolSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids");
  const segment = url.searchParams.get("segment");

  if (idsParam) {
    const ids = idsParam.split(",").map((s) => s.trim()).filter(isUuid);
    if (ids.length === 0 || ids.length > 100) {
      return NextResponse.json({ error: "ids 필요" }, { status: 400 });
    }
    const inList = ids.map((s) => `"${s}"`).join(",");
    const res = await adminFetch(
      `dongseo_survey_entries?user_id=eq.${session.userId}&id=in.(${inList})`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "삭제 실패" }, { status: 502 });
    }
    return NextResponse.json({ success: true, deletedIds: ids });
  }

  if (segment) {
    const res = await adminFetch(
      `dongseo_survey_entries?user_id=eq.${session.userId}&segment=eq.${encodeURIComponent(segment)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "삭제 실패" }, { status: 502 });
    }
    return NextResponse.json({ success: true, segment });
  }

  return NextResponse.json({ error: "ids 또는 segment 필요" }, { status: 400 });
}
