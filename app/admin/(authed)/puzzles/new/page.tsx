import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireMenuSession } from "@/lib/admin-session";
import NewPuzzleForm from "./NewPuzzleForm";

export const dynamic = "force-dynamic";

export default async function NewPuzzlePage() {
  await requireMenuSession("puzzles");

  return (
    <main className="p-6 lg:p-10 max-w-5xl mx-auto">
      <header className="mb-6">
        <Link
          href="/admin/puzzles"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 퍼즐 목록
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          새 퍼즐
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          이미지를 올리면 비율에 맞춰 격자가 자동 계산돼요.
        </p>
      </header>

      <NewPuzzleForm />
    </main>
  );
}
