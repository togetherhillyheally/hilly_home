"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  /** API endpoint that returns { names: string[] }. 결과는 모듈 전역 캐시. */
  fetchUrl: string;
  /** 캐시 key. 동일 키는 같은 캐시를 공유. */
  cacheKey: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

type CacheEntry = {
  names: string[] | null;
  inflight: Promise<string[]> | null;
};

const CACHE_REGISTRY = new Map<string, CacheEntry>();

function ensureEntry(key: string): CacheEntry {
  let e = CACHE_REGISTRY.get(key);
  if (!e) {
    e = { names: null, inflight: null };
    CACHE_REGISTRY.set(key, e);
  }
  return e;
}

async function fetchNames(key: string, url: string): Promise<string[]> {
  const e = ensureEntry(key);
  if (e.inflight) return e.inflight;
  e.inflight = fetch(url, { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      const arr = Array.isArray(d?.names) ? (d.names as string[]) : [];
      e.names = arr;
      return arr;
    })
    .catch(() => [] as string[])
    .finally(() => {
      e.inflight = null;
    });
  return e.inflight;
}

/** 외부에서 캐시 무효화 */
export function invalidateAutocompleteCache(cacheKey: string): void {
  const e = CACHE_REGISTRY.get(cacheKey);
  if (e) e.names = null;
}

export default function AutocompleteInput({
  value,
  onChange,
  fetchUrl,
  cacheKey,
  placeholder,
  disabled,
  className,
}: Props) {
  const initial = CACHE_REGISTRY.get(cacheKey)?.names ?? [];
  const [names, setNames] = useState<string[]>(initial);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNames(cacheKey, fetchUrl).then((arr) => {
      if (cancelled) return;
      setNames(arr);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey, fetchUrl]);

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
      .filter((n) => n.toLowerCase().includes(trimmed) && n !== value.trim())
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
          aria-label="목록 열기"
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
