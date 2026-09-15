import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readToolSession } from "@/lib/tool-session";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "로그인 | 힐리힐리 조사 도구",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ToolsLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = next && next.startsWith("/") ? next : "/tools/dongseo-survey";
  const session = await readToolSession();
  if (session) redirect(nextPath);
  return <LoginForm nextPath={nextPath} />;
}
