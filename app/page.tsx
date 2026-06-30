import {
  Map,
  MapPin,
  Users,
  Menu,
  Star,
  Navigation,
  Puzzle,
  Stamp,
  Tent,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function HillyheallyHomepage() {
  return (
    <div className="min-h-screen bg-[#08080f]">
      {/* Header */}
      <header className="sticky top-0 py-2 z-50 bg-[#08080f]/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 animate-fade-in-up">
            <Image
              src="/images/home_logo.png"
              alt="Hillyheally 로고"
              width={72}
              height={40}
              className="h-14 w-auto hover:scale-105 transition-transform duration-300"
            />
          </div>
          <nav className="hidden md:flex items-center space-x-8 animate-fade-in-up delay-200">
            <Link
              href="#home"
              className="text-gray-400 hover:text-orange-400 transition-all duration-300 font-medium hover:scale-105 text-sm tracking-wide"
            >
              홈
            </Link>
            <Link
              href="#flow"
              className="text-gray-400 hover:text-orange-400 transition-all duration-300 font-medium hover:scale-105 text-sm tracking-wide"
            >
              서비스 흐름
            </Link>
            <Link
              href="#features"
              className="text-gray-400 hover:text-orange-400 transition-all duration-300 font-medium hover:scale-105 text-sm tracking-wide"
            >
              핵심 기능
            </Link>
          </nav>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-gray-400"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative py-32 lg:py-44 overflow-hidden">
        {/* Aurora background */}
        <div className="absolute inset-0 bg-[#08080f]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.12),transparent_65%)]"></div>
          <div className="absolute top-10 right-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.1),transparent_60%)]"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.08),transparent_60%)]"></div>
        </div>

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in-up">
              <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-pink-500 bg-clip-text text-transparent">
                  나만의 지도를 만들고,
                </span>
                <br />
                <span className="text-white">함께 걷는 경험을 만드세요.</span>
              </h1>
            </div>
            <div className="animate-fade-in-up delay-500">
              <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
                코스를 찾고, 모험을 만들고, 퍼즐을 완성해 씨앗을 얻고,
                <br />
                나만의 캠프를 꾸미는 아웃도어 소셜 플랫폼
              </p>
            </div>
            <div className="animate-fade-in-up delay-700 flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://apps.apple.com/kr/app/hillyheally/id6749788761"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] transition-all duration-300 group"
              >
                <svg
                  viewBox="0 0 384 512"
                  className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors"
                  fill="currentColor"
                >
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-27.1-46.9-42.4-83.7-45.9-35.4-3.4-73.8 20.9-88 20.9-15 0-49-19.7-74.5-19.7C60.2 141.1 0 185.3 0 273.5c0 27.1 5 55.3 14.8 84.6 13.2 38.7 60.8 133.4 110.3 131.9 25.6-.6 43.6-18.3 73.3-18.3 28.6 0 45.3 18.3 74.5 18.3 50.1-.8 92.4-85.8 106.1-124.6-67.5-32-66.3-93.6-66.3-96.7zM266.7 79.6c28.5-34.5 25.8-66 25-77.6-24.2 1.5-52.3 16.7-68.6 35.8C203 61.4 186.7 96 190.5 127.4c26.6 2 51.2-13.4 76.2-47.8z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] text-gray-500 leading-none">
                    Download on the
                  </div>
                  <div className="text-sm font-semibold text-white leading-tight">
                    App Store
                  </div>
                </div>
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.hillyheally.app&hl=ko"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] transition-all duration-300 group"
              >
                <svg
                  viewBox="0 0 512 512"
                  className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors"
                  fill="currentColor"
                >
                  <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] text-gray-500 leading-none">
                    GET IT ON
                  </div>
                  <div className="text-sm font-semibold text-white leading-tight">
                    Google Play
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[#08080f]"></div>
      </section>

      {/* Service Flow Section */}
      <section id="flow" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[#08080f]">
          <div className="absolute top-1/2 left-1/4 w-[600px] h-[400px] -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.06),transparent_65%)]"></div>
          <div className="absolute top-1/2 right-0 w-[400px] h-[400px] -translate-y-1/2 bg-[radial-gradient(ellipse_at_right,rgba(236,72,153,0.06),transparent_65%)]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 tracking-tight">
              함께 걷는 경험,{" "}
              <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
                이렇게 만들어집니다!
              </span>
            </h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              발견부터 기록까지, 힐리힐리가 모든 흐름을 함께합니다
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                step: "01",
                icon: <Map className="h-5 w-5 text-orange-400" />,
                title: "코스 & 지도 발견",
                desc: "코스 지도와 스탬프 지도를 탐색하고, GPX 파일을 업로드해 나만의 트레일을 만들어보세요.",
                accent: "border-l-orange-500/60",
              },
              {
                step: "02",
                icon: <MapPin className="h-5 w-5 text-pink-400" />,
                title: "트레일 수집",
                desc: "마음에 드는 트레일을 수집하고, 체크포인트에 사진과 메모를 남겨 나만의 지도를 완성하세요.",
                accent: "border-l-pink-500/60",
              },
              {
                step: "03",
                icon: <Users className="h-5 w-5 text-orange-300" />,
                title: "모험 만들기 & 모집",
                desc: "코스 또는 스탬프 지도를 선택해 모험을 만들고, 같이 걸을 모험자를 모집하세요.",
                accent: "border-l-orange-400/60",
              },
              {
                step: "04",
                icon: <Navigation className="h-5 w-5 text-pink-300" />,
                title: "실시간 위치 공유 & 산행",
                desc: "모험이 시작되면 모험자 간 실시간 위치를 공유하고, GPS로 이동 경로를 자동 기록합니다.",
                accent: "border-l-pink-400/60",
              },
              {
                step: "05",
                icon: <Puzzle className="h-5 w-5 text-orange-400" />,
                title: "기록 & 퍼즐 조각 수집",
                desc: "모험을 완료하면 활동 거리와 시간에 따라 퍼즐 조각을 획득하고, 후기와 경험을 기록하세요.",
                accent: "border-l-orange-500/60",
              },
              {
                step: "06",
                icon: <Tent className="h-5 w-5 text-pink-400" />,
                title: "퍼즐 완성 & 캠프 꾸미기",
                desc: "퍼즐을 완성해 씨앗을 획득하고, 나만의 캠프에 텐트·장비·자연물을 배치해 캠핑 씬을 꾸며보세요.",
                accent: "border-l-pink-500/60",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`flex gap-5 items-start px-6 py-5 rounded-xl bg-white/[0.03] border border-white/[0.06] border-l-2 ${item.accent} hover:bg-white/[0.05] transition-all duration-300 animate-fade-in-up`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="flex-shrink-0 flex flex-col items-center gap-2 pt-0.5">
                  <span className="text-[10px] font-bold text-gray-600 tracking-widest">
                    {item.step}
                  </span>
                  <div className="w-9 h-9 bg-white/[0.04] rounded-lg flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    {item.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[#08080f]">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.07),transparent_65%)]"></div>
        </div>

        {/* Top divider glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 tracking-tight">
              핵심 기능
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              {
                icon: <Map className="h-6 w-6 text-orange-400" />,
                iconBg: "bg-orange-400/10",
                title: "코스 지도 & GPX 업로드",
                desc: "GPX 파일을 업로드해 나만의 코스 지도를 만들고, 체크포인트에 사진·메모·후기를 남겨 트레일을 완성하세요.",
                hover: "hover:border-orange-500/30",
              },
              {
                icon: <Stamp className="h-6 w-6 text-pink-400" />,
                iconBg: "bg-pink-400/10",
                title: "스탬프 지도",
                desc: "로게이닝에서 영감을 받은 스탬프 수집 지도. 실제 장소를 방문해 스탬프를 찍고, 모든 포인트를 완료하세요.",
                hover: "hover:border-pink-500/30",
              },
              {
                icon: <Users className="h-6 w-6 text-orange-300" />,
                iconBg: "bg-orange-300/10",
                title: "모험 생성 & 참가자 관리",
                desc: "코스 또는 스탬프 모험을 만들고, 참가 신청 승인·거절, 유저 초대, 공지사항까지 호스트에게 필요한 모든 기능을 제공합니다.",
                hover: "hover:border-orange-400/30",
              },
              {
                icon: <Navigation className="h-6 w-6 text-pink-300" />,
                iconBg: "bg-pink-300/10",
                title: "실시간 위치 공유 & GPS 기록",
                desc: "모험 중 모험자 간 실시간 위치를 공유하고, GPS로 이동 경로를 자동 기록합니다. 백그라운드에서도 동작합니다.",
                hover: "hover:border-pink-400/30",
              },
              {
                icon: <Puzzle className="h-6 w-6 text-orange-400" />,
                iconBg: "bg-orange-400/10",
                title: "퍼즐 & 씨앗",
                desc: "모험을 완료해 퍼즐 조각을 모으고, 퍼즐을 완성하면 앱 내 화폐 '씨앗'을 획득합니다. 씨앗으로 캠프 오브젝트를 해금하세요.",
                hover: "hover:border-orange-500/30",
              },
              {
                icon: <Tent className="h-6 w-6 text-violet-400" />,
                iconBg: "bg-violet-400/10",
                title: "나만의 캠프",
                desc: "나만의 캠핑 씬을 꾸며보세요. 배경·지면·텐트·장비·자연·동물을 자유롭게 배치할 수 있습니다.",
                hover: "hover:border-violet-500/30",
              },
              {
                icon: <Star className="h-6 w-6 text-pink-400" />,
                iconBg: "bg-pink-400/10",
                title: "후기 & 경로 카드 공유",
                desc: "산행을 마치면 별점 후기를 남기고, GPS 이동 경로를 카드로 만들어 공유할 수 있어요.",
                hover: "hover:border-pink-500/30",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] ${item.hover} transition-all duration-300 animate-fade-in-up`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div
                  className={`w-11 h-11 ${item.iconBg} rounded-xl flex items-center justify-center mb-5`}
                >
                  {item.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[#08080f]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.08),transparent_60%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(236,72,153,0.07),transparent_60%)]"></div>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="animate-fade-in-up">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-5 tracking-tight flex flex-col items-center gap-3 lg:gap-4">
              <span>어떤 길을 함께하고 싶나요?</span>
              <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
                힐리힐리에서 새로운 모험을 시작해보세요.
              </span>
            </h2>
          </div>
          <div className="animate-fade-in-up delay-300">
            <p className="text-gray-500 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
              코스를 발견하고, 퍼즐을 완성하고, 나만의 캠프를 꾸며보세요.
            </p>
          </div>
          <div className="animate-fade-in-up delay-500 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://apps.apple.com/kr/app/hillyheally/id6749788761"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] transition-all duration-300 group"
            >
              <svg
                viewBox="0 0 384 512"
                className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors"
                fill="currentColor"
              >
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-27.1-46.9-42.4-83.7-45.9-35.4-3.4-73.8 20.9-88 20.9-15 0-49-19.7-74.5-19.7C60.2 141.1 0 185.3 0 273.5c0 27.1 5 55.3 14.8 84.6 13.2 38.7 60.8 133.4 110.3 131.9 25.6-.6 43.6-18.3 73.3-18.3 28.6 0 45.3 18.3 74.5 18.3 50.1-.8 92.4-85.8 106.1-124.6-67.5-32-66.3-93.6-66.3-96.7zM266.7 79.6c28.5-34.5 25.8-66 25-77.6-24.2 1.5-52.3 16.7-68.6 35.8C203 61.4 186.7 96 190.5 127.4c26.6 2 51.2-13.4 76.2-47.8z" />
              </svg>
              <div className="text-left">
                <div className="text-[10px] text-gray-500 leading-none">
                  Download on the
                </div>
                <div className="text-sm font-semibold text-white leading-tight">
                  App Store
                </div>
              </div>
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.hillyheally.app&hl=ko"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] transition-all duration-300 group"
            >
              <svg
                viewBox="0 0 512 512"
                className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors"
                fill="currentColor"
              >
                <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
              </svg>
              <div className="text-left">
                <div className="text-[10px] text-gray-500 leading-none">
                  GET IT ON
                </div>
                <div className="text-sm font-semibold text-white leading-tight">
                  Google Play
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#08080f] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-start gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Image
                  src="/images/logo.png"
                  alt="Hillyheally 로고"
                  width={40}
                  height={40}
                />
                <span className="text-xl font-bold text-white">
                  Hilly Heally
                </span>
              </div>
              <p className="text-gray-600 text-sm">상호명: 주식회사 힐리힐리</p>
              <p className="text-gray-600 text-sm">대표자: 박준섭</p>
              <p className="text-gray-600 text-sm">
                주소: 서울시 서초구 서초중앙로 123, 지하 1층 1003호
              </p>
              <p className="text-gray-600 text-sm">사업자번호: 720-86-03798</p>
              <p className="text-gray-600 text-sm">
                Tel: 1800-5191 FAX: 02-6455-6023
              </p>
              <p className="text-gray-600 text-sm">
                Mail: service@hillyheally.com
              </p>
            </div>
          </div>
          <div className="border-t border-white/[0.05] mt-8 pt-8 text-center text-gray-600">
            <p className="text-sm">
              &copy; 2025 Hilly Heally. All rights reserved.
            </p>
            <div className="mt-3 flex items-center justify-center gap-6 text-sm">
              <Link
                href="/terms"
                className="hover:text-white transition-colors"
              >
                서비스 이용약관
              </Link>
              <span className="text-gray-700">|</span>
              <Link
                href="/privacy-policy"
                className="hover:text-white transition-colors"
              >
                개인정보처리방침
              </Link>
              <span className="text-gray-700">|</span>
              <Link
                href="/delete-account"
                className="hover:text-white transition-colors"
              >
                계정 삭제
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
