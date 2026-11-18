import Link from "next/link";
import AdForm from "../AdForm";

export const dynamic = "force-dynamic";

export default function NewAdPage() {
  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <Link href="/admin/ads" className="text-xs text-gray-400 hover:text-gray-200">
          ← 광고 목록
        </Link>
        <h1 className="mt-2 text-2xl lg:text-3xl font-bold text-white tracking-tight">새 광고</h1>
        <p className="text-sm text-gray-400 mt-1">
          이미지를 올리고 자리·기간을 정하면 관전·중계 페이지에 바로 나와요. 카드엔 항상 「광고」 라벨이 붙어요.
        </p>
      </header>
      <AdForm />
    </main>
  );
}
