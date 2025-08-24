import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "서비스 이용약관 | Hilly Heally",
  description: "Hilly Heally 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl text-gray-900">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/">
          <Button variant="outline" size="sm">
            홈으로
          </Button>
        </Link>
      </div>

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          서비스 이용약관
        </h1>
        <p className="mt-2 text-sm text-gray-500">시행일: 2025-05-29</p>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">제1장 총칙</h2>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제1조 (목적)</h3>
          <p className="leading-relaxed">
            본 약관은 주식회사 힐리힐리(이하 “회사”)가 제공하는 러닝, 트레킹,
            로컬 정보 연계 및 마라톤 대회 통합관리 서비스(이하 “서비스”)의
            이용에 대한 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을
            목적으로 합니다.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제2조 (용어의 정의)</h3>
          <ul className="list-disc pl-6 space-y-1 leading-relaxed">
            <li>회원: 회사와 이용계약을 체결하고 서비스를 이용하는 자</li>
            <li>비회원: 회원가입 없이 서비스를 이용하는 자</li>
            <li>
              서비스: 앱/웹을 통해 제공되는 통합 러닝·트레킹 정보, 대회 신청,
              참가 기록 관리, 위치 공유, 로컬 콘텐츠 등
            </li>
            <li>
              콘텐츠: 회사 또는 제휴사가 서비스 내에서 제공하는 유·무료 정보 및
              기능
            </li>
            <li>
              제휴사: 대회 주최자, 로컬 가이드, 콘텐츠 제공자 등 협력 관계
              사업자
            </li>
            <li>
              이용자: 회사가 정한 절차에 따라 콘텐츠를 무상 또는 유료로 소비하는
              회원 또는 비회원
            </li>
          </ul>
          <p className="leading-relaxed text-gray-700">
            위 정의 외 용어는 관계 법령, 서비스별 안내 및 일반 상관례를
            따릅니다.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제3조 (약관의 효력 및 개정)</h3>
          <ul className="list-disc pl-6 space-y-1 leading-relaxed">
            <li>
              회사는 본 약관 및
              회사/대표자/소재지/연락처/사업자등록번호/개인정보보호책임자 등을
              서비스 화면에 게시합니다.
            </li>
            <li>회사는 관련 법령 범위 내에서 약관을 개정할 수 있습니다.</li>
            <li>
              약관 개정 시 적용일자 및 개정사유를 명시하여 최소 7일 전 공지하며,
              회원에게 불리한 변경은 최소 30일 전에 공지합니다.
            </li>
            <li>
              회원이 개정에 동의하지 않을 경우 탈퇴를 요청할 수 있으며, 효력
              발생일까지 이의 제기가 없으면 동의한 것으로 간주됩니다.
            </li>
          </ul>
        </div>
      </section>

      <hr className="my-10 border-gray-200" />

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">제2장 이용계약의 체결</h2>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제5조 (회원가입)</h3>
          <ul className="list-disc pl-6 space-y-1 leading-relaxed">
            <li>
              회원은 회사가 정한 양식에 따라 정보를 입력하고 약관에 동의함으로써
              가입을 신청합니다. 필요한 경우 실명확인 및 본인인증을 요청할 수
              있습니다.
            </li>
            <li>
              다음 각 호에 해당하는 경우 등록이 제한될 수 있습니다: 과거
              자격상실 3년 내 재가입(예외 승인 시 가능), 허위/누락/오기가 있는
              경우, 기술상 지장 예상 등
            </li>
            <li>
              가입 성립 시점은 회사의 승낙이 회원에게 도달한 때이며, 설비 여유
              또는 기술·업무상 사유로 승낙이 유보될 수 있습니다.
            </li>
            <li>
              만 14세 미만 등 본인인증이 불가능한 경우 가입이 제한될 수
              있습니다.
            </li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">
            제6조 (회원탈퇴 및 자격 정지)
          </h3>
          <ul className="list-disc pl-6 space-y-1 leading-relaxed">
            <li>
              회원은 언제든지 탈퇴 요청할 수 있으며 회사는 즉시 처리합니다.
            </li>
            <li>
              타인 정보 도용, 허위 가입, 서비스 방해, 해킹/무단변경, 명예훼손,
              스팸/불법거래 등 위반 시 자격 제한·정지 또는 박탈될 수 있습니다.
            </li>
            <li>
              동일 행위 반복 또는 시정 불이행 시 자격 박탈 가능하며, 이 경우
              말소 전 30일 이상의 소명 기회를 부여합니다.
            </li>
            <li>
              탈퇴 시 적립금·쿠폰 등 포인트성 혜택은 소멸되며 복구되지 않습니다.
            </li>
          </ul>
        </div>
      </section>

      <hr className="my-10 border-gray-200" />

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">제3장 서비스의 이용</h2>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제7조 (서비스의 내용)</h3>
          <ul className="list-disc pl-6 space-y-1 leading-relaxed">
            <li>
              회사는 러닝·트레킹·대회와 관련된 참가 신청, 기록 관리, 위치 정보
              공유, 로컬 콘텐츠 제공 등의 서비스를 제공합니다.
            </li>
            <li>
              일부 기능은 유료로 제공될 수 있으며, 내용 및 조건은 별도로
              안내합니다.
            </li>
            <li>
              서비스의 내용·형식·기능·디자인은 수시로 추가/변경/중단될 수
              있으며, 회원에게 불리한 변경은 사전 고지합니다.
            </li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제8조 (서비스 이용시간)</h3>
          <p className="leading-relaxed">
            원칙적으로 연중무휴 24시간 운영하나, 시스템 점검·설비 교체 등 필요한
            경우 일시 중단될 수 있습니다. 가능한 경우 사전 공지하며, 긴급 점검
            등 불가피한 경우 사후 공지할 수 있습니다.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">
            제9조 (서비스의 변경 및 중단)
          </h3>
          <ul className="list-disc pl-6 space-y-1 leading-relaxed">
            <li>
              운영상 또는 기술상 필요에 따라 서비스의 전부 또는 일부가
              변경되거나 종료될 수 있습니다.
            </li>
            <li>
              내용·이용방법·이용시간 변경 시 초기화면 등으로 사전 공지합니다.
            </li>
            <li>
              무료 제공 서비스의 수정·중단·변경에 대해서는 관련 법령에 특별
              규정이 없는 한 별도의 보상을 하지 않습니다.
            </li>
            <li className="font-medium">
              회사는 경영상의 이유 등으로 서비스를 종료할 수 있으며,
              종료일로부터 최소 30일 이전에 E-mail, 카카오채널 또는 문자메시지
              등을 통해 회원에게 개별 통지합니다.
            </li>
            <li>종료 공지 후 종료일까지 일부 기능은 제한될 수 있습니다.</li>
          </ul>
        </div>
      </section>

      <hr className="my-10 border-gray-200" />

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">제5장 계약 당사자의 의무</h2>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제17조 (회사의 의무)</h3>
          <ul className="list-disc pl-6 space-y-1 leading-relaxed">
            <li>
              회사는 지속적이고 안정적인 서비스 제공을 위해 최선을 다합니다.
            </li>
            <li>
              회원 개인정보 보호를 위해 보안시스템을 갖추고 개인정보처리방침을
              준수합니다.
            </li>
            <li>회원 의견·민원을 경청하고 정당한 경우 처리 후 통지합니다.</li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제18조 (회원의 의무)</h3>
          <ul className="list-disc pl-6 space-y-1 leading-relaxed">
            <li>
              회원은 서비스 내 콘텐츠를 제공 목적 외로 무단 이용할 수 없습니다.
            </li>
            <li>
              무단 접근/수집, 서비스 방해, 불법·부당 행위 등은 금지됩니다.
            </li>
          </ul>
        </div>
      </section>

      <hr className="my-10 border-gray-200" />

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">제6장 콘텐츠 및 광고</h2>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제19조 (저작권 등)</h3>
          <p className="leading-relaxed">
            서비스 내 저작물의 저작권 기타 지식재산권은 회사 또는 정당한
            권리자에게 귀속됩니다. 회원은 회사 사전 승낙 없이 영리 목적으로
            이용하거나 제3자에게 이용하게 해서는 안 됩니다.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제20조 (광고 게재)</h3>
          <p className="leading-relaxed">
            회사는 서비스 운영과 관련하여 다양한 채널에 광고를 게재할 수 있으며,
            회원은 수신 거절이 가능합니다.
          </p>
        </div>
      </section>

      <hr className="my-10 border-gray-200" />

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">제7장 개인정보 보호</h2>
        <p className="leading-relaxed">
          개인정보 보호는 개인정보처리방침에 따릅니다.
        </p>
      </section>

      <hr className="my-10 border-gray-200" />

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">제8장 손해배상 및 면책</h2>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제22조 (손해배상)</h3>
          <p className="leading-relaxed">
            회사의 고의 또는 중과실로 인한 손해에 한하여 통상손해 범위 내에서
            배상합니다.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제23조 (면책조항)</h3>
          <p className="leading-relaxed">
            천재지변, 통신두절, 불가항력 등으로 인한 서비스 불가 시 책임이
            면제되며, 회원 귀책사유로 인한 장애에 대해서도 책임지지 않습니다.
          </p>
        </div>
      </section>

      <hr className="my-10 border-gray-200" />

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">제9장 분쟁의 해결</h2>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제24조 (분쟁의 조정)</h3>
          <p className="leading-relaxed">
            회사와 회원은 분쟁 발생 시 성실히 협의하며, 해결되지 않을 경우 관련
            법률에 따라 개인정보 분쟁조정위원회 등에 조정을 신청할 수 있습니다.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">제25조 (준거법 및 관할)</h3>
          <p className="leading-relaxed">
            본 약관은 대한민국 법을 준거법으로 하며, 분쟁의 제1심 전속 관할은
            서울서부지방법원으로 합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
