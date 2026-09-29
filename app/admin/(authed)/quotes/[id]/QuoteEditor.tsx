"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  formatKRW,
  grandTotal,
  itemLineTotal,
  roundDownTo10K,
  sumQuote,
  sumSection,
  type QuoteItem,
  type QuoteRow,
  type QuoteSection,
  type QuoteStatus,
  type TechLevel,
} from "@/lib/quotes";

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: "draft", label: "작성중" },
  { value: "sent", label: "발송" },
  { value: "accepted", label: "수주" },
  { value: "rejected", label: "실주" },
  { value: "archived", label: "보관" },
];

const TECH_LEVELS: TechLevel[] = ["", "초급", "중급", "고급", "특급"];

function newSection(): QuoteSection {
  return {
    category: "",
    group_label: "",
    items: [newItem()],
  };
}

function newItem(): QuoteItem {
  return {
    assignee: "",
    task: "",
    tech_level: "",
    man_month: 0,
    unit_price: 0,
  };
}

export default function QuoteEditor({ initial }: { initial: QuoteRow }) {
  const router = useRouter();
  const [recipient, setRecipient] = useState(initial.recipient);
  const [projectName, setProjectName] = useState(initial.project_name);
  const [quoteDate, setQuoteDate] = useState(initial.quote_date);
  const [preface, setPreface] = useState(initial.preface ?? "");
  const [memo, setMemo] = useState(initial.memo ?? "");
  const [vatIncluded, setVatIncluded] = useState(initial.vat_included);
  const [roundTo10K, setRoundTo10K] = useState(initial.round_to_10k);
  const [status, setStatus] = useState<QuoteStatus>(initial.status);
  const [sections, setSections] = useState<QuoteSection[]>(
    (initial.sections ?? []).map((s) => ({
      ...s,
      items: (s.items ?? []).map((i) => ({ ...i })),
    }))
  );

  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totals = useMemo(
    () => ({
      raw: sumQuote(sections),
      rounded: roundDownTo10K(sumQuote(sections).amount),
      grand: grandTotal({
        sections,
        vat_included: vatIncluded,
        round_to_10k: roundTo10K,
      }),
    }),
    [sections, vatIncluded, roundTo10K]
  );

  const save = () => {
    setError(null);
    setSuccess(null);
    if (!recipient.trim() || !projectName.trim()) {
      setError("수신인·견적명은 필수예요.");
      return;
    }
    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/quotes/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: recipient.trim(),
            project_name: projectName.trim(),
            quote_date: quoteDate,
            preface: preface || null,
            memo: memo || null,
            vat_included: vatIncluded,
            round_to_10k: roundTo10K,
            sections,
            status,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setError(data?.error ?? "저장 실패");
          return;
        }
        setSuccess("저장되었습니다.");
        setTimeout(() => setSuccess(null), 2500);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  };

  const remove = async () => {
    if (
      !confirm(
        `${initial.quote_no ?? "이 견적서"}를 삭제할까요? 되돌릴 수 없어요.`
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/quotes/${initial.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        alert("삭제 실패");
        return;
      }
      router.push("/admin/quotes");
    } finally {
      setDeleting(false);
    }
  };

  // 섹션·항목 조작 헬퍼
  const patchSection = (idx: number, patch: Partial<QuoteSection>) => {
    setSections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  };
  const addSection = () => setSections((prev) => [...prev, newSection()]);
  const removeSection = (idx: number) =>
    setSections((prev) => prev.filter((_, i) => i !== idx));
  const moveSection = (idx: number, dir: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };
  const addItem = (sIdx: number) =>
    setSections((prev) =>
      prev.map((s, i) =>
        i === sIdx ? { ...s, items: [...s.items, newItem()] } : s
      )
    );
  const patchItem = (
    sIdx: number,
    iIdx: number,
    patch: Partial<QuoteItem>
  ) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sIdx
          ? {
              ...s,
              items: s.items.map((it, j) =>
                j === iIdx ? { ...it, ...patch } : it
              ),
            }
          : s
      )
    );
  };
  const removeItem = (sIdx: number, iIdx: number) =>
    setSections((prev) =>
      prev.map((s, i) =>
        i === sIdx
          ? { ...s, items: s.items.filter((_, j) => j !== iIdx) }
          : s
      )
    );

  return (
    <div className="space-y-5">
      {/* 헤더 폼 */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-200">기본 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="수신인" required>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="예: 주식회사 조이웍스"
              className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400/50"
            />
          </Field>
          <Field label="견적명" required>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="예: 굿러너앱 구축 견적서"
              className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400/50"
            />
          </Field>
          <Field label="견적일">
            <input
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400/50"
            />
          </Field>
          <Field label="상태">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as QuoteStatus)}
              className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400/50"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#0c0c14]">
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="서두 안내문" className="md:col-span-2">
            <input
              value={preface}
              onChange={(e) => setPreface(e.target.value)}
              placeholder="본 프로젝트의 내역에 따른 견적서입니다."
              className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400/50"
            />
          </Field>
          <Field label="하단 참고사항 (줄바꿈으로 여러 줄)" className="md:col-span-2">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-md bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400/50 resize-none"
            />
          </Field>
        </div>
        <div className="flex items-center gap-4 pt-1">
          <label className="inline-flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={vatIncluded}
              onChange={(e) => setVatIncluded(e.target.checked)}
              className="accent-orange-500"
            />
            부가세 포함 (합계에 10% 가산)
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={roundTo10K}
              onChange={(e) => setRoundTo10K(e.target.checked)}
              className="accent-orange-500"
            />
            만단위 절사
          </label>
        </div>
      </section>

      {/* 섹션들 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">
            섹션 · 항목 ({sections.length}개 섹션)
          </h2>
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-xs text-white"
          >
            <Plus className="h-3.5 w-3.5" /> 섹션 추가
          </button>
        </div>

        {sections.map((sec, sIdx) => {
          const t = sumSection(sec);
          return (
            <div
              key={sIdx}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-end gap-2">
                <Field label="섹션 헤더" className="flex-1 min-w-[200px]">
                  <input
                    value={sec.group_label ?? ""}
                    onChange={(e) =>
                      patchSection(sIdx, { group_label: e.target.value })
                    }
                    placeholder="예: 1. 전체 구축"
                    className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400/50"
                  />
                </Field>
                <Field label="구분" className="w-40">
                  <input
                    value={sec.category}
                    onChange={(e) =>
                      patchSection(sIdx, { category: e.target.value })
                    }
                    placeholder="개발/출시"
                    className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400/50"
                  />
                </Field>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveSection(sIdx, -1)}
                    disabled={sIdx === 0}
                    className="h-9 px-2 rounded-md bg-white/[0.04] hover:bg-white/[0.1] disabled:opacity-30 text-xs text-gray-300"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(sIdx, 1)}
                    disabled={sIdx === sections.length - 1}
                    className="h-9 px-2 rounded-md bg-white/[0.04] hover:bg-white/[0.1] disabled:opacity-30 text-xs text-gray-300"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(sIdx)}
                    className="h-9 px-2 rounded-md bg-red-500/10 hover:bg-red-500/20 text-xs text-red-300 inline-flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> 섹션
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-white/5">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.03]">
                    <tr className="text-gray-500">
                      <th className="px-2 py-1.5 text-left w-[180px]">담당자</th>
                      <th className="px-2 py-1.5 text-left">담당업무</th>
                      <th className="px-2 py-1.5 text-left w-[80px]">기술등급</th>
                      <th className="px-2 py-1.5 text-right w-[90px]">M/M</th>
                      <th className="px-2 py-1.5 text-right w-[130px]">
                        단가(원)
                      </th>
                      <th className="px-2 py-1.5 text-right w-[130px]">
                        공급가
                      </th>
                      <th className="px-2 py-1.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.items.map((it, iIdx) => (
                      <tr
                        key={iIdx}
                        className="border-t border-white/5 align-middle"
                      >
                        <td className="px-2 py-1">
                          <input
                            value={it.assignee}
                            onChange={(e) =>
                              patchItem(sIdx, iIdx, { assignee: e.target.value })
                            }
                            placeholder="백엔드개발(이기민)"
                            className="w-full h-8 px-2 rounded bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-orange-400/50"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            value={it.task}
                            onChange={(e) =>
                              patchItem(sIdx, iIdx, { task: e.target.value })
                            }
                            placeholder="기능/DB/API설계, 인프라세팅…"
                            className="w-full h-8 px-2 rounded bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-orange-400/50"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <select
                            value={it.tech_level}
                            onChange={(e) =>
                              patchItem(sIdx, iIdx, {
                                tech_level: e.target.value as TechLevel,
                              })
                            }
                            className="w-full h-8 px-1 rounded bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-orange-400/50"
                          >
                            {TECH_LEVELS.map((v) => (
                              <option
                                key={v}
                                value={v}
                                className="bg-[#0c0c14]"
                              >
                                {v || "-"}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            step="0.5"
                            value={it.man_month || ""}
                            onChange={(e) =>
                              patchItem(sIdx, iIdx, {
                                man_month: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full h-8 px-2 rounded bg-white/[0.04] border border-white/10 text-white text-xs text-right tabular-nums focus:outline-none focus:border-orange-400/50"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            step="100000"
                            value={it.unit_price || ""}
                            onChange={(e) =>
                              patchItem(sIdx, iIdx, {
                                unit_price: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full h-8 px-2 rounded bg-white/[0.04] border border-white/10 text-white text-xs text-right tabular-nums focus:outline-none focus:border-orange-400/50"
                          />
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums text-gray-200">
                          {formatKRW(itemLineTotal(it))}
                        </td>
                        <td className="px-2 py-1 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(sIdx, iIdx)}
                            className="text-gray-500 hover:text-red-400 p-1"
                            aria-label="항목 삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 bg-white/[0.02]">
                      <td colSpan={3} className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => addItem(sIdx)}
                          className="text-[11px] text-orange-300 hover:text-orange-200 inline-flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> 항목 추가
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-400 text-[11px]">
                        {t.manMonth.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right text-[10px] text-gray-500">
                        섹션 합계
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-white font-semibold">
                        {formatKRW(t.amount)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}
      </section>

      {/* 합계 */}
      <section className="rounded-xl border border-orange-500/30 bg-orange-500/[0.05] p-5">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-300">
            <div>
              항목 합계:{" "}
              <span className="text-white font-mono">
                {formatKRW(totals.raw.amount)}
              </span>{" "}
              <span className="text-xs text-gray-500">
                (총 {totals.raw.manMonth.toFixed(2)} M/M)
              </span>
            </div>
            {roundTo10K ? (
              <div className="text-[11px] text-gray-500 mt-0.5">
                만단위 절사 → {formatKRW(totals.rounded)}
              </div>
            ) : null}
          </div>
          <div className="text-right">
            <div className="text-[11px] text-gray-400">
              최종 공급가{vatIncluded ? " (부가세 포함)" : " (부가세 별도)"}
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {formatKRW(totals.grand)}
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 inline-flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{success}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 sticky bottom-4 z-10">
        <button
          type="button"
          onClick={remove}
          disabled={deleting || saving}
          className="inline-flex items-center gap-1 h-11 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-300 text-sm"
        >
          <Trash2 className="h-4 w-4" /> 견적서 삭제
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-11 px-6 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white text-sm font-semibold shadow-lg"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          저장
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] text-gray-400 mb-1">
        {label}
        {required ? <span className="text-red-400"> *</span> : null}
      </label>
      {children}
    </div>
  );
}
