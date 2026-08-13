import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  Smartphone,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DeleteAccountForm from "./DeleteAccountForm";

export const metadata: Metadata = {
  title: "계정 삭제 안내 | Hilly Heally",
  description:
    "Hilly Heally 계정 삭제 절차 및 데이터 처리 기준 안내. 휴대폰 본인 인증 후 외부에서 직접 삭제를 신청할 수 있습니다.",
};

const CONTACT_EMAIL = "service@hillyheally.com";

const DATA_DELETED = [
  "프로필 정보 (닉네임, 프로필 사진)",
  "내가 만든 모험 및 모험 신청 내역",
  "보유 씨앗",
  "퍼즐 진행 상태 및 퍼즐 조각",
  "GPS 이동 경로 기록",
];

const DATA_RETAINED = [
  {
    label: "작성한 후기",
    desc: "후기 내용은 유지되며 작성자가 '탈퇴한 사용자'로 표시됩니다.",
  },
  {
    label: "관계 법령에 따른 보관 정보",
    desc: "전자상거래법 등 관련 법령에서 정한 기간 동안 보관 후 파기됩니다.",
  },
];

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[#08080f]">
      {/* Header */}
      <header className="sticky top-0 py-2 z-50 bg-[#08080f]/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/images/home_logo.png"
              alt="Hillyheally 로고"
              width={72}
              height={40}
              className="h-14 w-auto"
            />
          </Link>
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700 hover:text-white"
            >
              홈으로
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-14 lg:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.1),transparent_65%)]"></div>
          <div className="absolute top-10 right-0 w-[400px] h-[300px] bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.08),transparent_60%)]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-pink-500 bg-clip-text text-transparent">
                계정 삭제 신청
              </span>
            </h1>
            <p className="text-gray-400 text-base lg:text-lg leading-relaxed">
              가입 시 인증한 휴대폰 번호로 본인 확인 후
              <br className="hidden md:block" />
              계정 및 관련 데이터 삭제를 신청할 수 있어요.
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 pb-20">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 경고 박스 */}
          <section className="rounded-2xl p-6 border border-red-500/30 bg-red-500/[0.04]">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">
                신청 전 반드시 확인하세요
              </h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-300 leading-relaxed">
              <li>• 본인 확인 후 영업일 기준 7일 이내 영구 삭제됩니다.</li>
              <li>• 한 번 삭제된 데이터는 복원할 수 없어요.</li>
              <li>
                • 진행 중인 모험·신청 내역, 퍼즐 진행 상태가 모두 삭제됩니다.
              </li>
              <li>
                • 작성한 후기는 내용이 유지되지만 계정과의 연결이 끊깁니다.
              </li>
              <li>
                • 동일 번호로 재가입은 가능하나 이전 데이터는 복원되지 않습니다.
              </li>
            </ul>
          </section>

          {/* 본인인증 폼 */}
          <DeleteAccountForm />

          {/* 앱에서 직접 탈퇴 안내 (보조) */}
          <section className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-400/10 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-pink-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                앱에서 바로 탈퇴할 수도 있어요
              </h2>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-3">
              로그인된 상태라면 앱에서 즉시 탈퇴가 가능합니다.
            </p>
            <ol className="text-sm text-gray-300 leading-relaxed space-y-1.5 list-decimal list-inside">
              <li>앱 실행 후 하단 [내 프로필] 탭 이동</li>
              <li>우측 상단 [설정] 진입</li>
              <li>[회원 탈퇴] 선택</li>
              <li>안내사항 확인 후 동의 → 탈퇴하기</li>
            </ol>
          </section>

          {/* 삭제되는 데이터 */}
          <section className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.06]">
            <h2 className="text-lg font-semibold text-white mb-4">
              삭제되는 데이터 (영구 삭제)
            </h2>
            <ul className="space-y-3">
              {DATA_DELETED.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-300 leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* 일정 기간 보관되는 정보 */}
          <section className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.06]">
            <h2 className="text-lg font-semibold text-white mb-4">
              유지 또는 별도 보관되는 정보
            </h2>
            <ul className="space-y-4">
              {DATA_RETAINED.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-orange-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-white font-medium">
                      {item.label}
                    </p>
                    <p className="text-sm text-gray-500 leading-relaxed mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* 문의 */}
          <section className="rounded-2xl p-6 bg-gradient-to-br from-orange-500/[0.06] to-pink-500/[0.06] border border-white/[0.06]">
            <h2 className="text-lg font-semibold text-white mb-2">
              본인 인증이 어려우신가요?
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              가입 시 사용한 번호가 변경되어 인증이 어렵다면{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                  "[힐리힐리] 계정 삭제 요청"
                )}`}
                className="text-orange-300 hover:text-orange-200 underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>
              으로 가입 정보(이메일/닉네임/가입 경로)를 알려주시면 본인 확인 후
              처리해드려요.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#08080f] text-white py-10 border-t border-white/[0.05]">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-600">
            &copy; 2025 Hilly Heally. All rights reserved.
          </p>
          <div className="mt-3 flex items-center justify-center gap-6 text-sm">
            <Link
              href="/terms"
              className="text-gray-500 hover:text-white transition-colors"
            >
              서비스 이용약관
            </Link>
            <span className="text-gray-700">|</span>
            <Link
              href="/privacy-policy"
              className="text-gray-500 hover:text-white transition-colors"
            >
              개인정보처리방침
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
