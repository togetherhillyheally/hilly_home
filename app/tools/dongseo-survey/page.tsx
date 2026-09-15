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
    other: [
      // iPad Pro 12.9"
      {
        rel: "apple-touch-startup-image",
        url: "/images/splash/splash-2048x2732.png",
        media:
          "screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      // iPad Pro 11"
      {
        rel: "apple-touch-startup-image",
        url: "/images/splash/splash-1668x2388.png",
        media:
          "screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      // iPad 10.2"
      {
        rel: "apple-touch-startup-image",
        url: "/images/splash/splash-1620x2160.png",
        media:
          "screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      // iPhone 15 Pro Max / 14 Pro Max
      {
        rel: "apple-touch-startup-image",
        url: "/images/splash/splash-1290x2796.png",
        media:
          "screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      // iPhone 15/15 Pro / 14 Pro
      {
        rel: "apple-touch-startup-image",
        url: "/images/splash/splash-1179x2556.png",
        media:
          "screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      // iPhone 13/14
      {
        rel: "apple-touch-startup-image",
        url: "/images/splash/splash-1170x2532.png",
        media:
          "screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      // iPhone X/XS/11 Pro / 12 mini / 13 mini
      {
        rel: "apple-touch-startup-image",
        url: "/images/splash/splash-1125x2436.png",
        media:
          "screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      // iPhone XR/11
      {
        rel: "apple-touch-startup-image",
        url: "/images/splash/splash-828x1792.png",
        media:
          "screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      // iPhone 8/SE 2/3
      {
        rel: "apple-touch-startup-image",
        url: "/images/splash/splash-750x1334.png",
        media:
          "screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
    ],
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
