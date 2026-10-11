"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Gem, Loader2, Sprout, Stamp, Trash2, Upload, X } from "lucide-react";
import TreasureMap, { type TreasurePoint } from "@/components/admin/TreasureMap";

type Props = {
  puzzleId: string;
  trailId: string | null;
  seriesName: string | null;
  totalPieces: number;
};

type Coord = [number, number] | [number, number, number];
type Coordinates = Coord[] | Coord[][];

type Economics = {
  totalPieces: number;
  treasureCount: number;
  starter: number;
  needed: number;
  distanceKm: number;
  currentMultiplier: number;
  currentPerWalk: number;
  recommendedMultiplier: number;
};

type Summary = {
  count: number;
  seedCells?: number;
  trailLengthKm?: number;
  economics?: Economics | null;
  treasures?: TreasurePoint[];
  coordinates?: Coordinates | null;
};

type Mode = "fixed" | "even";
const EVEN_MIN = 2;
const EVEN_MAX = 20;

export default function TreasurePanel({
  puzzleId,
  trailId,
  seriesName,
  totalPieces,
}: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [eco, setEco] = useState<Economics | null>(null);
  const [treasures, setTreasures] = useState<TreasurePoint[]>([]);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [multInput, setMultInput] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // 배치 모드: fixed(시작·중간·끝 3곳) / even(원하는 N개 균등)
  const [mode, setMode] = useState<Mode>("fixed");
  const [evenCount, setEvenCount] = useState<number>(5);

  const plannedCount =
    mode === "fixed"
      ? Math.max(1, Math.min(totalPieces - 1, 3))
      : Math.max(1, Math.min(totalPieces - 1, evenCount));
  const expected = plannedCount;

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/puzzles/${puzzleId}/treasures`);
      const d = (await r.json()) as Summary;
      setCount(d.count ?? 0);
      setEco(d.economics ?? null);
      setTreasures(d.treasures ?? []);
      setCoordinates(d.coordinates ?? null);
      if (d.economics) setMultInput(String(d.economics.currentMultiplier));
    } catch {
      setCount(0);
    }
  }, [puzzleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveMultiplier(value: number) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/puzzles/${puzzleId}/treasures`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ multiplier: value }),
      });
      const d = (await res.json()) as { error?: string; multiplier?: number };
      if (!res.ok) setError(d.error ?? "배율 저장 실패");
      else {
        setMsg(`완주 씨앗 배율을 ×${d.multiplier}로 저장했어요.`);
        await load();
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    if (busy) return;
    if (
      mode === "even" &&
      (!Number.isInteger(evenCount) ||
        evenCount < EVEN_MIN ||
        evenCount > EVEN_MAX)
    ) {
      setError(`보물 개수는 ${EVEN_MIN}~${EVEN_MAX} 사이 정수여야 해요.`);
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const body =
        mode === "even"
          ? { mode: "even", count: evenCount }
          : { mode: "fixed" };
      const res = await fetch(`/api/admin/puzzles/${puzzleId}/treasures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json()) as Summary & { error?: string };
      if (!res.ok) {
        setError(d.error ?? "배치에 실패했어요.");
      } else {
        setMsg(
          `보물 ${d.count}개 배치 완료 · 씨앗 조각 ${d.seedCells}개 · 경로 ${d.trailLengthKm}km`
        );
        await load();
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  // ── 도장 그림(시작·중간·끝) — 앱의 "도장 조각" 표현에 쓰임 ──
  const [stampBusy, setStampBusy] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function uploadStamp(tid: string, file: File) {
    if (stampBusy) return;
    setStampBusy(tid);
    setError(null);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/admin/puzzles/${puzzleId}/treasures/${tid}/stamp`,
        { method: "POST", body: fd }
      );
      const d = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) setError(d.error ?? "도장 업로드 실패");
      else {
        setMsg("도장 그림을 저장했어요.");
        await load();
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setStampBusy(null);
    }
  }

  async function removeStamp(tid: string) {
    if (stampBusy) return;
    if (!confirm("이 지점의 도장 그림을 해제할까요?")) return;
    setStampBusy(tid);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/puzzles/${puzzleId}/treasures/${tid}/stamp`,
        { method: "DELETE" }
      );
      const d = (await res.json()) as { error?: string };
      if (!res.ok) setError(d.error ?? "도장 해제 실패");
      else {
        setMsg("도장 그림을 해제했어요.");
        await load();
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setStampBusy(null);
    }
  }

  async function clearAll() {
    if (busy) return;
    if (!confirm("이 퍼즐의 보물을 모두 제거할까요?")) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/puzzles/${puzzleId}/treasures`, {
        method: "DELETE",
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) setError(d.error ?? "제거에 실패했어요.");
      else {
        setCount(0);
        setMsg("보물을 모두 제거했어요.");
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  const canPlace = !!trailId;

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <Gem className="h-4 w-4 text-amber-300" />
        <h2 className="text-sm font-bold text-white">보물 (완주 인증)</h2>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed mb-4">
        인증 지점(보물)을 경로상에 배치해요. 모험자가 각 지점을 실제로 지나야
        조각 <span className="text-amber-300 font-semibold">{expected}</span>개를 얻고,
        나머지 {Math.max(0, totalPieces - expected)}개는 걸어서 번 씨앗으로 뽑아요.
        보물 셀은 씨앗 뽑기에서 제외돼 무결성이 지켜져요.
      </p>

      {!canPlace && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200 mb-3">
          {seriesName
            ? "시리즈 연결 퍼즐은 자동 배치를 지원하지 않아요. 구간(코스 지도)별 퍼즐로 연결해 주세요."
            : "먼저 위에서 코스 지도를 연결하고 저장한 뒤 배치할 수 있어요."}
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className="text-sm text-gray-300">
          현재 보물:{" "}
          <span className="font-bold text-white tabular-nums">
            {count === null ? "…" : count}
          </span>
          개
        </div>
      </div>

      {/* 배치 모드 선택 */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-3 mb-3 space-y-2">
        <div className="text-xs font-semibold text-white mb-1">배치 방식</div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="radio"
            name="treasure-mode"
            value="fixed"
            checked={mode === "fixed"}
            onChange={() => setMode("fixed")}
            disabled={busy}
            className="mt-0.5 accent-amber-400"
          />
          <div className="flex-1">
            <div className="text-xs text-gray-200">
              시작·중간·끝 3곳 <span className="text-gray-500">(권장)</span>
            </div>
            <div className="text-[11px] text-gray-500 leading-relaxed">
              순환 코스는 0·⅓·⅔ 지점. 예측 가능한 인증 포인트로 쓰기 좋아요.
            </div>
          </div>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="radio"
            name="treasure-mode"
            value="even"
            checked={mode === "even"}
            onChange={() => setMode("even")}
            disabled={busy}
            className="mt-0.5 accent-amber-400"
          />
          <div className="flex-1">
            <div className="text-xs text-gray-200 flex items-center gap-2 flex-wrap">
              <span>원하는 개수만큼 균등 배치</span>
              <input
                type="number"
                min={EVEN_MIN}
                max={EVEN_MAX}
                step={1}
                value={evenCount}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setEvenCount(Number.isFinite(n) ? n : EVEN_MIN);
                }}
                onFocus={() => setMode("even")}
                disabled={busy}
                className="w-16 h-7 px-2 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs text-right tabular-nums focus:outline-none focus:border-amber-400/50 disabled:opacity-50"
              />
              <span className="text-gray-500 text-[11px]">개</span>
            </div>
            <div className="text-[11px] text-gray-500 leading-relaxed">
              경로를 등분해 보물을 배치. {EVEN_MIN}~{EVEN_MAX} 개 가능. 조각
              수(총 {totalPieces})에서 1을 뺀 수를 넘지 못해요.
            </div>
          </div>
        </label>
      </div>

      {/* 완주 씨앗 모델 안내 — 배율 폐지(2026-08-27) */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-4 mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Sprout className="h-4 w-4 text-emerald-300" />
          <span className="text-xs font-bold text-white">완주 = 완성 (자동)</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          거리 1km당 씨앗 1개 고정 + 보물상자가 퍼즐 완성에 필요한 나머지 씨앗을
          자동 분배해요(보물 배치·삭제 시 자동 재계산). 배율 설정은 폐지됐습니다 —
          별도 조정 없이 1회 완주로 딱 완성돼요.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={regenerate}
          disabled={!canPlace || busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/90 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed px-3.5 h-9 text-sm font-semibold text-black transition"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Gem className="h-4 w-4" />
          )}
          {count && count > 0 ? "다시 배치" : "인증 지점 배치"}
        </button>
        {count !== null && count > 0 && (
          <button
            type="button"
            onClick={clearAll}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-40 px-3.5 h-9 text-sm font-medium text-gray-300 transition"
          >
            <Trash2 className="h-4 w-4" />
            모두 제거
          </button>
        )}
      </div>

      <p className="text-[11px] text-gray-500 mt-3">
        · 다시 배치하면 기존 보물은 지워지고 새 위치·조각으로 교체돼요. 이미 보물을
        획득한 모험자의 조각은 유지됩니다.
        <br />· 조각 수(격자)나 코스를 바꾼 뒤에는 다시 배치해 주세요.
      </p>

      {/* 인증 도장 — 지점별 도장 그림. 앱에서 획득 팝업·퍼즐 도장 조각·완성 카드 도장판에 쓰임 */}
      {treasures.length > 0 && (
        <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Stamp className="h-4 w-4 text-amber-200" />
            <span className="text-xs font-bold text-white">인증 도장 그림</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
            지점마다 도장 그림(크림 종이 + 먹 그림, 투명 배경 PNG 권장)을 올려요.
            올리면 앱에서 그 지점 도착 시 도장이 찍히고, 퍼즐에선 사진 조각 대신{" "}
            <span className="text-amber-200">도장 조각</span>으로 보이며, 완성 카드에
            도장 3개가 한 줄로 찍혀요. 다시 배치해도 도장은 유지돼요.
          </p>
          <ul className="space-y-2">
            {[...treasures]
              .sort((a, b) => a.seq - b.seq)
              .map((t) => {
                const tid = t.id ?? "";
                const label = STAMP_LABELS[t.seq] ?? `지점 ${t.seq + 1}`;
                const busyHere = stampBusy === tid;
                return (
                  <li
                    key={tid || t.seq}
                    className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <div className="h-12 w-12 shrink-0 rounded-full bg-[#EFE7D6] overflow-hidden flex items-center justify-center">
                      {t.stamp_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.stamp_image_url}
                          alt={label}
                          className="h-12 w-12 object-contain"
                        />
                      ) : (
                        <Stamp className="h-5 w-5 text-black/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white">{label}</div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {t.stamp_image_url ? "도장 등록됨" : "아직 도장이 없어요"}
                        {typeof t.cell_index === "number" ? ` · 조각 #${t.cell_index + 1}` : ""}
                      </div>
                    </div>
                    <input
                      ref={(el) => {
                        fileInputs.current[tid] = el;
                      }}
                      type="file"
                      accept="image/png,image/webp,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f && tid) void uploadStamp(tid, f);
                      }}
                    />
                    <button
                      type="button"
                      disabled={!tid || !!stampBusy}
                      onClick={() => fileInputs.current[tid]?.click()}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 px-2.5 h-8 text-xs font-medium text-gray-200 transition"
                    >
                      {busyHere ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {t.stamp_image_url ? "교체" : "올리기"}
                    </button>
                    {t.stamp_image_url && (
                      <button
                        type="button"
                        disabled={!!stampBusy}
                        onClick={() => removeStamp(tid)}
                        className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/[0.02] hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40 h-8 w-8 text-gray-400 transition"
                        title="도장 해제"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {/* 배치 미리보기 지도 — 경로 + 보물 위치(번호) */}
      {coordinates && (
        <div className="mt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Gem className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-xs font-semibold text-white">
              배치 미리보기
            </span>
            <span className="text-[11px] text-gray-500">
              (앱과 동일한 보물상자 아이콘)
            </span>
          </div>
          <TreasureMap
            coordinates={coordinates}
            treasures={treasures}
            height={420}
          />
          {treasures.length === 0 && (
            <p className="text-[11px] text-gray-500 mt-2">
              아직 배치된 인증 지점이 없어요. 위 「인증 지점 배치」를 누르면
              선택한 방식({mode === "fixed"
                ? "시작·중간·끝 3곳"
                : `균등 ${plannedCount}곳`}
              )으로 표시돼요.
            </p>
          )}
        </div>
      )}

      {msg && <p className="text-xs text-emerald-300 mt-2">{msg}</p>}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </section>
  );
}

const STAMP_LABELS: Record<number, string> = {
  0: "시작 지점",
  1: "중간 지점",
  2: "끝 지점",
};

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "ok" | "warn";
}) {
  const valueColor =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-white";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-400">{label}</span>
      <span
        className={`${valueColor} ${strong ? "font-bold" : "font-medium"} tabular-nums text-right`}
      >
        {value}
      </span>
    </div>
  );
}
