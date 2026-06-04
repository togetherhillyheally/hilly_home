"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Props = {
  endpoint: string;
  initial: boolean;
};

export default function SimpleActiveToggle({ endpoint, initial }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    setPending(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !initial }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(data.error ?? "변경 실패");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      alert("네트워크 오류");
    } finally {
      setPending(false);
    }
  };

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={initial}
        disabled={pending}
        onChange={toggle}
      />
      <span className="w-8 h-[18px] rounded-full bg-white/10 peer-checked:bg-orange-500/80 transition-colors relative">
        <span
          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
            initial ? "translate-x-[14px]" : ""
          }`}
        />
      </span>
      {pending ? (
        <Loader2 className="ml-1.5 h-3 w-3 animate-spin text-gray-500" />
      ) : null}
    </label>
  );
}
