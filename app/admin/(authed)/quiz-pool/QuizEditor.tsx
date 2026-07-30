"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, X } from "lucide-react";

export type QuizRow = {
  id: string;
  category: string;
  question: string;
  choices: string[];
  answer_index: number;
  is_active: boolean;
};

const CATEGORY_LABEL: Record<string, string> = {
  trivia: "상식",
  dadjoke: "아재개그",
};

function emptyDraft(): Omit<QuizRow, "id" | "is_active"> {
  return { category: "trivia", question: "", choices: ["", ""], answer_index: 0 };
}

/** 신규 추가 폼 */
export function QuizCreate() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/quiz-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
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
        <Plus className="h-4 w-4" /> 퀴즈 추가
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <QuizFields draft={draft} setDraft={setDraft} />
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
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/90 px-3.5 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} 저장
        </button>
      </div>
    </div>
  );
}

/** 질문/선택지/정답 공통 입력 */
function QuizFields({
  draft,
  setDraft,
}: {
  draft: Omit<QuizRow, "id" | "is_active">;
  setDraft: React.Dispatch<React.SetStateAction<Omit<QuizRow, "id" | "is_active">>>;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2">
        {(["trivia", "dadjoke"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setDraft((d) => ({ ...d, category: c }))}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold border ${
              draft.category === c
                ? "border-orange-500 bg-orange-500/15 text-orange-300"
                : "border-white/10 text-gray-400"
            }`}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <input
        value={draft.question}
        onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
        placeholder="질문"
        className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
      />
      {draft.choices.map((choice, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            onClick={() => setDraft((d) => ({ ...d, answer_index: i }))}
            title="정답으로 지정"
            className={`h-6 w-6 shrink-0 rounded-full border-2 ${
              draft.answer_index === i
                ? "border-emerald-400 bg-emerald-400/20"
                : "border-white/20"
            }`}
          />
          <input
            value={choice}
            onChange={(e) =>
              setDraft((d) => {
                const choices = [...d.choices];
                choices[i] = e.target.value;
                return { ...d, choices };
              })
            }
            placeholder={`선택지 ${i + 1}`}
            className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
          />
          {draft.choices.length > 2 && (
            <button
              onClick={() =>
                setDraft((d) => {
                  const choices = d.choices.filter((_, idx) => idx !== i);
                  const answer_index =
                    d.answer_index === i
                      ? 0
                      : d.answer_index > i
                        ? d.answer_index - 1
                        : d.answer_index;
                  return { ...d, choices, answer_index };
                })
              }
              className="text-gray-500 hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {draft.choices.length < 4 && (
        <button
          onClick={() =>
            setDraft((d) => ({ ...d, choices: [...d.choices, ""] }))
          }
          className="inline-flex items-center gap-1 self-start text-sm text-gray-400 hover:text-gray-200"
        >
          <Plus className="h-3.5 w-3.5" /> 선택지 추가
        </button>
      )}
      <p className="text-xs text-gray-500">
        초록 원이 정답이에요. 도착 시 랜덤으로 이 퀴즈가 출제됩니다.
      </p>
    </div>
  );
}

/** 행 액션 — 활성 토글 / 삭제 */
export function QuizRowActions({ row }: { row: QuizRow }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  const patch = async (payload: Record<string, unknown>) => {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/quiz-pool/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        alert(d.error ?? "변경 실패");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    if (!confirm("이 퀴즈를 삭제할까요?")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/quiz-pool/${row.id}`, {
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
    <div className="flex items-center gap-3">
      <button
        onClick={() => patch({ is_active: !row.is_active })}
        disabled={pending}
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          row.is_active
            ? "bg-emerald-500/15 text-emerald-300"
            : "bg-white/5 text-gray-500"
        }`}
      >
        {row.is_active ? "활성" : "비활성"}
      </button>
      <button
        onClick={remove}
        disabled={pending}
        className="text-gray-500 hover:text-red-400"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
