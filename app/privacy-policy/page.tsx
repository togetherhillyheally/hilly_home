import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "개인정보처리방침 | Hilly Heally",
  description: "Hilly Heally의 개인정보 처리방침 안내",
};

export default async function PrivacyPolicyPage() {
  let markdown = "";
  try {
    const filePath = path.join(
      process.cwd(),
      "app",
      "privacy-policy",
      "privacy.md"
    );
    markdown = fs.readFileSync(filePath, "utf-8");
  } catch (e) {
    markdown = "# 개인정보 처리방침\n문서를 불러올 수 없습니다.";
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <main className="container mx-auto px-4 py-12">
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
          <p className="mt-2 text-sm text-white">시행일: 2025.08.06</p>
        </header>

        <article className="prose prose-invert max-w-4xl privacy-prose text-white [&_*]:text-white [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_h5]:text-white [&_h6]:text-white [&_p]:text-white [&_li]:text-white [&_td]:text-white [&_th]:text-white [&_strong]:text-white [&_em]:text-white">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
