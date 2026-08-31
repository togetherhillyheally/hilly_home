"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, History, Loader2, RotateCcw, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Version = {
  id: string;
  version: number;
  effective_date: string;
  saved_at: string;
  saved_by: string | null;
};

type Props = {
  type: "terms" | "privacy";
  initialContent: string;
  initialEffectiveDate: string;
  versions: Version[];
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LegalEditor({
  type,
  initialContent,
  initialEffectiveDate,
  versions,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [content, setContent] = useState(initialContent);
  const [effectiveDate, setEffectiveDate] = useState(initialEffectiveDate);
  const [preview, setPreview] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const dirty =
    content !== initialContent || effectiveDate !== initialEffectiveDate;

  const save = async () => {
    setError(null);
    setMsg(null);
    if (!content.trim()) {
      setError("내용이 비어있어요.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
      setError("시행일 형식이 잘못됐어요. (YYYY-MM-DD)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/legal/${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_md: content,
          effective_date: effectiveDate,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? `실패 (${res.status})`);
        return;
      }
      setMsg("저장되었습니다. 이전 버전은 히스토리에서 확인할 수 있어요.");
      startTransition(() => router.refresh());
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  };

  const rollback = async (versionId: string, versionNumber: number) => {
    if (
      !window.confirm(
        `버전 ${versionNumber} 내용으로 되돌릴까요? 현재 편집 중인 내용이 있으면 유실됩니다.`
      )
    )
      return;
    setSubmitting(true);
    setError(null);
    setMsg(null);
    try {
      const listRes = await fetch(`/api/admin/legal/${type}/versions`, {
        cache: "no-store",
      });
      if (!listRes.ok) {
        setError("이력 조회 실패");
        return;
      }
      const data = (await listRes.json()) as {
        versions: Array<{
          id: string;
          content_md: string;
          effective_date: string;
        }>;
      };
      const found = data.versions.find((v) => v.id === versionId);
      if (!found) {
        setError("해당 버전을 불러올 수 없어요.");
        return;
      }
      const putRes = await fetch(`/api/admin/legal/${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_md: found.content_md,
          effective_date: found.effective_date,
        }),
      });
      if (!putRes.ok) {
        const err = (await putRes.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(err.error ?? "롤백 실패");
        return;
      }
      setContent(found.content_md);
      setEffectiveDate(found.effective_date);
      setMsg(`버전 ${versionNumber} 내용으로 되돌렸습니다.`);
      startTransition(() => router.refresh());
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 시행일 + 액션 */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs text-gray-400 mb-1.5">시행일</div>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs font-medium border border-white/10"
        >
          {preview ? (
            <>
              <EyeOff className="h-3.5 w-3.5" /> 편집만
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" /> 미리보기 열기
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs font-medium border border-white/10"
        >
          <History className="h-3.5 w-3.5" />
          이력 {versions.length}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={submitting || !dirty}
          className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm font-medium"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          저장
        </button>
      </div>

      {error ? (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      ) : null}
      {msg ? (
        <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          {msg}
        </div>
      ) : null}

      {/* 편집기 + 미리보기 */}
      <div
        className={`grid gap-4 ${preview ? "lg:grid-cols-2" : "grid-cols-1"}`}
      >
        <div>
          <div className="text-xs text-gray-400 mb-1.5">
            내용 (Markdown) · {content.length.toLocaleString()}자
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="w-full h-[70vh] px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-gray-100 text-sm font-mono leading-relaxed focus:outline-none focus:border-emerald-500/50 resize-none"
            placeholder="# 제1장 총칙&#10;&#10;## 제1조 (목적)&#10;&#10;본 약관은..."
          />
        </div>
        {preview ? (
          <div>
            <div className="text-xs text-gray-400 mb-1.5">미리보기</div>
            <div className="h-[70vh] overflow-y-auto rounded-lg bg-white/[0.02] border border-white/10 p-5">
              <article className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-200 prose-li:text-gray-200 prose-strong:text-white prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </article>
            </div>
          </div>
        ) : null}
      </div>

      {/* 히스토리 */}
      {historyOpen ? (
        <section className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 text-sm font-semibold text-white flex items-center gap-2">
            <History className="h-4 w-4 text-gray-400" />
            버전 이력
          </div>
          {versions.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              저장 이력이 없어요.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.03] text-gray-400 text-xs">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">버전</th>
                    <th className="text-left px-4 py-2 font-medium">시행일</th>
                    <th className="text-left px-4 py-2 font-medium">저장 시각</th>
                    <th className="text-right px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id} className="border-t border-white/5">
                      <td className="px-4 py-2 text-white font-mono">
                        v{v.version}
                      </td>
                      <td className="px-4 py-2 text-gray-300 font-mono">
                        {v.effective_date}
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs">
                        {formatDate(v.saved_at)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => rollback(v.id, v.version)}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-emerald-300 disabled:opacity-50"
                        >
                          <RotateCcw className="h-3 w-3" />이 버전으로 되돌리기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
