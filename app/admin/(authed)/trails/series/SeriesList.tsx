"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { invalidateSeriesNamesCache } from "@/components/admin/SeriesNameInput";

type Item = { name: string; count: number };

export default function SeriesList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const existingNames = new Set(items.map((i) => i.name));

  const startEdit = (name: string) => {
    setEditing(name);
    setDraft(name);
    setError(null);
    setInfo(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
    setError(null);
  };

  const submit = (from: string) => {
    const to = draft.trim();
    if (!to) {
      setError("새 시리즈명을 입력해주세요.");
      return;
    }
    if (to === from) {
      cancelEdit();
      return;
    }
    if (existingNames.has(to)) {
      setError(
        `이미 "${to}" 시리즈가 있어요. 두 시리즈를 합치려면 먼저 확인해주세요.`
      );
      return;
    }
    setError(null);
    startSave(async () => {
      try {
        const res = await fetch("/api/admin/trails/series-rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setError(data?.error ?? "변경 실패");
          return;
        }
        invalidateSeriesNamesCache();
        setInfo(`"${from}" → "${to}" (${data.updated}개 지도 갱신)`);
        setEditing(null);
        setDraft("");
        router.refresh();
        setTimeout(() => setInfo(null), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "변경 실패");
      }
    });
  };

  return (
    <div className="space-y-3">
      {info && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{info}</span>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-gray-400 text-xs">
            <tr>
              <th className="text-left px-4 py-3 font-medium">시리즈명</th>
              <th className="text-right px-3 py-3 font-medium w-24">지도 수</th>
              <th className="text-right px-3 py-3 font-medium w-40">관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => {
              const isEditing = editing === s.name;
              return (
                <tr
                  key={s.name}
                  className="border-t border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submit(s.name);
                          else if (e.key === "Escape") cancelEdit();
                        }}
                        disabled={saving}
                        autoFocus
                        className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-orange-500/40 text-white text-sm focus:outline-none focus:border-orange-500/70"
                      />
                    ) : (
                      <span className="text-white">{s.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-gray-300">
                    {s.count}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {isEditing ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => submit(s.name)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white text-xs font-medium"
                        >
                          {saving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={saving}
                          className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 text-xs"
                        >
                          <X className="h-3 w-3" />
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(s.name)}
                        className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 hover:text-white text-xs"
                      >
                        <Pencil className="h-3 w-3" />
                        이름 변경
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
