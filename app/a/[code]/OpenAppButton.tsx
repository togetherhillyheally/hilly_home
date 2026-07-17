"use client";

import { useEffect, useRef, useState } from "react";
import { Smartphone, AlertTriangle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  attemptOpenApp,
  detectInApp,
  detectPlatform,
  shouldAutoAttempt,
  type InAppBrowser,
  type Platform,
} from "@/lib/open-app";

interface OpenAppButtonProps {
  code: string;
  appStoreUrl?: string;
  playStoreUrl: string;
}

export default function OpenAppButton({
  code,
  appStoreUrl,
  playStoreUrl,
}: OpenAppButtonProps) {
  const [inApp, setInApp] = useState<InAppBrowser>(null);
  const [platform, setPlatform] = useState<Platform>("other");
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    const ua = navigator.userAgent;
    setInApp(detectInApp(ua));
    setPlatform(detectPlatform(ua));
    setCurrentUrl(window.location.href);
  }, []);

  const appPath = `a/${code}`;
  const handleOpenApp = () => {
    attemptOpenApp(appPath, platform, playStoreUrl);
  };

  // 랜딩 진입 시 자동 앱 열기 1회 시도 — 설치돼 있으면 웹을 스치듯 지나 바로 앱으로.
  // (카톡 인앱 포함. 인스타/페북 인앱·데스크톱은 제외)
  const autoAttemptedRef = useRef(false);
  useEffect(() => {
    if (autoAttemptedRef.current) return;
    if (!shouldAutoAttempt(platform, inApp)) return;
    if (document.visibilityState !== "visible") return;
    autoAttemptedRef.current = true;
    const t = setTimeout(() => attemptOpenApp(appPath, platform, playStoreUrl), 300);
    return () => clearTimeout(t);
  }, [platform, inApp, appPath, playStoreUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  // 인스타/페북 인앱 브라우저: 스킴 차단 → 외부 브라우저 열기 안내
  if (inApp === "instagram") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="space-y-1 text-sm text-amber-900">
              <p className="font-semibold">
                여기서는 앱이 자동으로 열리지 않아요
              </p>
              <p className="text-amber-800">
                우측 상단 ⋯ → 외부 브라우저에서 열기를 눌러주세요.
              </p>
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
        Hilly Heally 앱에서 열기
      </Button>
      {inApp === "kakao" ? (
        <p className="text-center text-xs text-muted-foreground">
          앱이 열리지 않으면 우측 상단 ⋯ → 다른 브라우저로 열기를 눌러주세요.
        </p>
      ) : null}
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
