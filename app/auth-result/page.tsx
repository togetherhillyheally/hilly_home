"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function AuthResult() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const apiToken = searchParams.get("apiToken");
    const certNum = searchParams.get("certNum");

    // 파라미터 유효성 검사
    if (!apiToken) {
      alert("토큰이 없습니다");
      return;
    }

    if (!certNum) {
      alert("요청번호가 없습니다");
      return;
    }

    // 본인인증 결과 처리
    handleAuthResult(apiToken, certNum);
  }, [searchParams]);

  const handleAuthResult = (apiToken: string, certNum: string) => {
    // 여기서 본인인증 결과를 서버로 전송하거나 처리
    console.log("본인인증 토큰:", apiToken);
    console.log("인증번호:", certNum);

    // 예시: 서버로 결과 전송
    sendAuthResultToServer(apiToken, certNum);
  };

  const sendAuthResultToServer = async (apiToken: string, certNum: string) => {
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiToken,
          certNum,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // 성공 시 처리
        if (result.success) {
          // 성공 페이지로 리다이렉트 또는 상태 업데이트
          window.location.href = "/auth-success";
        } else {
          // 실패 시 처리
          alert("본인인증에 실패했습니다");
          window.location.href = "/auth-failed";
        }
      } else {
        throw new Error("서버 오류가 발생했습니다");
      }
    } catch (error) {
      console.error("본인인증 처리 중 오류:", error);
      alert("본인인증 처리 중 오류가 발생했습니다");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">본인인증 처리 중</h2>
          <p className="mt-2 text-gray-600">잠시만 기다려주세요...</p>
        </div>

        {/* 로딩 스피너 */}
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    </div>
  );
}
