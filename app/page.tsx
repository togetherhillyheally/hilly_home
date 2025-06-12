import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function HillyheallyHomepage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image src="/images/logo.png" alt="Hillyheally 로고" width={48} height={24} className="h-8 w-auto" />
            <span className="text-2xl font-extrabold text-primary">Hilly Heally</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#home" className="text-gray-600 hover:text-brand-600 transition-colors">
              HOME
            </Link>
            <Link href="#about" className="text-gray-600 hover:text-brand-600 transition-colors">
              ABOUT
            </Link>
            <Link href="#contents" className="text-gray-600 hover:text-brand-600 transition-colors">
              CONTENTS
            </Link>
          </nav>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-gray-100/50" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              <span className="text-brand-600">오픈과 동시에 몰려도,</span>
              <br />
              <span className="text-accent-600">트래픽 걱정 없이 신청 완료.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              트레일러닝, 러닝, 사이클 대회까지 한 곳에서 신청하고,
              <br />
              QR 참가증으로 대회장 입장까지 한 번에.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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

      {/* Problem Statement Section */}
      <section className="py-20 bg-red-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8">어렵고 느린 대회 신청, 이제 그만.</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Timer className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">사이트가 느려져요</h3>
                <p className="text-gray-600 text-sm">대회 신청할 때마다 사이트가 느려지고, 신청 오류가 발생해요</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">사이트가 달라요</h3>
                <p className="text-gray-600 text-sm">대회마다 사이트가 달라서 헷갈리고 매번 새로 가입해야 해요</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">관리가 번거로워요</h3>
                <p className="text-gray-600 text-sm">참가 확인이 번거롭고, 내 기록 관리도 따로 해야 해요</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Introduction Section */}
      <section id="about" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Hilly Heally는 어떤 플랫폼인가요?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Hilly Heally는 아웃도어 대회의 신청, 결제, 참가 인증은 물론<br />
              GPS 하드웨어 기반 실시간 트레킹과 3D 지도 기반 트레일 콘텐츠까지<br />
              한 번에 경험할 수 있는 스마트 스포츠 플랫폼입니다.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-brand-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-brand-600" />
                </div>
                <CardTitle className="text-brand-800">대회 탐색 및 상세 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  다양한 아웃도어 대회를 한 곳에서 탐색하고 상세 정보를 확인할 수 있습니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-brand-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-accent-600" />
                </div>
                <CardTitle className="text-brand-800">신청 폼 입력 및 결제</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">토스 결제 연동으로 안전하고 빠른 대회 신청과 결제가 가능합니다.</p>
              </CardContent>
            </Card>

            <Card className="border-brand-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="h-6 w-6 text-brand-600" />
                </div>
                <CardTitle className="text-brand-800">QR 참가증 자동 발급</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  결제 완료 즉시 QR 참가증이 자동 발급되어 대회장에서 간편하게 입장할 수 있습니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-brand-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-accent-600" />
                </div>
                <CardTitle className="text-brand-800">마이페이지 신청 내역</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">내 대회 신청 내역과 참가 기록을 한눈에 확인하고 관리할 수 있습니다.</p>
              </CardContent>
            </Card>

            <Card className="border-brand-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-brand-600" />
                </div>
                <CardTitle className="text-brand-800">주최자용 대회 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  대회 등록부터 참가자 관리까지 주최자를 위한 통합 관리 기능을 제공합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-brand-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4">
                  <Timer className="h-6 w-6 text-accent-600" />
                </div>
                <CardTitle className="text-brand-800">트래픽 병목 대응</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  큐잉 시스템과 이중 등록 방지로 대회 마감 직전에도 안정적인 신청이 가능합니다.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-primary-100">
                  <Satellite className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-brand-800">하드웨어 연동 실시간 트레킹</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  GPS 하드웨어와 연동하여 실시간 위치 추적 및 안전한 트레킹 경험을 제공합니다.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-primary-100">
                  <Map className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-brand-800">3D 지도 콘텐츠 제공</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  한국 주요 트레일의 3D 지도, 고도 정보, 인증 지점 등 차별화된 지도 콘텐츠를 제공합니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Differentiation Section */}
      <section id="contents" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">차별화 포인트</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">기존 플랫폼과는 다른 Hilly Heally만의 특별함</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center border-brand-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Timer className="h-8 w-8 text-brand-600" />
                </div>
                <CardTitle className="text-brand-800">병목 없는 신청 시스템</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">트래픽 집중 시간에도 안정적인 대회 신청이 가능</p>
              </CardContent>
            </Card>

            <Card className="text-center border-brand-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-8 w-8 text-accent-600" />
                </div>
                <CardTitle className="text-brand-800">3D 지도 기반 GPS</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">3D 지도 기반 GPS 시각화 기능 (v2 예정)</p>
              </CardContent>
            </Card>

            <Card className="text-center border-brand-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-brand-600" />
                </div>
                <CardTitle className="text-brand-800">한국 주요 트레일 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">콘텐츠 기반으로 확장되는 트레일 정보 제공</p>
              </CardContent>
            </Card>

            <Card className="text-center border-brand-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-accent-600" />
                </div>
                <CardTitle className="text-brand-800">입문자부터 하드코어까지</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">모든 레벨의 사용자를 위한 커뮤니티 기능</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">향후 비전</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">더욱 발전된 기능들이 곧 출시됩니다</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">실시간 GPS 트래킹</h3>
              <p className="text-gray-600 text-sm">대회 중 실시간 위치 추적 기능</p>
              <Badge className="mt-2 bg-blue-100 text-blue-800">Coming Soon</Badge>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">참가자 간 매치</h3>
              <p className="text-gray-600 text-sm">다양한 매치 시스템</p>
              <Badge className="mt-2 bg-purple-100 text-purple-800">Coming Soon</Badge>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mountain className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">유료 트레일 콘텐츠</h3>
              <p className="text-gray-600 text-sm">프리미엄 트레일 정보</p>
              <Badge className="mt-2 bg-green-100 text-green-800">Coming Soon</Badge>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">주최자 관제 시스템</h3>
              <p className="text-gray-600 text-sm">고도화된 대회 운영 관리</p>
              <Badge className="mt-2 bg-orange-100 text-orange-800">Coming Soon</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-brand-600 to-accent-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            지금 함께 빠른 대회 참가, 실시간 트레킹, 3D 지도 콘텐츠를 경험해보세요!
          </h2>
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

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">자주 묻는 질문</h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="border-brand-100">
              <CardHeader>
                <CardTitle className="text-brand-800">대회 신청이 어떻게 이루어지나요?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  앱에서 원하는 대회를 선택하고 신청 폼을 작성한 후, 토스 결제로 간편하게 결제하면 즉시 QR 참가증이
                  발급됩니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-brand-100">
              <CardHeader>
                <CardTitle className="text-brand-800">결제는 안전한가요?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  토스페이먼츠와 연동하여 안전하고 신뢰할 수 있는 결제 시스템을 제공합니다. 모든 결제 정보는 암호화되어
                  보호됩니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-brand-100">
              <CardHeader>
                <CardTitle className="text-brand-800">QR 참가증은 어디서 확인하나요?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  결제 완료 후 앱의 마이페이지에서 QR 참가증을 확인할 수 있습니다. 대회 당일 QR 코드를 스캔하여
                  입장하시면 됩니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Image src="/images/logo.png" alt="Hillyheally 로고" width={40} height={40} />
                <span className="text-2xl font-bold">Hilly Heally</span>
              </div>
              <p className="text-gray-400">(주) 힐리힐리</p>
              <p className="text-gray-400">서울시 서초구 명달로 116 송현빌딩 3층</p>
              <p className="text-gray-400">사업자번호: 274-10-01948</p>
              <p className="text-gray-400">MAIL: dev@hillyheally.com</p>
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
          </div>
        </div>
      </footer>
    </div>
  )
}
