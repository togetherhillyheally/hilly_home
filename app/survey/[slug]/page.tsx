import fs from "fs";
import path from "path";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { parseSurvey } from "@/lib/survey-parser";
import { fetchSurveyStatus } from "@/lib/supabase";
import SurveyClient from "./survey-client";

const SURVEY_DIR = path.join(process.cwd(), "surveys");

export async function generateStaticParams() {
  if (!fs.existsSync(SURVEY_DIR)) return [];
  return fs
    .readdirSync(SURVEY_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ slug: f.replace(/\.md$/, "") }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const filePath = path.join(SURVEY_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return { title: "설문지" };
  const md = fs.readFileSync(filePath, "utf-8");
  const survey = parseSurvey(md);
  return { title: `${survey.title} | Hilly Heally` };
}

export const dynamic = "force-dynamic";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const filePath = path.join(SURVEY_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) notFound();

  const md = fs.readFileSync(filePath, "utf-8");
  const survey = parseSurvey(md);
  const status = await fetchSurveyStatus(slug);

  if (status?.is_closed) {
    return <ClosedView title={survey.title} reason={status.closed_reason} />;
  }

  return <SurveyClient survey={survey} slug={slug} />;
}

function ClosedView({
  title,
  reason,
}: {
  title: string;
  reason: string | null;
}) {
  return (
    <div className="min-h-screen bg-[#08080f] text-gray-100 flex flex-col">
      <header className="sticky top-0 z-50 bg-[#08080f]/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/home_logo.png"
              alt="Hillyheally"
              width={72}
              height={40}
              className="h-12 w-auto"
            />
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center py-16">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3 whitespace-pre-line">
            {title}
          </h1>
          <p className="text-gray-300 text-base mb-2">
            모집이 마감되었습니다.
          </p>
          {reason ? (
            <p className="text-gray-500 text-sm mb-8">{reason}</p>
          ) : (
            <p className="text-gray-500 text-sm mb-8">
              관심 가져주셔서 감사합니다.
            </p>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium border border-white/10 hover:border-orange-400/40 hover:text-orange-300 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
