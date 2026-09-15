"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ShieldCheck } from "lucide-react";
import { formatTimer, maskPhone, normalizePhone } from "@/lib/phone";

const OTP_TTL = 300;
const RESEND_COOLDOWN = 60;

function formatPhoneDisplay(d: string): string {
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resendError, setResendError] = useState("");
  const [timer, setTimer] = useState(OTP_TTL);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== "code" || timer <= 0) return;
    const t = setInterval(() => setTimer((n) => (n <= 1 ? 0 : n - 1)), 1000);
    return () => clearInterval(t);
  }, [step, timer]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(
      () => setResendCooldown((n) => (n <= 1 ? 0 : n - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [resendCooldown]);

  const sendOtp = async (resending = false) => {
    if (resending) setResendError("");
    else setErrorMsg("");
    setIsSending(true);
    try {
      const res = await fetch("/api/tools/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneDigits }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const msg = data.error ?? "전송 실패";
        if (resending) setResendError(msg);
        else setErrorMsg(msg);
        return;
      }
      setStep("code");
      setCode("");
      setTimer(OTP_TTL);
      setResendCooldown(RESEND_COOLDOWN);
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch {
      const msg = "네트워크 오류가 발생했어요.";
      if (resending) setResendError(msg);
      else setErrorMsg(msg);
    } finally {
      setIsSending(false);
    }
  };

  const verify = async () => {
    setErrorMsg("");
    setIsVerifying(true);
    try {
      const res = await fetch("/api/tools/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneDigits, code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "인증 실패");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setErrorMsg("네트워크 오류가 발생했어요.");
    } finally {
      setIsVerifying(false);
    }
  };

  const expired = step === "code" && timer === 0;

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
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">
              <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-pink-500 bg-clip-text text-transparent">
                조사 도구 로그인
              </span>
            </h1>
            <p className="text-sm text-gray-400">
              힐리힐리 앱 가입 시 사용한 휴대폰 번호로 로그인해주세요.
            </p>
          </div>

          {step === "phone" ? (
            <div className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-orange-400" />
                </div>
                <span className="text-sm text-gray-400">휴대폰 인증</span>
              </div>
              <label
                htmlFor="phone"
                className="block text-xs font-medium text-gray-400 mb-2"
              >
                휴대폰 번호
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="010-0000-0000"
                value={formatPhoneDisplay(phoneDigits)}
                onChange={(e) => {
                  setPhoneDigits(normalizePhone(e.target.value).slice(0, 11));
                  setErrorMsg("");
                }}
                className="w-full h-12 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600"
              />
              {errorMsg ? (
                <p className="mt-2 text-xs text-red-400">{errorMsg}</p>
              ) : null}
              <button
                type="button"
                onClick={() => sendOtp(false)}
                disabled={phoneDigits.length < 10 || isSending}
                className="mt-5 w-full h-12 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold disabled:opacity-40"
              >
                {isSending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> 전송 중...
                  </span>
                ) : (
                  "인증번호 받기"
                )}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-orange-400" />
                </div>
                <span className="text-sm text-gray-400">
                  {maskPhone(phoneDigits)} 인증번호
                </span>
              </div>
              <div className="relative">
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="6자리"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setErrorMsg("");
                  }}
                  className="w-full h-12 px-3 pr-16 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 tracking-[0.3em]"
                />
                {!expired && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-orange-300">
                    {formatTimer(timer)}
                  </span>
                )}
              </div>
              {errorMsg ? (
                <p className="mt-2 text-xs text-red-400">{errorMsg}</p>
              ) : expired ? (
                <p className="mt-2 text-xs text-red-400">
                  만료됐어요. 다시 받아주세요.
                </p>
              ) : null}
              <button
                type="button"
                onClick={verify}
                disabled={code.length !== 6 || isVerifying || expired}
                className="mt-5 w-full h-12 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold disabled:opacity-40"
              >
                {isVerifying ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> 확인 중...
                  </span>
                ) : (
                  "로그인"
                )}
              </button>
              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setErrorMsg("");
                    setResendError("");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ← 번호 다시 입력
                </button>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSending}
                  onClick={() => sendOtp(true)}
                  className="text-orange-300 disabled:text-gray-600"
                >
                  {isSending
                    ? "전송 중..."
                    : resendCooldown > 0
                      ? `${resendCooldown}초 후 재전송`
                      : "다시 받기"}
                </button>
              </div>
              {resendError ? (
                <p className="mt-2 text-xs text-red-400 text-right">
                  {resendError}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
