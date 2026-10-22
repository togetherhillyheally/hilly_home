"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";

export default function TrailNameEdit({
  trailId,
  initialName,
}: {
  trailId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const begin = () => {
    setDraft(name);
    setError(null);
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
    setDraft(name);
  };

  const commit = () => {
    const next = draft.trim();
    if (!next) {
      setError("이름을 비울 수 없어요.");
      return;
    }
    if (next === name) {
      setEditing(false);
      return;
    }
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/trails/${trailId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: next }),
        });
        if (!res.ok) {
          const d = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(d?.error ?? `저장 실패 (${res.status})`);
          return;
        }
        setName(next);
        setEditing(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "네트워크 오류");
      }
    });
  };

  if (!editing) {
    return (
      <h1 className="group text-2xl lg:text-3xl font-bold text-white tracking-tight inline-flex items-center gap-2 min-w-0">
        <span className="truncate">{name}</span>
        <button
          type="button"
          onClick={begin}
          className="opacity-40 group-hover:opacity-100 hover:text-orange-300 transition-opacity shrink-0"
          title="지도 이름 수정"
          aria-label="지도 이름 수정"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </h1>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        disabled={saving}
        maxLength={120}
        className="min-w-[260px] max-w-full h-11 px-3 rounded-lg bg-white/[0.04] border border-orange-500/50 text-white text-2xl lg:text-3xl font-bold tracking-tight focus:outline-none focus:border-orange-400"
      />
      <button
        type="button"
        onClick={commit}
        disabled={saving || !draft.trim()}
        className="h-9 px-3 rounded-md bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        저장
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={saving}
        className="h-9 px-3 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs inline-flex items-center gap-1.5"
      >
        <X className="h-3.5 w-3.5" />
        취소
      </button>
      {error && (
        <span className="text-xs text-red-300 w-full">{error}</span>
      )}
    </div>
  );
}
