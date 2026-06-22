import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "서비스 이용약관 | Hilly Heally",
  description: "Hilly Heally 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <main className="container mx-auto px-4 py-12 max-w-4xl text-white">
        <div className="mb-6 flex justify-between items-center">
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

        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            서비스 이용약관
          </h1>
          <p className="mt-2 text-sm text-white">시행일: 2025-09-01</p>
        </header>

        {/* 제1장 총칙 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">제1장 총칙</h2>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">제1조 (목적)</h3>
            <p className="leading-relaxed text-white">
              본 약관은 주식회사 힐리힐리(이하 &apos;회사&apos;)가 제공하는
              트레킹, 산행 모임 관리, 지도 기반 탐색 및 커뮤니티 서비스(이하
              &apos;서비스&apos;)의 이용에 대한 회사와 이용자 간의 권리·의무 및
              책임사항을 규정함을 목적으로 합니다.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제2조 (용어의 정의)
            </h3>
            <p className="leading-relaxed text-white mb-2">
              이 약관에서 사용하는 주요 용어의 정의는 다음과 같습니다:
            </p>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>회원: 회사와 이용계약을 체결하고, 서비스를 이용하는 자</li>
              <li>비회원: 회원가입 없이 서비스를 이용하는 자</li>
              <li>
                서비스: 힐리힐리 앱을 통해 제공하는 산행 모임 생성·참가, 지도
                업로드·탐색, GPS 위치 추적, 실시간 위치 공유, 커뮤니티 후기 등의
                제반 서비스
              </li>
              <li>
                콘텐츠: 회사 또는 회원이 서비스 내에서 제공하는 유/무료 정보 및
                기능
              </li>
              <li>
                이용자: 회사가 제공하는 콘텐츠를 회사가 정한 절차에 따라 무상
                또는 유료로 소비하는 회원 또는 비회원
              </li>
            </ul>
            <p className="leading-relaxed text-white">
              본 약관에서 사용하는 용어 중 위에서 정하지 아니한 것은, 관계 법령
              및 서비스별 안내에서 정하는 바에 따르며, 그 외에는 일반적인
              상관례에 따릅니다.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제3조 (약관의 효력 및 명시와 개정)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사는 이 약관의 내용과 상호, 대표자 성명, 영업소 소재지(소비자
                불만 처리 주소 포함), 전자우편 주소, 사업자등록번호,
                개인정보관리책임자 등을 회원이 쉽게 알 수 있도록 서비스 페이지에
                게시합니다.
              </li>
              <li>
                이 약관은 회원의 동의와 회사의 승낙으로 효력을 발생하며, 회사는
                관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있습니다.
              </li>
              <li>
                약관을 개정할 경우, 회사는 적용일자 및 개정사유를 명시하여 최소
                7일 전 공지하며, 회원에게 불리한 내용의 경우 최소 30일 이상의
                사전 유예기간을 두고 공지합니다. 변경 전·후 내용을 이메일, 문자
                또는 알림톡 등으로 안내할 수 있습니다.
              </li>
              <li>
                회원은 변경된 약관에 동의하지 않을 경우 탈퇴를 요청할 수 있으며,
                효력 발생일 이후 탈퇴 요청이 없는 경우 약관에 동의한 것으로
                간주됩니다.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제4조 (약관 외 준칙)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                본 약관에서 명시하지 않은 사항은 관련 법령 또는 상관례에
                따릅니다.
              </li>
              <li>
                회원은 서비스 이용 시 관련 법령을 준수하여야 하며, 약관 규정을
                이유로 면책을 주장할 수 없습니다.
              </li>
              <li>
                회사는 별도의 이용약관 또는 정책(&apos;별도 약관&apos;)을 둘 수
                있으며, 본 약관과 충돌하는 경우 별도 약관이 우선 적용됩니다.
              </li>
            </ul>
          </div>
        </section>

        <hr className="my-10 border-gray-700" />

        {/* 제2장 이용계약의 체결 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">
            제2장 이용계약의 체결
          </h2>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제5조 (회원가입)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회원은 회사가 정한 가입 양식에 따라 회원정보를 기입하고 약관
                동의를 표시함으로써 회원가입을 신청합니다. 회사는 필요한 경우
                실명확인 및 본인인증을 요청할 수 있습니다.
              </li>
              <li>
                다음 각 호에 해당하는 경우를 제외하고, 신청자는 회원으로
                등록됩니다: 제6조 제3항에 따라 과거 회원자격이 상실된 자로서 3년
                이내 재가입하려는 경우(단, 별도 승낙 시 예외), 가입정보에 허위·
                누락·오기가 있는 경우, 기술상 지장이 예상되는 경우
              </li>
              <li>
                회원가입 성립 시점은 회사의 승낙이 회원에게 도달한 시점으로
                합니다.
              </li>
              <li>
                회사는 설비 여유 또는 기술·업무상 사유로 이용계약 승낙을 유보할
                수 있으며, 그 사유를 안내합니다.
              </li>
              <li>
                만 14세 미만으로 본인인증이 불가능한 경우 회원가입이 제한됩니다.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제6조 (회원탈퇴 및 자격 정지)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회원은 언제든지 탈퇴 요청할 수 있으며, 회사는 즉시 처리합니다.
              </li>
              <li>
                다음 사유에 해당하는 경우 회사는 회원자격을 제한 또는 정지할 수
                있습니다: 타인 정보 도용, 허위 정보로 가입, 서비스 방해 또는 질서
                위협, 회사나 운영자 사칭, 시스템 해킹 또는 클라이언트 무단 변경,
                명예 훼손·업무 방해·허위사실 유포, 스팸·홍보·불법 거래 행위,
                다수 신고·약관 악용·부적절 콘텐츠 반복 등
              </li>
              <li>
                동일 행위 반복 또는 시정 불이행 시 회원자격을 박탈할 수 있으며, 이
                경우 말소 전 30일 이상의 소명 기회를 부여합니다.
              </li>
              <li>
                탈퇴 후 동일 이메일로의 재가입은 시스템 보안 및 운영 안정성
                확보를 위해 7일간 제한됩니다. 다만, 운영자 승인 또는 오류 등
                특별한 사유가 인정되는 경우에는 예외적으로 즉시 재가입이 허용될 수
                있습니다.
              </li>
              <li>
                회원은 탈퇴하는 경우, 회사가 이벤트 등의 방식으로 제공한 적립금,
                쿠폰 등 포인트성 혜택은 모두 자동 소멸되며, 복구되지 않습니다.
              </li>
            </ul>
          </div>
        </section>

        <hr className="my-10 border-gray-700" />

        {/* 제3장 서비스의 이용 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">제3장 서비스의 이용</h2>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제7조 (서비스의 내용)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사는 회원에게 트레킹, 산행 활동과 관련된 다양한 서비스를
                제공합니다. 서비스에는 산행 모임 생성·참가, 지도 업로드·탐색, GPS
                위치 추적·경로 기록, 실시간 위치 공유, 스탬프 모험, 퍼즐 수집,
                커뮤니티 후기 공유 등이 포함될 수 있습니다.
              </li>
              <li>
                회사는 회원과의 별도 서면 계약 없이 회사 또는 제휴사의 상호,
                상표, 로고, 도메인 네임 등 식별 자산을 사용할 수 있는 권리를
                부여하지 않습니다.
              </li>
              <li>
                회사는 일부 서비스 또는 기능을 유료로 제공할 수 있으며, 유료
                서비스의 내용 및 이용 조건은 별도로 안내합니다.
              </li>
              <li>
                회사는 서비스의 내용, 형식, 기능, 디자인 등을 수시로 추가, 변경
                또는 중단할 수 있습니다. 단, 회원에게 불리한 변경이 발생하는 경우
                사전에 고지합니다.
              </li>
              <li>
                회사는 시스템 점검, 기술적 사유, 정책 변경 등으로 인해 일부
                기능의 제공을 일시적으로 중단할 수 있으며, 가능한 경우 사전에
                고지합니다.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제8조 (서비스 이용시간)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                서비스 이용은 회사의 업무상 또는 기술상 특별한 지장이 없는 한
                연중무휴, 1일 24시간 운영을 원칙으로 합니다. 다만, 시스템
                정기점검, 설비 증설 및 교체를 위해 필요할 경우에는 서비스를 일시
                중단할 수 있고, 예정된 작업으로 인한 서비스 일시 중단은 서비스
                플랫폼을 통해 사전에 공지합니다.
              </li>
              <li>
                회사는 긴급한 시스템 점검 등 부득이한 사유가 있을 경우에는 예고
                없이 서비스를 일시 중단할 수 있으며, 기존 서비스를 새로운
                서비스로 변경하거나 교체할 필요가 있을 경우에는 제공되는 서비스를
                완전히 중단할 수 있습니다.
              </li>
              <li>
                서비스 이용 관련 문의는 업무 시간 (10:00 – 17:00) 내에
                처리되며, 처리 완료까지 2-3일이 소요될 수 있습니다.
              </li>
              <li>
                회사는 국가비상사태, 정전, 설비의 장애 또는 서비스 이용의 폭주
                등으로 인하여 정상적인 서비스를 제공하기 곤란할 경우 서비스의 전부
                또는 일부를 제한하거나 중단할 수 있습니다. 다만 이 경우 그 사유 및
                기간 등을 회원에게 사전 또는 사후에 공지합니다.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제9조 (서비스의 변경 및 중단)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사는 상당한 이유가 있는 경우 운영상 또는 기술상의 필요에 따라
                제공 중인 서비스의 전부 또는 일부를 변경하거나 종료할 수 있습니다.
              </li>
              <li>
                서비스의 내용, 이용방법, 이용시간에 변경이 있는 경우, 회사는 변경
                사유, 변경될 서비스의 내용 및 제공일자 등을 해당 서비스
                초기화면 또는 이에 준하는 방법으로 사전에 공지합니다.
              </li>
              <li>
                회사는 무료로 제공되는 서비스의 일부 또는 전부를 회사의 정책 및
                운영 필요에 따라 수정, 중단 또는 변경할 수 있으며, 이에 대하여
                관련 법령에 특별한 규정이 없는 한 회원에게 별도의 보상을 하지
                않습니다.
              </li>
              <li>
                회사는 경영상의 이유 등으로 서비스를 종료할 수 있으며,
                종료일로부터 최소 30일 이전에 E-mail, 카카오채널 또는 문자메시지
                등을 통해 회원에게 개별 통지합니다.
              </li>
            </ul>
          </div>
        </section>

        <hr className="my-10 border-gray-700" />

        {/* 제4장 서비스 기능 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">제4장 서비스 기능</h2>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제10조 (지도 및 경로 서비스)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사는 트레킹·산행 관련 지도 콘텐츠를 제공하며, 회원이 GPX
                파일을 업로드하여 자신만의 지도를 생성할 수 있는 기능을
                제공합니다.
              </li>
              <li>
                지도에는 거리, 고도, 경로 등 활동에 필요한 주요 정보가 포함될 수
                있습니다.
              </li>
              <li>
                지도 정보는 실제 지형, 거리와 오차가 발생할 수 있으며, 회원은
                이를 참고자료로 활용하여야 하며 회사는 전적인 정확성 또는 안전성을
                보장하지 않습니다.
              </li>
              <li>
                본 지도 서비스는 사용자의 자율적 판단에 따른 탐방을 지원하기 위한
                도구이며, 실제 환경에서의 안전 확보는 사용자 책임입니다.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제11조 (산행 모임 및 모험 서비스)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사는 회원이 산행 모임(이하 &apos;모험&apos;)을 생성하고, 다른
                회원을 초대하거나 참가 신청을 받을 수 있는 기능을 제공합니다.
              </li>
              <li>
                모험 진행 중 모험자 간 실시간 위치 공유, 채팅, 경로 기록 등의
                기능이 제공됩니다.
              </li>
              <li>
                모험 중 발생하는 사고, 분쟁 등에 대하여 회사는 서비스 제공자로서의
                책임만을 부담하며, 모험자 간의 분쟁에 대해서는 직접적인 책임을
                지지 않습니다.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제12조 (실시간 위치 공유 기능)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사는 모험 모험자 간 실시간 위치 정보를 상호 공유할 수 있는
                기능을 제공합니다.
              </li>
              <li>
                본 서비스는 참여자의 위치 데이터를 실시간으로 수집 및 전송하며,
                모험자 간 위치 확인을 목적으로 합니다.
              </li>
              <li>
                본 서비스는 앱이 백그라운드 상태이거나 화면이 잠금된 경우에도
                실시간 위치 공유 및 경로 기록 기능 유지를 위하여 위치정보를
                지속적으로 수집할 수 있으며, 회원은 이 점에 동의한 것으로
                간주됩니다.
              </li>
              <li>
                위치 정보는 일정 간격으로 자동 수집되며, 배터리 사용량에 영향을
                미칠 수 있습니다.
              </li>
              <li>
                모험 진행 중 수집된 GPS 이동 경로는 모험 완료 시 서버에 저장되며,
                이동 경로 시각화 및 모험 공유 기능에 활용됩니다. 회원 탈퇴 시
                해당 데이터는 삭제됩니다.
              </li>
              <li>
                회원은 해당 서비스 이용 시 자신의 위치정보 제공에 동의한 것으로
                간주되며, 위치정보 수집 및 활용은 관련 법령 및 회사의
                개인정보처리방침에 따릅니다.
              </li>
              <li>
                회사는 위치정보의 정확성 또는 실시간 전송의 안정성에 대해 완전한
                보장을 하지 않으며, 통신환경 및 기기 상태에 따라 지연 또는 오류가
                발생할 수 있습니다.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제13조 (커뮤니티 운영 및 후기 공유 서비스)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사는 회원 간의 정보 공유와 소통을 위한 커뮤니티 서비스를 제공할
                수 있으며, 후기, 체크포인트 기록, 사진 공유 등의 기능을
                포함합니다.
              </li>
              <li>
                회원이 작성한 게시물의 저작권은 해당 회원에게 있으며, 회사는
                서비스 운영 및 홍보 목적의 범위 내에서 이를 활용할 수 있습니다.
              </li>
              <li>
                회원은 타인의 권리를 침해하거나 불법적, 부적절한 콘텐츠를
                등록해서는 안 되며, 회사는 관련 게시물을 사전 통지 없이 삭제하거나
                조치할 수 있습니다.
              </li>
            </ul>
          </div>
        </section>

        <hr className="my-10 border-gray-700" />

        {/* 제5장 계약 당사자의 의무 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">
            제5장 계약 당사자의 의무
          </h2>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제14조 (회사의 의무)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사는 계속적이고 안정적으로 서비스를 제공하기 위하여 최선을
                다합니다.
              </li>
              <li>
                회사는 신용정보를 포함한 회원의 개인정보 보호를 위하여
                보안시스템을 갖추며 개인정보처리방침을 공시하고 준수합니다.
              </li>
              <li>
                회사는 서비스 이용과 관련한 회원의 의견이나 불만사항 등을
                경청하며, 정당하다고 인정할 경우 이를 처리합니다. 처리한 결과는
                개별알림 또는 E-mail을 통해 회원에게 통지합니다.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제15조 (회원의 의무)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회원은 회사가 서비스를 통해 제공하는 콘텐츠에 대하여 어떠한
                권리도 취득하지 않습니다.
              </li>
              <li>
                회원은 회사의 동의 없이 콘텐츠를 서비스를 제공받는 용도 외로
                이용하여서는 아니 되며, 특히 아래와 같은 행위를 할 경우 그에 대한
                모든 민형사상 책임을 지게 될 수 있습니다: 회사에서 정한 방법 외에
                콘텐츠에 접근하는 행위, 콘텐츠를 제공하는 본 서비스 또는
                제공자의 이익을 저해하는 상업적인 행위, 기타 콘텐츠에 대한 모든
                저작권 침해 행위
              </li>
              <li>
                서비스의 서버와 네트워크 시스템에 허락되지 않은 방식으로 접근하는
                일체의 행위 또는 서비스의 제공을 방해하는 행위를 해서는 안됩니다.
              </li>
              <li>
                회원은 다음과 같은 행위를 하여서는 안 됩니다: 회사에 허위정보를
                제공하거나 타인의 정보를 도용하는 행위, 회사 및 제3자의
                지식재산권 침해 행위, 회사 및 제3자의 명예를 훼손하거나 업무를
                방해하는 행위, 다른 회원의 개인정보를 무단 수집하거나 명예를
                손상하는 행위, 광고성 정보를 수신자의 의사에 반하여 지속적으로
                전송하는 행위, 회사의 정상적인 경영 또는 서비스 운영을 방해하는
                행위, 회사를 사칭하거나 허위 정보를 유포하는 행위
              </li>
            </ul>
          </div>
        </section>

        <hr className="my-10 border-gray-700" />

        {/* 제6장 콘텐츠 및 광고 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">
            제6장 콘텐츠 및 광고
          </h2>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제16조 (저작권 등)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사가 제작한 저작물에 대한 저작권 기타 지식재산권은 회사에
                귀속됩니다.
              </li>
              <li>
                회원은 서비스를 이용함으로써 얻은 정보 중 회사에 지식재산권이
                귀속된 정보를 회사의 사전 승낙없이 복제, 전송, 출판, 배포, 방송
                기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게
                하여서는 안됩니다.
              </li>
              <li>
                회사는 회원이 올린 콘텐츠를 서비스 운영 및 홍보 목적의 범위
                내에서 활용할 수 있습니다.
              </li>
              <li>
                이 조항은 회사가 서비스를 운영하는 동안 유효하며, 회원 탈퇴
                후에도 지속적으로 적용됩니다.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제17조 (광고 게재)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사는 서비스 운영과 관련하여 서비스 화면, 응용프로그램,
                푸시메시지(Push Notification) 등에 광고를 게재할 수 있고, 회원은
                서비스 이용 시 노출되는 광고게재에 동의합니다. 이 경우 회원은
                언제든지 수신을 거절할 수 있으며, 회사는 회원의 수신 거절 시
                광고성 정보를 발송하지 않습니다.
              </li>
              <li>
                회사가 제공하는 서비스 중의 배너 또는 링크 등을 통해 타인이
                제공하는 광고나 서비스에 연결될 수 있습니다.
              </li>
              <li>
                타인이 제공하는 광고나 서비스에 연결될 경우 해당 영역에서 제공하는
                서비스는 회사의 서비스 영역이 아니므로 회사가 신뢰성, 안정성 등을
                보장하지 않으며, 그로 인한 회원의 손해에 대하여도 회사는 책임을
                지지 않습니다.
              </li>
            </ul>
          </div>
        </section>

        <hr className="my-10 border-gray-700" />

        {/* 제7장 개인정보 보호 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">제7장 개인정보 보호</h2>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제18조 (개인정보 보호)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사는 신용정보를 포함한 회원의 개인정보 보호를 위하여
                보안시스템을 갖추며 개인정보처리방침을 공시하고 준수합니다.
              </li>
              <li>
                회원은 해당 서비스 이용 시 자신의 위치정보 제공에 동의한 것으로
                간주되며, 위치정보 수집 및 활용은 관련 법령 및 회사의
                개인정보처리방침에 따릅니다.
              </li>
              <li>
                회사는 서비스 이용과 관련한 회원의 개인정보 보호를 위하여 최선을
                다하며, 관련 법령 및 개인정보처리방침에 따라 개인정보를 안전하게
                관리합니다.
              </li>
            </ul>
          </div>
        </section>

        <hr className="my-10 border-gray-700" />

        {/* 제8장 손해배상 및 면책 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">
            제8장 손해배상 및 면책
          </h2>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제19조 (손해배상)
            </h3>
            <p className="leading-relaxed text-white">
              회사가 제공하는 서비스로 인하여 회원에게 손해가 발생하는 경우
              회사는 그 손해가 회사의 고의 또는 중과실에 의한 경우에 한하여
              통상손해의 범위에서 손해배상책임을 부담합니다.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제20조 (면책조항)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사는 천재지변 또는 이에 준하는 불가항력, 정보통신설비의
                보수점검, 교체 또는 고장, 통신의 두절 등으로 인하여 일시적 또는
                종국적으로 서비스를 제공할 수 없는 경우, 서비스 제공에 관한 책임이
                면제됩니다.
              </li>
              <li>
                회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을
                지지 않습니다.
              </li>
              <li>
                회사는 회원이 다른 회원에 의해 게재된 정보, 자료, 사실의 정확성
                등을 신뢰함으로써 입은 손해에 대하여 책임을 지지 않습니다.
              </li>
              <li>
                본 서비스는 신체 활동 장려에 관한 주요 내용을 포함하고 있을 수
                있습니다. 회원은 산행, 트레킹 등 신체 활동에 따른 위험 요소를
                충분히 고려해야 하며, 회사는 서비스 기능의 사용 또는 사용 불능으로
                발생할 수 있는 모든 상해 또는 피해에 책임을 지지 않습니다.
              </li>
            </ul>
          </div>
        </section>

        <hr className="my-10 border-gray-700" />

        {/* 제9장 분쟁의 해결 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">제9장 분쟁의 해결</h2>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제21조 (분쟁의 조정)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회사는 서비스 이용 및 개인정보, 위치정보와 관련된 분쟁의 해결을
                위해 회원과 성실히 협의합니다.
              </li>
              <li>
                전항의 협의에서 분쟁이 해결되지 않은 경우, 회사와 회원은 관련
                법률에 의해 개인정보보호법 제43조의 규정에 의해 개인정보
                분쟁조정위원회에 조정을 신청할 수 있습니다.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제22조 (준거법 및 관할법원)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                이 약관에 명시되지 않은 사항은 전기통신사업법 등 관계법령과
                상관습에 따릅니다.
              </li>
              <li>
                회사와 회원간에 제기된 법적 분쟁은 대한민국 법을 준거법으로
                합니다.
              </li>
              <li>
                회사와 회원간의 분쟁에 관한 소송은 서울서부지방법원을 제1심
                전속적 합의관할 법원으로 합니다.
              </li>
            </ul>
          </div>
        </section>

        <hr className="my-10 border-gray-700" />

        {/* 제10장 회원 탈퇴 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">제10장 회원 탈퇴</h2>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제23조 (회원 탈퇴 절차)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회원은 앱 내 [설정]에서 언제든지 회원 탈퇴를 신청할 수 있으며,
                회사는 지체 없이 처리합니다.
              </li>
              <li>
                탈퇴 신청 시 안내되는 데이터 처리 기준(개인정보 삭제, 보관 항목
                및 기간 등)에 동의해야 하며, 동의하지 않는 경우 탈퇴가 제한될 수
                있습니다.
              </li>
              <li>
                탈퇴가 완료되면 서비스 이용과 관련된 권리(장작·모닥불·퍼즐 조각,
                모험 기록 등)는 즉시 소멸하며 복구되지 않습니다.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제24조 (탈퇴 시 데이터 처리 기준)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                개인정보(이름, 이메일, 휴대폰번호): 탈퇴 즉시 영구 삭제
              </li>
              <li>장작·모닥불·퍼즐 조각, 모험 기록: 삭제(복구 불가)</li>
              <li>
                후기, 댓글 등 커뮤니티 게시물: 계정 식별정보는 제거하고
                &apos;탈퇴한 사용자&apos;로 표시되어 콘텐츠는 유지될 수 있음
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제25조 (재가입 및 복원 정책)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                시스템 보안 및 운영 안정성 확보를 위해 탈퇴 후 동일 이메일로의
                재가입이 7일간 제한될 수 있습니다. 단, 운영자 승인 등 특별한 사유가
                인정되는 경우 예외적으로 재가입 제한이 해제될 수 있습니다.
              </li>
              <li>
                GPS 기록, 장작·모닥불·퍼즐 조각, 모험 기록 등은 재가입하더라도
                복원이 불가합니다.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              제26조 (탈퇴의 효력)
            </h3>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white">
              <li>
                회원 탈퇴의 효력은 회사의 탈퇴 처리 완료 시점부터 발생하며, 탈퇴
                완료 후에는 계정 및 보유 정보의 복구가 불가능합니다.
              </li>
              <li>
                탈퇴 완료 이후에도 관련 법령 준수를 위하여 일정 정보는 법정 기간
                동안 보관될 수 있습니다.
              </li>
            </ul>
          </div>
        </section>

        <div className="mt-10 text-sm text-gray-400">
          <p>
            본 약관은 2025년 9월 1일부터 시행됩니다. 약관 변경 시 사전 공지 후
            적용됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}
