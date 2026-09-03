"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

export type DenyRow = {
  id: string;
  pattern: string;
  match_type: "exact" | "contains";
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Draft = {
  pattern: string;
  match_type: "exact" | "contains";
  note: string;
};

function emptyDraft(): Draft {
  return { pattern: "", match_type: "exact", note: "" };
}

export function DenyCreate() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/nickname-denylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern: draft.pattern.trim(),
          match_type: draft.match_type,
          note: draft.note.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(data.error ?? "추가 실패");
        return;
      }
      setDraft(emptyDraft());
      setOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/90 hover:bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white"
      >
        <Plus className="h-4 w-4" /> 차단 추가
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 min-w-[320px]">
      <div className="flex gap-2 mb-2.5">
        {(["exact", "contains"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setDraft((d) => ({ ...d, match_type: t }))}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold border ${
              draft.match_type === t
                ? "border-orange-500 bg-orange-500/15 text-orange-300"
                : "border-white/10 text-gray-400"
            }`}
          >
            {t === "exact" ? "정확히 일치" : "포함"}
          </button>
        ))}
      </div>
      <input
        value={draft.pattern}
        onChange={(e) => setDraft((d) => ({ ...d, pattern: e.target.value }))}
        placeholder="차단할 문자열 (예: 힐리힐리)"
        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60 mb-2"
      />
      <input
        value={draft.note}
        onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        placeholder="메모 (선택, 예: 브랜드명)"
        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
      />
      <p className="text-xs text-gray-500 mt-2">
        {draft.match_type === "exact"
          ? "닉네임 전체가 이 문자열과 정확히 같을 때만 차단해요."
          : "닉네임 어디에든 이 문자열이 포함되면 차단해요."}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => {
            setOpen(false);
            setDraft(emptyDraft());
          }}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300"
        >
          취소
        </button>
        <button
          onClick={submit}
          disabled={saving || !draft.pattern.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/90 px-3.5 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} 저장
        </button>
      </div>
    </div>
  );
}

export function DenyRowActions({ row }: { row: DenyRow }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  const remove = async () => {
    if (!confirm(`"${row.pattern}" 차단을 해제할까요?`)) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/nickname-denylist/${row.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        alert("삭제 실패");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={remove}
      disabled={pending}
      className="text-gray-500 hover:text-red-400"
      title="차단 해제"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
