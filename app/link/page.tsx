import type { Metadata } from "next";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/store-links";

export const metadata: Metadata = {
  title: "힐리힐리 | hillyheally",
  description:
    "나만의 지도를 만들고, 함께 걷는 경험을 만드세요. 아웃도어 소셜 플랫폼 힐리힐리.",
  openGraph: {
    title: "힐리힐리 | hillyheally",
    description:
      "나만의 지도를 만들고, 함께 걷는 경험을 만드세요. 아웃도어 소셜 플랫폼 힐리힐리.",
    images: ["/images/logo.png"],
  },
};

/** SNS 프로필용 link-in-bio 페이지 — 로고·소개·스토어 링크 카드 */
export default function LinkInBioPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a100d] flex flex-col">
      {/* ── 배경 레이어 ── */}
      {/* 은은한 글로우 (에메랄드 위 / 오렌지 아래) */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-emerald-500/[0.10] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 -right-24 w-[420px] h-[420px] rounded-full bg-orange-500/[0.07] blur-[110px]" />
      {/* 미세 그리드 */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* 하단 정원 실루엣 — 앱 정원의 능선·나무 무드 */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full h-44 opacity-[0.35]"
        viewBox="0 0 800 180"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="lb-hill1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#134e3a" />
            <stop offset="1" stopColor="#0a100d" />
          </linearGradient>
          <linearGradient id="lb-hill2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a6b4d" />
            <stop offset="1" stopColor="#0d1a13" />
          </linearGradient>
        </defs>
        {/* 뒷 능선 */}
        <path
          d="M0 90 Q 100 40 200 82 Q 300 118 400 70 Q 500 30 600 78 Q 700 116 800 66 L 800 180 L 0 180 Z"
          fill="url(#lb-hill1)"
        />
        {/* 뒷 능선 나무들 */}
        {[70, 165, 250, 345, 445, 540, 630, 730].map((x, i) => {
          const y = [86, 76, 96, 82, 62, 70, 90, 74][i];
          return (
            <path
              key={x}
              d={`M${x} ${y - 16} L${x + 7} ${y} L${x - 7} ${y} Z`}
              fill="#0f3d2c"
            />
          );
        })}
        {/* 앞 능선 */}
        <path
          d="M0 140 Q 130 100 260 132 Q 390 162 520 122 Q 650 88 800 128 L 800 180 L 0 180 Z"
          fill="url(#lb-hill2)"
        />
        {/* 앞 능선 나무들 */}
        {[110, 300, 470, 610, 750].map((x, i) => {
          const y = [126, 138, 118, 108, 124][i];
          return (
            <g key={x}>
              <path
                d={`M${x} ${y - 22} L${x + 9} ${y} L${x - 9} ${y} Z`}
                fill="#14523b"
              />
              <path
                d={`M${x} ${y - 34} L${x + 6.5} ${y - 14} L${x - 6.5} ${y - 14} Z`}
                fill="#14523b"
              />
            </g>
          );
        })}
      </svg>

      {/* ── 콘텐츠 ── */}
      <main className="relative z-10 flex-1 w-full max-w-md mx-auto px-6 pt-16 pb-10 flex flex-col items-center">
        {/* 로고 — 레드 그라디언트 링 + 글로우 */}
        <div className="animate-fade-in-up relative">
          <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-red-500/50 via-transparent to-rose-400/40 blur-md" />
          <div className="relative w-28 h-28 rounded-[28px] p-[1.5px] bg-gradient-to-br from-red-400/70 via-white/10 to-rose-500/60 shadow-2xl shadow-black/50">
            <div className="w-full h-full rounded-[26.5px] bg-[#101a14] flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/home_logo.png"
                alt="힐리힐리 로고"
                className="w-[86px] h-auto object-contain drop-shadow-[0_2px_10px_rgba(248,113,113,0.3)]"
              />
            </div>
          </div>
        </div>

        {/* 소개 */}
        <p className="animate-fade-in-up delay-200 mt-7 text-center text-[15px] leading-relaxed text-gray-200">
          나만의 지도를 만들고,
          <br />
          함께 걷는 경험을 만드세요.
        </p>


        {/* 키워드 칩 */}
        <div className="animate-fade-in-up delay-400 mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {["🥾 코스 탐색", "⛰️ 모험", "🧩 퍼즐", "🌱 정원"].map((t) => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[11px] text-gray-300"
            >
              {t}
            </span>
          ))}
        </div>

        {/* 링크 카드 */}
        <div className="mt-10 w-full space-y-3.5">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="animate-fade-in-up delay-500 group relative flex items-center gap-4 w-full px-5 py-[18px] rounded-2xl bg-white/[0.045] backdrop-blur border border-white/10 hover:border-emerald-400/50 hover:bg-white/[0.07] active:scale-[0.98] transition-all duration-200 shadow-xl shadow-black/30 overflow-hidden"
          >
            {/* hover 시 카드 안쪽 글로우 */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-emerald-500/[0.06] to-transparent" />
            <span className="relative w-12 h-12 rounded-[14px] bg-gradient-to-b from-white/[0.1] to-white/[0.03] border border-white/10 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-[26px] h-[26px] fill-white" aria-hidden>
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            </span>
            <span className="relative flex-1 min-w-0">
              <span className="block text-[15px] font-semibold text-white">
                App Store
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                iPhone 에서 다운로드
              </span>
            </span>
            <svg
              viewBox="0 0 24 24"
              className="relative w-4 h-4 stroke-gray-500 group-hover:stroke-emerald-300 group-hover:translate-x-0.5 transition-all"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </a>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="animate-fade-in-up delay-700 group relative flex items-center gap-4 w-full px-5 py-[18px] rounded-2xl bg-white/[0.045] backdrop-blur border border-white/10 hover:border-emerald-400/50 hover:bg-white/[0.07] active:scale-[0.98] transition-all duration-200 shadow-xl shadow-black/30 overflow-hidden"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-emerald-500/[0.06] to-transparent" />
            <span className="relative w-12 h-12 rounded-[14px] bg-gradient-to-b from-white/[0.1] to-white/[0.03] border border-white/10 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M3.6 2.4c-.36.38-.6.97-.6 1.73v15.75c0 .76.24 1.35.6 1.72l.1.09 8.82-8.82v-.2L3.7 2.3l-.1.1z"
                />
                <path
                  fill="#34A853"
                  d="M15.46 15.81l-2.94-2.94v-.2l2.94-2.95.07.04 3.49 1.98c1 .57 1 1.5 0 2.06l-3.49 1.98-.07.03z"
                />
                <path
                  fill="#FBBC04"
                  d="M15.53 15.78l-3.01-3.03L3.6 21.6c.33.35.87.4 1.49.05l10.44-5.87"
                />
                <path
                  fill="#EA4335"
                  d="M15.53 8.22L5.09 2.35c-.62-.35-1.16-.3-1.49.05l8.92 8.85 3.01-3.03z"
                />
              </svg>
            </span>
            <span className="relative flex-1 min-w-0">
              <span className="block text-[15px] font-semibold text-white">
                Google Play
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Android 에서 다운로드
              </span>
            </span>
            <svg
              viewBox="0 0 24 24"
              className="relative w-4 h-4 stroke-gray-500 group-hover:stroke-emerald-300 group-hover:translate-x-0.5 transition-all"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </a>
        </div>

      </main>

      {/* 푸터 */}
      <footer className="relative z-10 pb-8 text-center">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.07] border border-white/15 text-[12.5px] font-medium text-gray-200 hover:text-white hover:border-rose-300/40 hover:bg-white/[0.1] transition-all shadow-lg shadow-black/30"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5 stroke-current"
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.6 3.9 5.7 3.9 9s-1.4 6.4-3.9 9c-2.5-2.6-3.9-5.7-3.9-9s1.4-6.4 3.9-9z" />
          </svg>
          hillyheally.com
        </a>
      </footer>
    </div>
  );
}
