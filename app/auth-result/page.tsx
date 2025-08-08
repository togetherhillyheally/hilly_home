"use client";

import { useEffect, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

interface AuthData {
  certNum: string;
  date: string;
  CI: string;
  DI: string;
  phoneNo: string;
  phoneCorp: string;
  birth: string;
  gender: string;
  nation: string;
  name: string;
  result: string;
  certMet: string;
  ip: string;
  plusInfo: string;
}

function AuthResultContent() {
  const searchParams = useSearchParams();
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiToken = searchParams.get("apiToken");
    const apiCertNum = searchParams.get("apiCertNum");

    // 파라미터 유효성 검사
    if (!apiToken) {
      setError("토큰이 없습니다");
      setLoading(false);
      return;
    }

    if (!apiCertNum) {
      setError("요청번호가 없습니다");
      setLoading(false);
      return;
    }

    // 본인인증 결과 처리
    handleAuthResult(apiToken, apiCertNum);
  }, [searchParams]);

  const handleAuthResult = async (apiToken: string, apiCertNum: string) => {
    try {
      // KMC API 호출
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiToken,
          apiCertNum,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        if (result.success) {
          setAuthData(result.data);
          setLoading(false);
        } else {
          setError(result.message || "본인인증에 실패했습니다");
          setLoading(false);
        }
      } else {
        throw new Error("서버 오류가 발생했습니다");
      }
    } catch (error) {
      console.error("본인인증 처리 중 오류:", error);
      setError("본인인증 처리 중 오류가 발생했습니다");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              본인인증 처리 중
            </h2>
            <p className="mt-2 text-gray-600">잠시만 기다려주세요...</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-red-500">
            <h2 className="text-3xl font-bold">본인인증 실패</h2>
            <p className="mt-2">{error}</p>
          </div>
          <button
            onClick={() => (window.location.href = "/auth")}
            className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/90"
          >
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  if (!authData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8">본인인증 완료</h1>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">인증 정보</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">이름:</span>
                  <span>{authData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">생년월일:</span>
                  <span>{authData.birth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">성별:</span>
                  <span>{authData.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">국적:</span>
                  <span>{authData.nation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">휴대폰번호:</span>
                  <span>{authData.phoneNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">통신사:</span>
                  <span>{authData.phoneCorp}</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">인증 상세</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">요청번호:</span>
                  <span className="text-sm">{authData.certNum}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">요청일시:</span>
                  <span className="text-sm">{authData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">인증방법:</span>
                  <span className="text-sm">{authData.certMet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">결과:</span>
                  <span className="text-sm">{authData.result}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">IP주소:</span>
                  <span className="text-sm">{authData.ip}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t">
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => (window.location.href = "/auth-success")}
                className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/90"
              >
                인증 완료
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthResult() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">
                본인인증 처리 중
              </h2>
              <p className="mt-2 text-gray-600">잠시만 기다려주세요...</p>
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      }
    >
      <AuthResultContent />
    </Suspense>
  );
}
