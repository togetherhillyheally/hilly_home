import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Map as MapIcon,
  Footprints,
  Package,
  Puzzle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { ScreenshotFrame } from "./ScreenshotFrame";

export const metadata: Metadata = {
  title: "인증 지도 가이드 · Hilly Heally",
  description:
    "지도를 선택하고, 걸으며 보물을 인증하고, 퍼즐을 완성하는 힐리힐리 사용법을 5단계로 안내합니다.",
};

type Step = {
  n: number;
  slug: string;
  title: string;
  sub: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  images: { src: string; caption: string }[];
  bullets?: string[];
};

const STEPS: Step[] = [
  {
    n: 1,
    slug: "select-map",
    title: "지도를 선택한다",
    sub: "가고 싶은 코스를 고르세요",
    desc: "홈 화면에서 관심 있는 지도를 골라주세요. 시리즈별로 정리되어 있고, 위치·난이도·거리 정보를 미리 확인할 수 있어요.",
    icon: MapIcon,
    images: [
      { src: "/images/guide/step1-list.png", caption: "지도 목록" },
      { src: "/images/guide/step1-detail.jpg", caption: "지도 상세" },
    ],
    bullets: [
      "시리즈·지역별로 지도를 탐색",
      "거리·상승고도·예상 시간 확인",
      "즐겨찾기로 나중에 다시 찾기",
    ],
  },
  {
    n: 2,
    slug: "walk",
    title: "혼자 걷기 또는 함께 걷기",
    sub: "나만의 페이스, 또는 친구와 함께",
    desc: "선택한 지도에서 걷기 모드를 선택합니다. 혼자 걸으며 나만의 기록을 남길 수도, 친구를 초대해 실시간으로 함께 걸을 수도 있어요.",
    icon: Footprints,
    images: [
      { src: "/images/guide/step1-detail.jpg", caption: "지도 상세" },
      { src: "/images/guide/step2-choose.jpg", caption: "혼자·함께 걷기 선택" },
      { src: "/images/guide/step2-together.png", caption: "함께 걷기 초대" },
    ],
    bullets: [
      "혼자 걷기 — 나만의 페이스로 조용히",
      "함께 걷기 — 링크 공유 또는 초대로 친구와 함께 걷기",
    ],
  },
  {
    n: 3,
    slug: "treasure",
    title: "보물박스 인증",
    sub: "지도 위 보이는 보물을 따라 걸으세요",
    desc: "지도 곳곳에 배치된 보물박스에 도착하면 자동으로 인증되고, 도착지에서 짧은 퀴즈나 사진 인증으로 스탬프를 획득합니다.",
    icon: Package,
    images: [
      { src: "/images/guide/step3-map.jpg", caption: "지도 위 보물박스" },
      { src: "/images/guide/step3-arrive.jpg", caption: "도착 인증 · 조각 획득" },
    ],
    bullets: [
      "GPS로 자동 도착 감지",
      "객관식 퀴즈 · 사진 인증 지원",
      "인증 시마다 스탬프 · 씨앗 지급",
    ],
  },
  {
    n: 4,
    slug: "puzzle",
    title: "지도와 연결된 퍼즐 맞추기",
    sub: "인증한 만큼 조각이 열려요",
    desc: "각 지도에는 고유한 퍼즐 이미지가 연결되어 있어요. 보물박스를 인증할 때마다 퍼즐 조각이 하나씩 열리고, 코스를 완주하면 퍼즐이 완성됩니다.",
    icon: Puzzle,
    images: [
      { src: "/images/guide/step4-list.png", caption: "퍼즐함" },
      { src: "/images/guide/step4-locked.png", caption: "잠긴 퍼즐" },
      { src: "/images/guide/step4-progress.png", caption: "조각 열림" },
    ],
    bullets: [
      "지도별 고유 퍼즐 이미지",
      "인증 진행률에 따라 조각 공개",
      "조각을 뽑아 알맞은 자리에 맞춰 퍼즐 완성",
    ],
  },
  {
    n: 5,
    slug: "collection",
    title: "완성된 퍼즐 확인",
    sub: "나의 발자국이 그림이 되어 남아요",
    desc: "완성한 퍼즐은 컬렉션에 저장돼요. 언제든 다시 열어보고, 친구에게 공유하고, 새 지도에 도전하며 컬렉션을 늘려가세요.",
    icon: Sparkles,
    images: [
      { src: "/images/guide/step5-complete.png", caption: "퍼즐 완성" },
      { src: "/images/guide/step5-share.png", caption: "완성 · 공유" },
      { src: "/images/guide/step5-save.png", caption: "이미지 저장" },
    ],
    bullets: [
      "완성 퍼즐 컬렉션에 자동 보관",
      "친구·SNS로 완성 인증 공유",
    ],
  },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-neutral-200/70">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/images/home_logo.png"
              alt="Hilly Heally"
              width={72}
              height={40}
              className="h-11 w-auto"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {STEPS.map((s) => (
              <Link
                key={s.slug}
                href={`#${s.slug}`}
                className="px-3 py-1.5 rounded-md text-neutral-500 hover:text-orange-600 hover:bg-orange-50 transition-colors font-medium"
              >
                {s.n}. {s.title}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(251,146,60,0.16), transparent 70%), radial-gradient(ellipse 500px 400px at 90% 20%, rgba(236,72,153,0.10), transparent 70%)",
          }}
        />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-orange-100 text-orange-700 mb-5">
              <Sparkles className="h-3 w-3" /> 사용 가이드
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-5 leading-tight">
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                걸으며 퍼즐을 완성하는
              </span>
              <br />5단계 흐름
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              힐리힐리는 산책·트레킹을 놀이로 바꿉니다.
              <br />
              지도를 선택하고, 보물박스를 인증하고, 나만의 퍼즐을 완성해보세요.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="#select-map"
                className="inline-flex items-center gap-1 px-5 h-11 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
              >
                지금 시작하기 <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center h-11 px-5 rounded-full border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                서비스 소개
              </Link>
            </div>
          </div>

          {/* Step index cards */}
          <div className="max-w-5xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-5 gap-3">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.slug}
                  href={`#${s.slug}`}
                  className="group rounded-2xl border border-neutral-200 bg-white hover:border-orange-300 hover:shadow-md hover:-translate-y-0.5 transition-all p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-orange-500 tracking-wider">
                      STEP {s.n}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                      <Icon className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-neutral-900">
                        {s.title}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Steps */}
      <div className="pb-24">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isEven = i % 2 === 1;
          return (
            <section
              key={step.slug}
              id={step.slug}
              className={`py-16 lg:py-24 scroll-mt-20 ${
                isEven ? "bg-neutral-50" : "bg-white"
              }`}
            >
              <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                  {/* Text */}
                  <div className={isEven ? "lg:order-2" : ""}>
                    <div className="inline-flex items-center gap-2 mb-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 text-white text-sm font-bold shadow-sm">
                        {step.n}
                      </span>
                      <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                        Step {step.n}
                      </span>
                    </div>
                    <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">
                      {step.title}
                    </h2>
                    <p className="text-base text-orange-600 font-medium mb-5">
                      {step.sub}
                    </p>
                    <p className="text-neutral-600 leading-relaxed mb-6">
                      {step.desc}
                    </p>
                    {step.bullets && (
                      <ul className="space-y-2.5">
                        {step.bullets.map((b, j) => (
                          <li
                            key={j}
                            className="flex items-start gap-2.5 text-sm text-neutral-700"
                          >
                            <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Icon className="h-3 w-3 text-orange-600" />
                            </div>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Screenshots */}
                  <div className={isEven ? "lg:order-1" : ""}>
                    <div className="flex gap-3 justify-center flex-wrap">
                      {step.images.map((img, k) => (
                        <ScreenshotFrame
                          key={k}
                          src={img.src}
                          caption={img.caption}
                          offset={k}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* CTA */}
      <section className="relative py-20 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(251,146,60,0.10), rgba(236,72,153,0.08))",
          }}
        />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
              이제 걸으러 나가볼까요?
            </h2>
            <p className="text-neutral-600 mb-8">
              힐리힐리와 함께 오늘의 산책을 나만의 이야기로 남겨보세요.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1 px-6 h-12 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20"
            >
              앱 다운로드 안내 <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-500">
        © Hilly Heally
      </footer>
    </div>
  );
}

