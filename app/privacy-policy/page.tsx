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
    <main className="container mx-auto px-4 py-12">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/">
          <Button variant="outline" size="sm">
            홈으로
          </Button>
        </Link>
      </div>
      <article className="prose prose-neutral max-w-4xl privacy-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </article>
    </main>
  );
}
