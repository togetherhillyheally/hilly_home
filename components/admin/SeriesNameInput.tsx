"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

// 모듈 전역 캐시 — 즉시 보여주기용. 마운트마다 백그라운드에서 refetch 하므로
// 새 시리즈가 등록되면 다음 마운트 시 자동 반영됨.
let cachedNames: string[] | null = null;
let inflight: Promise<string[]> | null = null;

async function fetchSeriesNames(): Promise<string[]> {
  if (inflight) return inflight;
  inflight = fetch("/api/admin/trails/series-names", { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      const arr = Array.isArray(d?.names) ? (d.names as string[]) : [];
      cachedNames = arr;
      return arr;
    })
    .catch(() => [] as string[])
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** 시리즈명 캐시를 즉시 무효화. 새 시리즈를 등록·수정한 직후 호출. */
export function invalidateSeriesNamesCache(): void {
  cachedNames = null;
}

export default function SeriesNameInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: Props) {
  const [names, setNames] = useState<string[]>(cachedNames ?? []);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // 마운트 시 stale-while-revalidate — 캐시 있으면 즉시 보여주고
  // 백그라운드에서 항상 새로 fetch하여 최신 시리즈명을 반영함.
  useEffect(() => {
    let cancelled = false;
    // 캐시는 이미 useState 초기값으로 들어가 있음 — 즉시 표시.
    // 매 마운트마다 refetch
    fetchSeriesNames().then((arr) => {
      if (cancelled) return;
      setNames(arr);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const filtered = useMemo(() => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return names.slice(0, 8);
    return names
      .filter(
        (n) => n.toLowerCase().includes(trimmed) && n !== value.trim()
      )
      .slice(0, 8);
  }, [names, value]);

  const showDropdown = open && filtered.length > 0;

  const select = (n: string) => {
    onChange(n);
    setOpen(false);
  };

  return (
    <div className={"relative " + (className ?? "")} ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
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
        className="w-full h-10 px-3 pr-9 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
      />
      {names.length > 0 && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((v) => !v);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300"
          aria-label="시리즈명 목록 열기"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-[#0f0f17] shadow-xl shadow-black/40 z-20">
          {filtered.map((n) => (
            <button
              key={n}
              type="button"
              // onMouseDown 으로 처리 — input blur 보다 먼저 실행되어야 선택 동작
              onMouseDown={(e) => {
                e.preventDefault();
                select(n);
              }}
              className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/[0.06] border-b border-white/5 last:border-b-0"
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
