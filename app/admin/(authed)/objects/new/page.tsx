import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import NewObjectForm from "./NewObjectForm";

export const dynamic = "force-dynamic";

export default function NewObjectPage() {
  return (
    <main className="p-6 lg:p-10 max-w-3xl">
      <header className="mb-6">
        <Link
          href="/admin/objects"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          오브젝트 카탈로그
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          새 오브젝트
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          이미지와 메타정보를 입력해 베이스캠프 카탈로그에 등록하세요.
        </p>
      </header>

      <NewObjectForm />
    </main>
  );
}
