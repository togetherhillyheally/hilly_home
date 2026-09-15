import type { Metadata, Viewport } from "next";
import { readToolSession } from "@/lib/tool-session";
import DongseoSurveyClient from "./DongseoSurveyClient";

export const metadata: Metadata = {
  title: "동서트레일 조사 도우미 | Hilly Heally",
  description: "동서트레일 현장조사용 카운터·참고자료 도우미 페이지",
  robots: { index: false, follow: false },
  applicationName: "동서트레일 조사",
  appleWebApp: {
    capable: true,
    title: "동서트레일 조사",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/images/another_logo.png",
    apple: "/images/another_logo.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0D1117",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default async function DongseoSurveyPage() {
  const session = await readToolSession();
  return (
    <DongseoSurveyClient
      loggedInNickname={session?.nickname ?? null}
    />
  );
}
