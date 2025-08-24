"use client";

import { useEffect } from "react";

export default function DiscordCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") || "";
    // dev 빌드면 'hillyheally-dev://'로 바꿔서 테스트
    const scheme =
      "hillyheally://oauth/discord#code=" + encodeURIComponent(code);

    // 스킴 열기
    window.location.replace(scheme);

    // 미설치/차단 대비 fallback 버튼 노출
    const timer = setTimeout(() => {
      const fallback = document.getElementById("fallback");
      if (fallback) {
        fallback.style.display = "block";
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#12131a] text-white font-sans flex items-center justify-center">
      <div>
        <p>앱을 여는 중…</p>
        <p id="fallback" className="hidden">
          열리지 않으면{" "}
          <a
            href="#"
            className="text-[#4ea1ff]"
            onClick={() =>
              (window.location.href = "hillyheally://oauth/discord")
            }
          >
            여기를 눌러 열기
          </a>
        </p>
      </div>
    </div>
  );
}
