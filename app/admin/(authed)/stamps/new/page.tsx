import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import NewStampMapForm from "./NewStampMapForm";

export const dynamic = "force-dynamic";

export default function NewStampMapPage() {
  return (
    <main className="p-6 lg:p-10 max-w-2xl">
      <header className="mb-6">
        <Link
          href="/admin/stamps"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          스탬프 지도 목록
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          새 스탬프 지도
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          이름·시리즈·순서 모드를 설정해 빈 지도를 만든 뒤, 다음 화면에서 지도
          위에 스탬프 포인트를 직접 찍으세요.
        </p>
      </header>

      <NewStampMapForm />
    </main>
  );
}
