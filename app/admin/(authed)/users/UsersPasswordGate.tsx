"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UsersPasswordGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "비밀번호가 일치하지 않아요.");
        return;
      }
      router.refresh();
    } catch {
      setErrorMsg("네트워크 오류가 발생했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="p-6 lg:p-10">
      <div className="max-w-md mx-auto mt-20">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-2">
          유저 / 권한
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          관리자 비밀번호를 입력해 접근하세요.
        </p>
        <div className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-orange-400" />
            </div>
            <span className="text-sm text-gray-400">관리자 비밀번호</span>
          </div>
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="비밀번호"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrorMsg("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && password && !isSubmitting) submit();
            }}
            className="bg-white/[0.04] border-white/10 text-white placeholder:text-gray-600 h-12 tracking-[0.3em]"
          />
          {errorMsg ? (
            <p className="mt-2 text-xs text-red-400">{errorMsg}</p>
          ) : null}
          <Button
            onClick={submit}
            disabled={!password || isSubmitting}
            className="mt-5 w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 확인 중...
              </>
            ) : (
              "접근"
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
