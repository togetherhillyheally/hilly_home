import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mountain,
  MapPin,
  Users,
  Trophy,
  Smartphone,
  Globe,
  Timer,
  Shield,
  Play,
  CheckCircle,
  ArrowRight,
  Menu,
  Satellite,
  Map,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function HillyheallyHomepage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 py-2 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700">
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
              className="text-gray-300 hover:text-red-500 transition-all duration-300 font-bold hover:scale-105"
            >
              홈
            </Link>
            <Link
              href="#about"
              className="text-gray-300 hover:text-red-500 transition-all duration-300 font-bold hover:scale-105"
            >
              소개
            </Link>
            <Link
              href="#features"
              className="text-gray-300 hover:text-red-500 transition-all duration-300 font-bold hover:scale-105"
            >
              기능
            </Link>
          </nav>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative py-20 lg:py-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,146,60,0.1),transparent_50%)] animate-pulse"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.1),transparent_50%)] animate-pulse delay-1000"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in-up">
              <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent animate-gradient-x">
                  지도 위에서 연결되고,
                </span>
                <br />
                <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent animate-gradient-x delay-300">
                  길 위에서 함께 성장한다.
                </span>
              </h1>
            </div>
            <div className="animate-fade-in-up delay-500">
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                대회 신청부터 실시간 그룹 트래킹, 3D 지도 기반 미션까지
                <br />
                혼자 걷더라도 "함께 걷는 경험"을 만드는 스마트 플랫폼
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-700">
              {/* <Button size="lg" className="bg-brand-600 hover:bg-brand-700 text-lg px-8 py-3">
                <Play className="mr-2 h-5 w-5" />앱 다운로드
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-brand-600 text-brand-600 hover:bg-brand-50 text-lg px-8 py-3"
              >
                대회 구경하기
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-accent-600 text-accent-600 hover:bg-accent-50 text-lg px-8 py-3"
              >
                베타 신청하기
              </Button> */}
            </div>
          </div>
        </div>
      </section>

      {/* Product Introduction Section */}
      <section id="about" className="py-20 bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              대회 신청 → 참가 → 실시간 관제/기록 관리를 지원하는 동시에
              <br />
              <strong className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
                3D 지도 기반 실시간 그룹 트래킹과 '함께' 기능
              </strong>
              을 제공하여
              <br />
              혼자 걷더라도 "함께 걷는 경험"을 만드는 아웃도어 플랫폼입니다.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-gray-700 border-gray-600 hover:bg-gray-600 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400/20 to-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Timer className="h-6 w-6 text-orange-400" />
                </div>
                <CardTitle className="text-white">
                  트래픽 병목 없는 대회 신청·결제
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  큐잉 시스템과 이중 등록 방지로 대회 마감 직전에도 안정적인
                  신청이 가능합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-700 border-gray-600 hover:bg-gray-600 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400/20 to-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-pink-400" />
                </div>
                <CardTitle className="text-white">실시간 그룹 트래킹</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  GPS 하드웨어 연동으로 실시간 위치 공유, 혼자 걷더라도 함께
                  걷는 경험을 제공합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-700 border-gray-600 hover:bg-gray-600 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400/20 to-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Map className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle className="text-white">
                  3D 지도 기반 퀘스트 (함께 걷기, 찾기, 그리기)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  한국 주요 트레일의 3D 지도 기반 게이미피케이션으로 함께 걷고,
                  찾고, 그리는 미션을 제공합니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              핵심 기능
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center animate-fade-in-up delay-100 hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4 hover:shadow-lg hover:shadow-orange-500/25 transition-shadow duration-300">
                <Timer className="h-8 w-8 text-orange-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">
                트래픽 병목 없는 신청
              </h3>
              <p className="text-gray-300 text-sm">
                큐잉 시스템으로 안정적인 대회 신청
              </p>
            </div>

            <div className="text-center animate-fade-in-up delay-200 hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4 hover:shadow-lg hover:shadow-pink-500/25 transition-shadow duration-300">
                <Users className="h-8 w-8 text-pink-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">
                실시간 그룹 트래킹
              </h3>
              <p className="text-gray-300 text-sm">함께 걷는 경험을 제공</p>
            </div>

            <div className="text-center animate-fade-in-up delay-300 hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4 hover:shadow-lg hover:shadow-orange-500/25 transition-shadow duration-300">
                <Map className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-white font-semibold mb-2">
                3D 지도 기반 미션
              </h3>
              <p className="text-gray-300 text-sm">함께 걷기, 찾기, 그리기</p>
            </div>

            <div className="text-center animate-fade-in-up delay-400 hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 hover:shadow-lg hover:shadow-red-500/25 transition-shadow duration-300">
                <Smartphone className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-white font-semibold mb-2">
                QR 참가증 시스템
              </h3>
              <p className="text-gray-300 text-sm">간편한 대회 입장</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-pink-600 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-600">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)] animate-pulse"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.1),transparent_50%)] animate-pulse delay-1000"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="animate-fade-in-up">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              지도 위에서 연결되고, 길 위에서 함께 성장하는
              <br />
              새로운 아웃도어 경험을 시작하세요!
            </h2>
          </div>
          <div className="animate-fade-in-up delay-300">
            <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
              대회 신청부터 실시간 그룹 트래킹, 3D 지도 기반 미션까지
              <br />
              혼자 걷더라도 '함께' 하는 아웃도어 경험을 만나보세요.
            </p>
          </div>
          {/* <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-brand-600 hover:bg-gray-100 text-lg px-8 py-3">
              앱 다운로드
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" className="bg-white text-brand-600 hover:bg-gray-100 text-lg px-8 py-3">
              베타 신청하기
            </Button>
            <Button size="lg" className="bg-white text-brand-600 hover:bg-gray-100 text-lg px-8 py-3">
              대회 둘러보기
            </Button>
          </div> */}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Image
                  src="/images/logo.png"
                  alt="Hillyheally 로고"
                  width={40}
                  height={40}
                />
                <span className="text-2xl font-bold">Hilly Heally</span>
              </div>
              <p className="text-gray-400">상호명: 주식회사 힐리힐리</p>
              <p className="text-gray-400">대표자: 정영교</p>
              <p className="text-gray-400">
                주소: 서울시 서초구 서초중앙로 123, 지하 1층 1003호
              </p>
              <p className="text-gray-400">사업자번호: 720-86-03798</p>
              <p className="text-gray-400">Tel: 1800-5191 FAX: 02-6455-6023</p>
              <p className="text-gray-400">Mail: service@hillyheally.com</p>
            </div>
            {/* <div>
              <h4 className="font-semibold mb-4">제품</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    대회 참가
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    대회 개최
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    트레일 지도
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    커뮤니티
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">지원</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    도움말
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    문의하기
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    개발자 API
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">회사</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    소개
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    채용
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    블로그
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    파트너십
                  </Link>
                </li>
              </ul>
            </div> */}
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Hilly Heally. All rights reserved.</p>
            <div className="mt-3 flex items-center justify-center gap-6 text-sm">
              <Link
                href="/terms"
                className="hover:text-white transition-colors"
              >
                서비스 이용약관
              </Link>
              <span className="text-gray-600">|</span>
              <Link
                href="/privacy-policy"
                className="hover:text-white transition-colors"
              >
                개인정보처리방침
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
