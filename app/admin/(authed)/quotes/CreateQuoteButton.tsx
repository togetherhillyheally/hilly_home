"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { emptyQuoteDraft } from "@/lib/quotes";

export default function CreateQuoteButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();

  const create = async () => {
    setCreating(true);
    try {
      const draft = emptyQuoteDraft();
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json().catch(() => null)) as {
        row?: { id: string };
        error?: string;
      } | null;
      if (!res.ok || !data?.row?.id) {
        alert(data?.error ?? "생성 실패");
        return;
      }
      startTransition(() => router.push(`/admin/quotes/${data.row!.id}`));
    } finally {
      setCreating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={create}
      disabled={creating}
      className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white text-sm font-semibold"
    >
      {creating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      새 견적서
    </button>
  );
}
