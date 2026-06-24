"use client";

import { useEffect, useState } from "react";
import { Smartphone, AlertTriangle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OpenAppButtonProps {
  trailId: string;
  appStoreUrl?: string;
  playStoreUrl: string;
}

// prod 앱 scheme — app.config.ts 와 동일
const APP_SCHEME = "hillyheally";

// 인앱 브라우저(앱 자동 열기/스킴이 막히는 환경) 감지
function detectInApp(ua: string): "kakao" | "instagram" | null {
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  // 인스타그램/페이스북 인앱 웹뷰
  if (/Instagram|FBAN|FBAV|FB_IAB/i.test(ua)) return "instagram";
  return null;
}

function detectPlatform(ua: string): "ios" | "android" | "other" {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

export default function OpenAppButton({
  trailId,
  appStoreUrl,
  playStoreUrl,
}: OpenAppButtonProps) {
  const [inApp, setInApp] = useState<"kakao" | "instagram" | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    const ua = navigator.userAgent;
    setInApp(detectInApp(ua));
    setPlatform(detectPlatform(ua));
    setCurrentUrl(window.location.href);
  }, []);

  const handleOpenApp = () => {
    // 커스텀 스킴 시도 — 앱 설치돼있으면 자동 전환
    window.location.href = `${APP_SCHEME}://t/${trailId}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  // 카톡/인스타 인앱 브라우저: 외부 브라우저 열기 안내
  if (inApp) {
    const guide =
      inApp === "kakao"
        ? "우측 상단 ⋯ → 다른 브라우저로 열기를 눌러주세요."
        : "우측 상단 ⋯ → 외부 브라우저에서 열기를 눌러주세요.";
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="space-y-1 text-sm text-amber-900">
              <p className="font-semibold">
                여기서는 앱이 자동으로 열리지 않아요
              </p>
              <p className="text-amber-800">{guide}</p>
            </div>
          </div>
        </div>
        <Button onClick={handleCopy} variant="outline" className="w-full h-12">
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              링크가 복사되었어요
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              링크 복사하기
            </>
          )}
        </Button>
      </div>
    );
  }

  const storeUrl = platform === "ios" ? appStoreUrl : playStoreUrl;

  return (
    <div className="space-y-3">
      <Button
        onClick={handleOpenApp}
        className="w-full h-12 text-base font-semibold"
      >
        <Smartphone className="mr-2 h-5 w-5" />
        Hilly Heally 앱에서 보기
      </Button>
      {storeUrl ? (
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          앱이 설치되어 있지 않다면 다운로드하기
        </a>
      ) : null}
    </div>
  );
}
