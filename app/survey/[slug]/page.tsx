import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { parseSurvey } from "@/lib/survey-parser";
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

  return <SurveyClient survey={survey} slug={slug} />;
}
