import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { getLegalDocument } from "@/lib/legal";

export const metadata: Metadata = {
  title: "개인정보처리방침 | Hilly Heally",
  description: "Hilly Heally의 개인정보 처리방침 안내",
};

export const dynamic = "force-dynamic";

export default async function PrivacyPolicyPage() {
  const doc = await getLegalDocument("privacy");
  const effectiveDate = doc?.effective_date ?? "—";

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
            개인정보처리방침
          </h1>
          <p className="mt-2 text-sm text-white">시행일: {effectiveDate}</p>
        </header>

        {doc ? (
          <article className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-200 prose-li:text-gray-200 prose-strong:text-white prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {doc.content_md}
            </ReactMarkdown>
          </article>
        ) : (
          <p className="text-sm text-gray-400">
            방침을 불러올 수 없어요. 잠시 후 다시 시도해주세요.
          </p>
        )}

        {doc ? (
          <div className="mt-10 text-sm text-gray-400">
            <p>
              본 방침은 {effectiveDate.replace(/-/g, ".")}부터 시행됩니다. 변경
              시 사전 공지 후 적용됩니다.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
