"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  submitTrailResume,
  uploadResumePhoto,
  type TrailExperience,
} from "@/lib/trail-resume";
import { cn } from "@/lib/utils";

type FormState = {
  name: string;
  resident_number: string;
  address: string;
  phone: string;
  email: string;
  photo_url: string | null;
  trail_experiences: TrailExperience[];
  notes: string;
};

const EMPTY_EXP: TrailExperience = {
  period_from: "",
  period_to: null,
  title: "",
  description: "",
};

function emptyForm(): FormState {
  return {
    name: "",
    resident_number: "",
    address: "",
    phone: "",
    email: "",
    photo_url: null,
    trail_experiences: [{ ...EMPTY_EXP }],
    notes: "",
  };
}

export default function TrailResumeForm() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setExp = (i: number, patch: Partial<TrailExperience>) => {
    setForm((prev) => ({
      ...prev,
      trail_experiences: prev.trail_experiences.map((e, idx) =>
        idx === i ? { ...e, ...patch } : e
      ),
    }));
  };

  const addExp = () => {
    setForm((prev) => ({
      ...prev,
      trail_experiences: [...prev.trail_experiences, { ...EMPTY_EXP }],
    }));
  };

  const removeExp = (i: number) => {
    setForm((prev) => ({
      ...prev,
      trail_experiences: prev.trail_experiences.filter((_, idx) => idx !== i),
    }));
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 10MB 제한
    if (file.size > 10 * 1024 * 1024) {
      setError("사진은 10MB 이하만 업로드할 수 있어요.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadResumePhoto(file);
      set("photo_url", url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진 업로드 실패");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // 빈 경력 항목 제거
      const cleanExps = form.trail_experiences
        .filter(
          (e) =>
            e.period_from.trim() ||
            e.title.trim() ||
            e.description.trim()
        )
        .map((e) => ({
          period_from: e.period_from.trim(),
          period_to: e.period_to ? e.period_to.trim() : null,
          title: e.title.trim(),
          description: e.description.trim(),
        }));

      await submitTrailResume({
        name: form.name.trim(),
        resident_number: form.resident_number.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        photo_url: form.photo_url,
        trail_experiences: cleanExps,
        notes: form.notes.trim() || null,
      });
      setSubmitted(true);
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출 실패");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return <SubmittedView />;

  return (
    <div className="min-h-screen bg-[#08080f] text-gray-100">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.10),transparent_65%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <header className="sticky top-0 z-50 bg-[#08080f]/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/home_logo.png"
              alt="Hillyheally"
              width={72}
              height={40}
              className="h-12 w-auto"
            />
          </Link>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-12 lg:py-16 max-w-3xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl lg:text-4xl font-bold mb-3 leading-tight">
            <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-pink-500 bg-clip-text text-transparent">
              동서트레일 조사 이력서
            </span>
          </h1>
          <p className="text-sm text-gray-400">
            아래 항목을 입력해주세요. 사진은 이력서 우상단에 표시됩니다.
          </p>
        </div>

        {/* 인적사항 */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-6 lg:p-8 mb-6">
          <h2 className="text-lg font-semibold mb-6 flex items-baseline gap-2">
            <span className="text-orange-400 tabular-nums text-sm">01</span>
            <span className="text-white">인적사항</span>
          </h2>

          <div className="flex flex-col lg:flex-row gap-6 mb-6">
            {/* 사진 */}
            <div className="flex-shrink-0">
              <label className="block text-xs text-gray-400 mb-2">사진</label>
              <div
                className="relative w-32 h-40 rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center cursor-pointer hover:border-orange-400/40 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {form.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.photo_url}
                    alt="사진"
                    className="w-full h-full object-cover"
                  />
                ) : uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : (
                  <div className="text-center px-3">
                    <ImagePlus className="h-6 w-6 mx-auto text-gray-500 mb-1.5" />
                    <p className="text-[10px] text-gray-500">클릭해서 업로드</p>
                  </div>
                )}
                {form.photo_url ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      set("photo_url", null);
                    }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                    aria-label="사진 제거"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFile}
              />
            </div>

            {/* 이름·연락처 */}
            <div className="flex-1 grid grid-cols-1 gap-4">
              <Field
                label="이름 *"
                value={form.name}
                onChange={(v) => set("name", v)}
                placeholder="홍길동"
                required
              />
              <Field
                label="주민번호"
                value={form.resident_number}
                onChange={(v) => set("resident_number", v)}
                placeholder="123456-1234567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="주소"
              value={form.address}
              onChange={(v) => set("address", v)}
              placeholder="서울시 서초구 서초중앙로 123, 1층"
              full
            />
            <Field
              label="휴대전화"
              value={form.phone}
              onChange={(v) => set("phone", v)}
              placeholder="010-1234-5678"
            />
            <Field
              label="Email"
              value={form.email}
              onChange={(v) => set("email", v)}
              placeholder="you@example.com"
              type="email"
            />
          </div>
        </section>

        {/* 트레일 경력 */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-6 lg:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-baseline gap-2">
              <span className="text-orange-400 tabular-nums text-sm">02</span>
              <span className="text-white">트레일 경력</span>
            </h2>
            <button
              type="button"
              onClick={addExp}
              className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] px-3 py-1.5 text-xs font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" /> 항목 추가
            </button>
          </div>

          <div className="space-y-5">
            {form.trail_experiences.map((exp, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400">경력 #{i + 1}</span>
                  {form.trail_experiences.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeExp(i)}
                      className="text-gray-500 hover:text-rose-400"
                      aria-label="이 경력 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <Field
                    label="시작 (YYYY-MM)"
                    value={exp.period_from}
                    onChange={(v) => setExp(i, { period_from: v })}
                    placeholder="2024-03"
                  />
                  <Field
                    label="종료 (YYYY-MM, 진행중이면 비움)"
                    value={exp.period_to ?? ""}
                    onChange={(v) => setExp(i, { period_to: v || null })}
                    placeholder="2025-06"
                  />
                </div>
                <Field
                  label="트레일 / 활동명"
                  value={exp.title}
                  onChange={(v) => setExp(i, { title: v })}
                  placeholder="동서트레일 5구간 완주"
                  full
                />
                <div className="mt-3">
                  <label className="block text-xs text-gray-400 mb-1.5">
                    활동 내용
                  </label>
                  <textarea
                    value={exp.description}
                    onChange={(e) =>
                      setExp(i, { description: e.target.value })
                    }
                    rows={3}
                    placeholder="본인이 맡은 역할, 구간 정보, 특이사항 등"
                    className="w-full rounded-lg bg-white/[0.03] border border-white/10 text-gray-100 placeholder:text-gray-600 px-3 py-2 text-sm focus:outline-none focus:border-orange-400/40"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col items-center gap-3">
          {error ? (
            <p className="text-sm text-red-400 text-center" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !form.name.trim()}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full font-medium text-sm",
              "bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg shadow-orange-500/20",
              "transition-all hover:scale-[1.02] hover:shadow-orange-500/30",
              "disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
            )}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "제출 중…" : "이력서 제출"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <div className={cn(full ? "md:col-span-2" : "")}>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg bg-white/[0.03] border border-white/10 text-gray-100 placeholder:text-gray-600 px-3 py-2 text-sm focus:outline-none focus:border-orange-400/40"
      />
    </div>
  );
}

function SubmittedView() {
  return (
    <div className="min-h-screen bg-[#08080f] text-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md text-center py-16">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold mb-3">제출 완료</h1>
        <p className="text-gray-400 mb-8">
          이력서가 안전하게 접수되었습니다. 감사합니다.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium border border-white/10 hover:border-orange-400/40 hover:text-orange-300 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
