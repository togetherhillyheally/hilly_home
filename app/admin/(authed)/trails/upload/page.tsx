import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";

export default function TrailUploadPage() {
  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <Link
          href="/admin/trails"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          코스 지도 목록
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          GPX 업로드
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          GPX 파일을 올려 새 코스 지도를 등록합니다. 여러 파일을 동시에 올리면
          하나의 멀티 경로 코스로 합쳐 저장됩니다.
        </p>
      </header>

      <UploadForm />
    </main>
  );
}
