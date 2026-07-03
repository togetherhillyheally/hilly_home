"use client";

/**
 * 트레일 선택 콤보박스 — 포커스/클릭 시 드롭다운이 absolute 오버레이로 뜸.
 * 첫 포커스 때 최대 200개 트레일을 한번 로드하고 모듈 캐시. 이후 클라이언트 필터.
 * 선택된 트레일은 pill 로 표시, X 로 클리어.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";

export type TrailMini = {
  id: string;
  name: string;
  series_name: string | null;
};

type Props = {
  value: TrailMini | null;
  onChange: (t: TrailMini | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

let CACHE: TrailMini[] | null = null;
let INFLIGHT: Promise<TrailMini[]> | null = null;

async function loadTrails(): Promise<TrailMini[]> {
  if (CACHE) return CACHE;
  if (INFLIGHT) return INFLIGHT;
  INFLIGHT = fetch("/api/admin/trails/search?limit=200", { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      const arr = Array.isArray(d?.rows) ? (d.rows as TrailMini[]) : [];
      CACHE = arr;
      return arr;
    })
    .catch(() => [] as TrailMini[])
    .finally(() => {
      INFLIGHT = null;
    });
  return INFLIGHT;
}

export function invalidateTrailPickerCache(): void {
  CACHE = null;
}

export default function TrailPicker({
  value,
  onChange,
  placeholder = "트레일명 또는 시리즈명 검색",
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [trails, setTrails] = useState<TrailMini[]>(CACHE ?? []);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 첫 오픈 시 로드
  useEffect(() => {
    if (!open) return;
    if (CACHE) return;
    let cancelled = false;
    setLoading(true);
    loadTrails().then((arr) => {
      if (cancelled) return;
      setTrails(arr);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // 바깥 클릭으로 닫기
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return trails.slice(0, 30);
    return trails
      .filter((t) => {
        const hay = `${t.series_name ?? ""} ${t.name}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 30);
  }, [trails, query]);

  const select = (t: TrailMini) => {
    onChange(t);
    setOpen(false);
    setQuery("");
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className={"relative " + (className ?? "")} ref={wrapperRef}>
      {value ? (
        <div className="flex items-center justify-between gap-2 px-3 h-9 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 text-xs">
          <div className="truncate">
            {value.series_name ? (
              <span className="text-emerald-300/70">
                {value.series_name} ·{" "}
              </span>
            ) : null}
            {value.name}
          </div>
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="text-emerald-300 hover:text-white"
            aria-label="선택 해제"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "Enter" && filtered.length === 1) {
                e.preventDefault();
                select(filtered[0]);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full h-9 px-3 pr-9 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-emerald-500/50"
          />
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen((v) => !v);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300"
            aria-label="목록 열기"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open ? (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-[#0f0f17] shadow-xl shadow-black/40 z-30">
              {loading ? (
                <div className="px-3 py-3 text-xs text-gray-500 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> 불러오는 중…
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-3 text-xs text-gray-500">
                  {query.trim()
                    ? "일치하는 트레일이 없어요."
                    : "트레일 목록이 비어있어요."}
                </div>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(t);
                    }}
                    className="block w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-emerald-500/10 hover:text-white border-b border-white/5 last:border-b-0"
                  >
                    {t.series_name ? (
                      <span className="text-gray-500">{t.series_name} · </span>
                    ) : null}
                    {t.name}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
