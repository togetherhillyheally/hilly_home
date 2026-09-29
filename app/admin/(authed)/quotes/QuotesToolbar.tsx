"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export default function QuotesToolbar({
  initialQuery,
  total,
}: {
  initialQuery: string;
  total: number;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  const submit = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/admin/quotes${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="수신인·견적명·번호 검색"
          className="w-full h-9 pl-8 pr-8 rounded-md bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-orange-400/50"
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              router.push("/admin/quotes");
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-gray-500 hover:text-white"
            aria-label="검색어 지우기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <span className="text-xs text-gray-500">{total}건</span>
    </div>
  );
}
