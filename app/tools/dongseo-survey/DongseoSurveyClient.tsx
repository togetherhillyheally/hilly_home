"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  Lock,
  RotateCcw,
  Undo2,
  Unlock,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ITEMS,
  SEGMENT_OPTIONS,
  type EntryPoint,
  type EntryRange,
  type ItemDef,
} from "./items";
import Reference from "./Reference";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster, toast } from "sonner";

// ─────────────────────────────────────────────────────────────
// 상태 모델 & localStorage
// ─────────────────────────────────────────────────────────────

type ItemEntries = {
  // range 는 EntryRange[], point 는 EntryPoint[]
  entries: (EntryPoint | EntryRange)[];
};

type SegmentState = {
  investigator: string;
  items: Record<string, ItemEntries>;
  updatedAt: number;
};

const LS_PREFIX = "dongseo-survey/v1/";
const LS_LAST_SEGMENT = "dongseo-survey/v1/last-segment";
const LS_LAST_INVESTIGATOR = "dongseo-survey/v1/last-investigator";
const LS_SEGMENT_LOCKED = "dongseo-survey/v1/segment-locked";
const LS_HEADER_COLLAPSED = "dongseo-survey/v1/header-collapsed";

function loadSegment(segment: string): SegmentState {
  if (typeof window === "undefined") {
    return { investigator: "", items: {}, updatedAt: 0 };
  }
  try {
    const raw = window.localStorage.getItem(LS_PREFIX + segment);
    if (raw) return JSON.parse(raw) as SegmentState;
  } catch {
    /* ignore */
  }
  return { investigator: "", items: {}, updatedAt: 0 };
}

function saveSegment(segment: string, state: SegmentState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_PREFIX + segment, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function genUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // 폴백 (구형 브라우저) — RFC4122 v4 근사치
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ServerEntry = {
  id: string;
  segment: string;
  itemKey: string;
  seq: number;
  kind: "point" | "range_start" | "range_end";
  label: string;
  investigator: string;
  clientTs?: string;
};

async function pushEntries(entries: ServerEntry[]): Promise<boolean> {
  if (entries.length === 0) return true;
  try {
    const res = await fetch("/api/tools/dongseo-survey/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteEntries(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  try {
    const res = await fetch(
      `/api/tools/dongseo-survey/entries?ids=${ids.join(",")}`,
      { method: "DELETE" }
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteSegmentEntries(segment: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/tools/dongseo-survey/entries?segment=${encodeURIComponent(segment)}`,
      { method: "DELETE" }
    );
    return res.ok;
  } catch {
    return false;
  }
}

function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────

export default function DongseoSurveyClient({
  loggedInNickname,
}: {
  loggedInNickname: string | null;
}) {
  const router = useRouter();
  const [segment, setSegment] = useState<string>("");
  const [segmentLocked, setSegmentLocked] = useState(false);
  const [investigator, setInvestigator] = useState<string>("");
  const [state, setState] = useState<SegmentState>({
    investigator: "",
    items: {},
    updatedAt: 0,
  });
  const [ready, setReady] = useState(false);
  const [itemTab, setItemTab] = useState<"range" | "facility" | "risk">(
    "range"
  );
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const rangeItems = useMemo(
    () => ITEMS.filter((it) => it.type === "range"),
    []
  );
  const facilityItems = useMemo(
    () => ITEMS.filter((it) => it.type === "point" && it.category === "시설물"),
    []
  );
  const riskItems = useMemo(() => {
    const list = ITEMS.filter(
      (it) => it.type === "point" && it.category !== "시설물"
    );
    // 오기(자주 사용)를 최상단으로
    return list.sort((a, b) => {
      if (a.key === "typo") return -1;
      if (b.key === "typo") return 1;
      return 0;
    });
  }, []);

  const currentItems =
    itemTab === "range"
      ? rangeItems
      : itemTab === "facility"
        ? facilityItems
        : riskItems;

  // 확인 다이얼로그 통합 상태
  type ConfirmState =
    | { kind: "login" }
    | { kind: "undo"; itemKey: string; label: string }
    | { kind: "reset" }
    | null;
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  // 서비스 워커 등록 (PWA)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/tools/" })
        .catch(() => {
          /* SW 등록 실패는 무시 — 앱은 정상 동작 */
        });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  // 최초 로드 — localStorage 에서 마지막 구간·조사자·잠금·헤더 상태 복원
  useEffect(() => {
    const lastSeg =
      window.localStorage.getItem(LS_LAST_SEGMENT) || SEGMENT_OPTIONS[0];
    const lastInv = window.localStorage.getItem(LS_LAST_INVESTIGATOR) || "";
    const locked = window.localStorage.getItem(LS_SEGMENT_LOCKED) === "1";
    const collapsedPref =
      window.localStorage.getItem(LS_HEADER_COLLAPSED) === "1";
    setSegment(lastSeg);
    setInvestigator(lastInv);
    setSegmentLocked(locked);
    // 조사자 이름이 비어 있으면 무조건 펼쳐서 입력 유도
    setHeaderCollapsed(collapsedPref && !!lastInv.trim());
    const loaded = loadSegment(lastSeg);
    setState({
      ...loaded,
      investigator: loaded.investigator || lastInv,
    });
    setReady(true);
  }, []);

  const toggleHeaderCollapsed = () => {
    setHeaderCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(LS_HEADER_COLLAPSED, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleSegmentLock = () => {
    setSegmentLocked((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(LS_SEGMENT_LOCKED, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const changeSegment = (next: string) => {
    if (next === segment) return;
    if (segmentLocked) return;
    setSegment(next);
  };

  // 구간 변경 시 그 구간 상태 로드
  useEffect(() => {
    if (!ready || !segment) return;
    window.localStorage.setItem(LS_LAST_SEGMENT, segment);
    const loaded = loadSegment(segment);
    setState({
      ...loaded,
      investigator: loaded.investigator || investigator,
    });
    // investigator 는 유지, 구간에 이미 저장된 값이 있으면 그 값 우선
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, ready]);

  // 조사자명 유지 (구간 전환해도 이름은 유지)
  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(LS_LAST_INVESTIGATOR, investigator);
    // 현재 구간 state 에도 반영
    setState((prev) => {
      const next = { ...prev, investigator, updatedAt: Date.now() };
      saveSegment(segment, next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investigator, ready]);

  // 상태 변경 → 저장
  const updateState = (updater: (prev: SegmentState) => SegmentState) => {
    setState((prev) => {
      const next = updater(prev);
      const stamped = { ...next, updatedAt: Date.now() };
      saveSegment(segment, stamped);
      return stamped;
    });
  };

  // ── 로그인 게이트 ─────────────────────────────────────────
  const requireLogin = (): boolean => {
    if (loggedInNickname) return true;
    setConfirmState({ kind: "login" });
    return false;
  };

  const goToLogin = () => {
    router.push(
      `/tools/login?next=${encodeURIComponent("/tools/dongseo-survey")}`
    );
  };

  const logout = async () => {
    try {
      await fetch("/api/tools/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.refresh();
  };

  // ── 서버 sync 실패 처리 공통 ─────────────────────────────
  const notifySyncFail = () => {
    toast.error("서버 저장 실패 — 로컬은 유지됨", { duration: 3000 });
  };

  // ── 액션들 ──────────────────────────────────────────────
  const addPoint = (key: string, itemDef: ItemDef) => {
    if (!requireLogin()) return;
    const cur = (state.items[key]?.entries ?? []) as EntryPoint[];
    const nextSeq = (cur[cur.length - 1]?.seq ?? 0) + 1;
    const entryId = genUuid();
    const ts = Date.now();
    const pointLabel =
      (itemDef.type === "point" && itemDef.pointLabel) || itemDef.label;
    const label = `${pointLabel}${pad2(nextSeq)}`;
    updateState((prev) => {
      const list = (prev.items[key]?.entries ?? []) as EntryPoint[];
      const entry: EntryPoint = { seq: nextSeq, timestamp: ts, entryId };
      return {
        ...prev,
        items: {
          ...prev.items,
          [key]: { entries: [...list, entry] },
        },
      };
    });
    pushEntries([
      {
        id: entryId,
        segment,
        itemKey: key,
        seq: nextSeq,
        kind: "point",
        label,
        investigator,
        clientTs: new Date(ts).toISOString(),
      },
    ]).then((ok) => {
      if (!ok) notifySyncFail();
    });
  };

  const addRangeStart = (key: string, itemDef: ItemDef) => {
    if (!requireLogin()) return;
    if (itemDef.type !== "range") return;
    const cur = (state.items[key]?.entries ?? []) as EntryRange[];
    const nextSeq = (cur[cur.length - 1]?.seq ?? 0) + 1;
    const entryId = genUuid();
    const ts = Date.now();
    const label = `${itemDef.startLabel}${pad2(nextSeq)}`;
    updateState((prev) => {
      const list = (prev.items[key]?.entries ?? []) as EntryRange[];
      const entry: EntryRange = {
        seq: nextSeq,
        start: ts,
        end: null,
        startEntryId: entryId,
      };
      return {
        ...prev,
        items: {
          ...prev.items,
          [key]: { entries: [...list, entry] },
        },
      };
    });
    pushEntries([
      {
        id: entryId,
        segment,
        itemKey: key,
        seq: nextSeq,
        kind: "range_start",
        label,
        investigator,
        clientTs: new Date(ts).toISOString(),
      },
    ]).then((ok) => {
      if (!ok) notifySyncFail();
    });
  };

  const closeRangeEnd = (key: string, itemDef: ItemDef) => {
    if (!requireLogin()) return;
    if (itemDef.type !== "range") return;
    const cur = (state.items[key]?.entries ?? []) as EntryRange[];
    if (cur.length === 0) return;
    const last = cur[cur.length - 1];
    if (last.end != null) return;
    const endEntryId = genUuid();
    const ts = Date.now();
    const label = `${itemDef.endLabel}${pad2(last.seq)}`;
    updateState((prev) => {
      const list = (prev.items[key]?.entries ?? []) as EntryRange[];
      if (list.length === 0) return prev;
      const pending = list[list.length - 1];
      if (pending.end != null) return prev;
      const patched: EntryRange = { ...pending, end: ts, endEntryId };
      return {
        ...prev,
        items: {
          ...prev.items,
          [key]: { entries: [...list.slice(0, -1), patched] },
        },
      };
    });
    pushEntries([
      {
        id: endEntryId,
        segment,
        itemKey: key,
        seq: last.seq,
        kind: "range_end",
        label,
        investigator,
        clientTs: new Date(ts).toISOString(),
      },
    ]).then((ok) => {
      if (!ok) notifySyncFail();
    });
  };

  const undoLast = (key: string) => {
    const cur = state.items[key]?.entries ?? [];
    if (cur.length === 0) return;
    const last = cur[cur.length - 1];
    const idsToDelete: string[] = [];
    if ("start" in last) {
      // range
      if (last.end == null) {
        // 진행중 시작 취소 → row 삭제
        if (last.startEntryId) idsToDelete.push(last.startEntryId);
      } else {
        // 완료된 종료를 되돌림 → end row 삭제 (시작 row 는 유지)
        if (last.endEntryId) idsToDelete.push(last.endEntryId);
      }
    } else {
      // point
      if (last.entryId) idsToDelete.push(last.entryId);
    }

    updateState((prev) => {
      const list = prev.items[key]?.entries ?? [];
      if (list.length === 0) return prev;
      const tail = list[list.length - 1];
      if ("start" in tail && tail.end == null) {
        return {
          ...prev,
          items: { ...prev.items, [key]: { entries: list.slice(0, -1) } },
        };
      }
      if ("start" in tail && tail.end != null) {
        const reopened: EntryRange = { ...tail, end: null, endEntryId: undefined };
        return {
          ...prev,
          items: {
            ...prev.items,
            [key]: { entries: [...list.slice(0, -1), reopened] },
          },
        };
      }
      return {
        ...prev,
        items: { ...prev.items, [key]: { entries: list.slice(0, -1) } },
      };
    });

    if (idsToDelete.length > 0) {
      deleteEntries(idsToDelete).then((ok) => {
        if (!ok) notifySyncFail();
      });
    }
  };

  const resetSegmentConfirmed = () => {
    const target = segment;
    updateState((prev) => ({ ...prev, items: {} }));
    deleteSegmentEntries(target).then((ok) => {
      if (!ok) notifySyncFail();
    });
  };

  // 다음 번호 계산
  const nextSeqOf = (key: string): number => {
    const cur = state.items[key]?.entries ?? [];
    return (cur[cur.length - 1]?.seq ?? 0) + 1;
  };

  // range 진행중 여부
  const rangeOpenSeq = (key: string): number | null => {
    const cur = (state.items[key]?.entries ?? []) as EntryRange[];
    const last = cur[cur.length - 1];
    return last && "start" in last && last.end == null ? last.seq : null;
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#08080f] text-gray-100 flex items-center justify-center">
        <p className="text-gray-500">로딩 중…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080f] text-gray-100">
      <Toaster
        theme="dark"
        position="top-center"
        richColors
        closeButton={false}
        toastOptions={{
          style: {
            background: "#1a1a22",
            color: "#f3f4f6",
            border: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      />
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.08),transparent_65%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <header className="sticky top-0 z-40 bg-[#08080f]/90 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/home_logo.png"
              alt="Hillyheally"
              width={72}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
          {loggedInNickname ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white font-semibold">
                {loggedInNickname}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-[11px] text-gray-500 hover:text-white"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link
              href={`/tools/login?next=${encodeURIComponent("/tools/dongseo-survey")}`}
              className="text-xs text-orange-300 hover:text-orange-200 font-semibold"
            >
              로그인
            </Link>
          )}
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 카드 — 구간 + 조사자 */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
          <SegmentPicker
            value={segment}
            onChange={changeSegment}
            locked={segmentLocked}
            onToggleLock={toggleSegmentLock}
            collapsed={headerCollapsed}
            onToggleCollapsed={toggleHeaderCollapsed}
            investigator={investigator}
          />
          {!headerCollapsed ? (
            <>
              <div className="mt-4">
                <label className="block text-xs text-gray-400 mb-1.5">
                  조사자 <span className="text-red-400">*</span>
                </label>
                <input
                  value={investigator}
                  onChange={(e) => setInvestigator(e.target.value)}
                  readOnly={segmentLocked}
                  disabled={segmentLocked}
                  placeholder="예: 홍길동"
                  className={`w-full h-11 px-3 rounded-lg bg-white/[0.05] border text-white text-base placeholder:text-gray-600 focus:outline-none focus:border-orange-400/50 disabled:opacity-70 disabled:cursor-not-allowed ${
                    !investigator.trim()
                      ? "border-red-500/40"
                      : "border-white/10"
                  }`}
                />
                {!investigator.trim() ? (
                  <p className="mt-1.5 text-[11px] text-red-400">
                    조사자 이름을 먼저 입력해주세요. 카운터 기록은 이름 입력 후 활성화됩니다.
                  </p>
                ) : null}
              </div>
              <p className="mt-3 text-[11px] text-gray-500">
                기록은 서버에 자동 저장돼요. 마지막 업데이트:{" "}
                {state.updatedAt ? formatClock(state.updatedAt) : "-"}
              </p>
            </>
          ) : null}
        </section>

        {/* 카운터 그리드 */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">
              조사항목 카운터
            </h2>
            <button
              type="button"
              onClick={() => setConfirmState({ kind: "reset" })}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20 active:bg-red-500/30"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {segment} 초기화
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-white/[0.03] border border-white/10 p-1 mb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setItemTab("range")}
              className={`h-9 px-3 rounded text-sm font-semibold transition whitespace-nowrap ${
                itemTab === "range"
                  ? "bg-white/[0.12] text-white"
                  : "text-gray-400"
              }`}
            >
              시작·종료 ({rangeItems.length})
            </button>
            <button
              type="button"
              onClick={() => setItemTab("facility")}
              className={`h-9 px-3 rounded text-sm font-semibold transition whitespace-nowrap ${
                itemTab === "facility"
                  ? "bg-white/[0.12] text-white"
                  : "text-gray-400"
              }`}
            >
              시설물 ({facilityItems.length})
            </button>
            <button
              type="button"
              onClick={() => setItemTab("risk")}
              className={`h-9 px-3 rounded text-sm font-semibold transition whitespace-nowrap ${
                itemTab === "risk"
                  ? "bg-white/[0.12] text-white"
                  : "text-gray-400"
              }`}
            >
              위험·기타 ({riskItems.length})
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentItems.map(
              (item) => (
                <ItemCard
                  key={item.key}
                  item={item}
                  entries={state.items[item.key]?.entries ?? []}
                  nextSeq={nextSeqOf(item.key)}
                  rangeOpenSeq={
                    item.type === "range" ? rangeOpenSeq(item.key) : null
                  }
                  disabled={!investigator.trim()}
                  requireLogin={requireLogin}
                  onAddPoint={() => addPoint(item.key, item)}
                  onAddRangeStart={() => addRangeStart(item.key, item)}
                  onCloseRangeEnd={() => closeRangeEnd(item.key, item)}
                  onRequestUndo={() =>
                    setConfirmState({
                      kind: "undo",
                      itemKey: item.key,
                      label: item.label,
                    })
                  }
                />
              )
            )}
          </div>
        </section>

        {/* 참고자료 */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">참고 자료</h2>
          <Reference />
        </section>
      </main>

      <AlertDialog
        open={confirmState !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
      >
        <AlertDialogContent className="bg-[#111116] border-white/10 text-gray-100 max-w-sm">
          {confirmState?.kind === "login" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">로그인이 필요해요</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  카운터 기록은 로그인 후에 사용할 수 있어요. 지금 로그인 페이지로 이동할까요?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:text-white">
                  나중에
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setConfirmState(null);
                    goToLogin();
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  로그인하러 가기
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : confirmState?.kind === "undo" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">
                  마지막 기록을 되돌릴까요?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  <span className="text-orange-300 font-semibold">{confirmState.label}</span>
                  {" 항목의 마지막 카운트를 취소해요."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:text-white">
                  취소
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const key = confirmState.itemKey;
                    const label = confirmState.label;
                    setConfirmState(null);
                    undoLast(key);
                    toast(`${label} 마지막 기록을 되돌렸어요`, {
                      icon: "↶",
                    });
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  되돌리기
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : confirmState?.kind === "reset" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">
                  {segment} 전체 초기화
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  이 구간의 모든 카운터 기록이 사라져요. 되돌릴 수 없어요.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:text-white">
                  취소
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setConfirmState(null);
                    resetSegmentConfirmed();
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  초기화
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 구간 선택 — 본선/복선 탭 + 번호 칩 그리드 (모바일 친화)
// ─────────────────────────────────────────────────────────────

function SegmentPicker({
  value,
  onChange,
  locked,
  onToggleLock,
  collapsed,
  onToggleCollapsed,
  investigator,
}: {
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
  onToggleLock: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  investigator: string;
}) {
  const [open, setOpen] = useState(false);

  const mainOptions = useMemo(
    () =>
      Array.from({ length: 55 }, (_, i) => ({
        key: `${i + 1}구간`,
        n: i + 1,
        group: "main" as const,
      })),
    []
  );
  const subOptions = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        key: `복선 ${i + 1}`,
        n: i + 1,
        group: "sub" as const,
      })),
    []
  );

  const handleSelect = (next: string) => {
    setOpen(false);
    onChange(next);
  };

  return (
    <div>
      <div className={collapsed ? "" : "mb-3"}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="text-3xl font-black leading-none bg-gradient-to-r from-orange-300 via-orange-400 to-pink-500 bg-clip-text text-transparent tabular-nums">
              {value || "미선택"}
            </span>
            {collapsed && investigator.trim() ? (
              <span className="text-3xl font-black leading-none bg-gradient-to-r from-orange-300 via-orange-400 to-pink-500 bg-clip-text text-transparent truncate">
                {investigator}
              </span>
            ) : null}
            {!collapsed && locked ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 shrink-0">
                <Lock className="h-3 w-3" /> 고정
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "펼치기" : "접기"}
            className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.05] shrink-0"
          >
            {collapsed ? (
              <>
                펼치기 <ChevronDown className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                접기 <ChevronUp className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
      {collapsed ? null : (
        <>
      <label className="block text-xs text-gray-400 mb-1.5">구간 선택</label>
      <div className="flex items-center gap-2">
        <Popover
          open={locked ? false : open}
          onOpenChange={(next) => {
            if (locked) return;
            setOpen(next);
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={locked}
              aria-disabled={locked}
              className="flex-1 min-w-0 h-11 px-3 rounded-lg bg-white/[0.05] border border-white/10 text-white text-base font-semibold flex items-center justify-between gap-2 focus:outline-none focus:border-orange-400/50 active:bg-white/[0.08] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2 min-w-0">
                {locked ? (
                  <Lock className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                ) : null}
                <span className="truncate">{value || "구간 선택"}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 bg-[#111116] border-white/10 text-gray-100 w-[--radix-popover-trigger-width]"
            align="start"
            sideOffset={6}
          >
            <Command
              className="bg-transparent"
              filter={(val, search) => {
                if (!search) return 1;
                const s = search.trim().toLowerCase();
                return val.toLowerCase().includes(s) ? 1 : 0;
              }}
            >
              <CommandInput
                placeholder="번호 또는 이름 검색"
                className="text-white placeholder:text-gray-500"
              />
              <CommandList className="max-h-[280px]">
                <CommandEmpty className="text-gray-500">
                  일치하는 구간이 없어요.
                </CommandEmpty>
                <CommandGroup heading="본선 (1~55)">
                  {mainOptions.map((opt) => (
                    <CommandItem
                      key={opt.key}
                      value={`${opt.key} 본선 ${opt.n}`}
                      onSelect={() => handleSelect(opt.key)}
                      className="text-gray-200 aria-selected:bg-white/[0.08] aria-selected:text-white cursor-pointer"
                    >
                      <span className="tabular-nums font-semibold w-8">
                        {opt.n}
                      </span>
                      <span className="text-gray-400 text-xs">구간</span>
                      {value === opt.key ? (
                        <Check className="ml-auto h-4 w-4 text-orange-400" />
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="복선 (1~9)">
                  {subOptions.map((opt) => (
                    <CommandItem
                      key={opt.key}
                      value={`${opt.key} 복선 ${opt.n}`}
                      onSelect={() => handleSelect(opt.key)}
                      className="text-gray-200 aria-selected:bg-white/[0.08] aria-selected:text-white cursor-pointer"
                    >
                      <span className="text-gray-400 text-xs w-8">복선</span>
                      <span className="tabular-nums font-semibold">
                        {opt.n}
                      </span>
                      {value === opt.key ? (
                        <Check className="ml-auto h-4 w-4 text-orange-400" />
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={onToggleLock}
          aria-pressed={locked}
          title={locked ? "잠금 해제" : "실수 방지를 위해 잠금"}
          className={`inline-flex items-center gap-1 h-11 px-3 rounded-lg border text-xs font-semibold transition shrink-0 ${
            locked
              ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
              : "bg-white/[0.04] border-white/10 text-gray-400 hover:text-white"
          }`}
        >
          {locked ? (
            <>
              <Unlock className="h-3.5 w-3.5" /> 해제
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" /> 잠금
            </>
          )}
        </button>
      </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 개별 조사항목 카드
// ─────────────────────────────────────────────────────────────

function ItemCard({
  item,
  entries,
  nextSeq,
  rangeOpenSeq,
  disabled,
  requireLogin,
  onAddPoint,
  onAddRangeStart,
  onCloseRangeEnd,
  onRequestUndo,
}: {
  item: ItemDef;
  entries: (EntryPoint | EntryRange)[];
  nextSeq: number;
  rangeOpenSeq: number | null;
  disabled?: boolean;
  requireLogin: () => boolean;
  onAddPoint: () => void;
  onAddRangeStart: () => void;
  onCloseRangeEnd: () => void;
  onRequestUndo: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const copyLabel = async (label: string) => {
    try {
      await navigator.clipboard.writeText(label);
      setCopied(label);
      setTimeout(() => setCopied(null), 1200);
      toast.success(`${label} 복사됨`, { duration: 1500 });
    } catch {
      toast.error("복사 실패 — 브라우저 권한을 확인해주세요");
    }
  };

  const isRange = item.type === "range";
  const isTypo = item.key === "typo";

  // 다음 클릭 시 라벨 미리보기
  const previewLabel = (() => {
    if (isRange) {
      const it = item as Extract<ItemDef, { type: "range" }>;
      if (rangeOpenSeq != null) {
        return `${it.endLabel}${pad2(rangeOpenSeq)}`;
      }
      return `${it.startLabel}${pad2(nextSeq)}`;
    }
    const it = item as Extract<ItemDef, { type: "point" }>;
    const base = it.pointLabel ?? it.label;
    return `${base}${pad2(nextSeq)}`;
  })();

  const count = entries.length;

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 transition ${
        rangeOpenSeq != null
          ? "border-emerald-500/50 bg-emerald-500/[0.08]"
          : isTypo
            ? "border-white/5 bg-white/[0.015]"
            : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <h3 className="text-lg font-bold text-white leading-tight truncate">
            {item.label}
          </h3>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            aria-label={`${item.label} 상세 정보`}
            className="w-7 h-7 rounded-full bg-white/[0.05] hover:bg-white/[0.12] active:bg-white/[0.15] border border-white/10 text-gray-400 hover:text-white flex items-center justify-center shrink-0"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-bold text-white tabular-nums leading-none">
            {count}
          </div>
        </div>
      </div>

      {/* 액션 — 복사 = 주요, 기록 자동 증가. 좌측에 취소. */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (count === 0) return;
            onRequestUndo();
          }}
          disabled={count === 0}
          title="마지막 기록 취소"
          className="w-14 h-14 rounded-lg bg-white/[0.05] active:bg-white/[0.1] border border-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
        >
          <Undo2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={async () => {
            if (disabled) return;
            if (!requireLogin()) return;
            await copyLabel(previewLabel);
            if (isRange) {
              if (rangeOpenSeq != null) onCloseRangeEnd();
              else onAddRangeStart();
            } else {
              onAddPoint();
            }
          }}
          disabled={disabled}
          className={`flex-1 h-14 rounded-lg text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition shadow-md ${
            rangeOpenSeq != null
              ? "bg-emerald-600 active:bg-emerald-700 shadow-emerald-500/30 ring-2 ring-emerald-400/40"
              : isTypo
                ? "bg-gray-600 active:bg-gray-700 shadow-none"
                : "bg-orange-500 active:bg-orange-600 shadow-orange-500/30"
          }`}
        >
          {copied === previewLabel ? (
            <span className="inline-flex items-center gap-2 text-base">
              <Check className="h-5 w-5" />
              복사됨 · 다음: {(() => {
                if (isRange) {
                  const it = item as Extract<ItemDef, { type: "range" }>;
                  // 방금 시작 등록 → 다음은 종료 같은 seq / 방금 종료 → 다음은 시작 nextSeq+1
                  return rangeOpenSeq != null
                    ? `${it.startLabel}${pad2(nextSeq + 1)}`
                    : `${it.endLabel}${pad2(nextSeq)}`;
                }
                return `${(item as Extract<ItemDef, { type: "point" }>).pointLabel ?? item.label}${pad2(nextSeq + 1)}`;
              })()}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-lg">
              <Copy className="h-5 w-5" />
              {previewLabel}
              <span className="text-white/70 text-xs font-normal">복사</span>
            </span>
          )}
        </button>
      </div>

      {/* 기록 이력 — 기본 3건, 더보기로 전체 */}
      {entries.length > 0 ? (
        <div className="border-t border-white/5 pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-gray-500">
              기록 {entries.length}건
              {entries.length > 3 && !showAll ? (
                <span className="text-gray-600"> · 최근 3건</span>
              ) : null}
            </span>
            {entries.length > 3 ? (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-[11px] text-orange-300 hover:text-orange-200 font-semibold"
              >
                {showAll ? "접기" : `더보기 (+${entries.length - 3})`}
              </button>
            ) : null}
          </div>
          <ul
            className={`space-y-1 text-sm ${
              showAll && entries.length > 6
                ? "max-h-56 overflow-y-auto pr-1"
                : ""
            }`}
          >
            {(showAll ? entries.slice().reverse() : entries.slice(-3).reverse()).map(
              (e, i) => {
                const label = isRange
                  ? `${(item as Extract<ItemDef, { type: "range" }>).startLabel}${pad2(e.seq)}`
                  : `${(item as Extract<ItemDef, { type: "point" }>).pointLabel ?? item.label}${pad2(e.seq)}`;
                const isOpen = "start" in e && e.end == null;
                const timeText =
                  "timestamp" in e && e.timestamp
                    ? formatClock(e.timestamp)
                    : "start" in e && e.start
                      ? e.end
                        ? `${formatClock(e.start)} → ${formatClock(e.end)}`
                        : `${formatClock(e.start)} → 진행중`
                      : "";
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-gray-300 font-mono truncate">
                      {label}
                    </span>
                    <span
                      className={`font-mono text-xs shrink-0 ${
                        isOpen ? "text-emerald-400" : "text-gray-500"
                      }`}
                    >
                      {timeText}
                      {isOpen ? (
                        <ArrowRight className="inline h-3 w-3 ml-0.5" />
                      ) : null}
                    </span>
                  </li>
                );
              }
            )}
          </ul>
        </div>
      ) : null}

      <AlertDialog open={infoOpen} onOpenChange={setInfoOpen}>
        <AlertDialogContent className="bg-[#111116] border-white/10 text-gray-100 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl flex items-center gap-2">
              {item.label}
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  isRange
                    ? "bg-violet-500/20 text-violet-300"
                    : "bg-sky-500/20 text-sky-300"
                }`}
              >
                {isRange ? "구간형" : "지점형"}
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-gray-300">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">분류</div>
                  <div className="text-base text-white font-semibold">
                    {item.category}
                  </div>
                </div>
                {item.hint ? (
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">설명</div>
                    <div className="text-base text-gray-200 leading-snug">
                      {item.hint}
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="text-xs text-gray-500 mb-1">라벨 형식</div>
                  {isRange ? (
                    <div className="space-y-1 text-base text-gray-200">
                      <div className="font-mono">
                        시작:{" "}
                        <span className="text-orange-300 font-bold">
                          {
                            (item as Extract<ItemDef, { type: "range" }>)
                              .startLabel
                          }
                          NN
                        </span>
                      </div>
                      <div className="font-mono">
                        종료:{" "}
                        <span className="text-emerald-300 font-bold">
                          {
                            (item as Extract<ItemDef, { type: "range" }>)
                              .endLabel
                          }
                          NN
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-base text-orange-300 font-bold">
                      {(item as Extract<ItemDef, { type: "point" }>)
                        .pointLabel ?? item.label}
                      NN
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">
                    현재 카운트
                  </div>
                  <div className="text-2xl font-bold text-white tabular-nums">
                    {count}
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setInfoOpen(false)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              닫기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
