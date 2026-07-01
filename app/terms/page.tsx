import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TERMS_CONTENT, TERMS_EFFECTIVE_DATE } from "./terms-content";

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
          <p className="mt-2 text-sm text-white">
            시행일: {TERMS_EFFECTIVE_DATE}
          </p>
        </header>

        {TERMS_CONTENT.map((chapter, ci) => (
          <section key={ci} className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">
              {chapter.title}
            </h2>
            <div className="space-y-5">
              {chapter.sections.map((section, si) => (
                <div key={si}>
                  {section.subtitle ? (
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {section.subtitle}
                    </h3>
                  ) : null}
                  <p className="text-sm md:text-base leading-relaxed text-gray-200 whitespace-pre-wrap">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-10 text-sm text-gray-400">
          <p>
            본 약관은 {TERMS_EFFECTIVE_DATE.replace(/-/g, ".")}부터 시행됩니다.
            약관 변경 시 사전 공지 후 적용됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}
