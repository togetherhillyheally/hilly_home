"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

/**
 * 신규 기기 입고.
 * 식별자는 "게이트웨이가 기기에게 받는 값"과 같아야 위치가 연결된다 —
 * MT710 은 IMEI 15자리, ML100G 등 JT808 기기는 라벨의 ID 12자리.
 */
export default function NewDeviceForm() {
  const router = useRouter();
  const [deviceId, setDeviceId] = useState("");
  const [hwImei, setHwImei] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    const digits = deviceId.replace(/\D/g, "");
    // ML100G 라벨의 ID 는 11자리 — 서버가 앞에 0 을 붙여 12자리로 저장
    if (digits.length < 11 || digits.length > 15) {
      setErrorMsg("라벨의 ID 숫자를 입력해주세요 (11~15자리)");
      return;
    }
    const imeiDigits = hwImei.replace(/\D/g, "");
    if (imeiDigits && imeiDigits.length !== 15) {
      setErrorMsg("IMEI 는 15자리예요. 비워두셔도 됩니다.");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    const res = await fetch("/api/admin/trackers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imei: digits,
        hw_imei: imeiDigits || null,
        label: label.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErrorMsg(j.error ?? "등록에 실패했어요.");
      return;
    }
    setDeviceId("");
    setHwImei("");
    setLabel("");
    router.refresh();
  };

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="text-sm font-semibold text-white mb-3">신규 기기 입고</h2>
      <div className="mb-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-[11px] leading-relaxed text-gray-500">
        기기 라벨 예시
        <br />
        Model:ML100G G
        <br />
        <span className="text-emerald-400">ID:19210230260</span>{" "}
        <span className="font-sans text-gray-400">← 이 숫자를 「기기 ID」에</span>
        <br />
        IMEI:867284068016551{" "}
        <span className="font-sans text-gray-400">← 참고용 (선택)</span>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <div>
          <input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="기기 ID (라벨의 ID:)"
            inputMode="numeric"
            className="w-52 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/25 focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-gray-500">
            서버 연결에 쓰는 번호 · 필수
          </p>
        </div>
        <div>
          <input
            value={hwImei}
            onChange={(e) => setHwImei(e.target.value)}
            placeholder="IMEI (선택)"
            inputMode="numeric"
            className="w-52 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/25 focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-gray-500">A/S·재고 조회용</p>
        </div>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="라벨 (선택) 예: ML100G #3"
          className="w-48 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/25 focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          재고 등록
        </button>
      </div>
      {errorMsg && <p className="mt-2 text-xs text-red-400">{errorMsg}</p>}
    </section>
  );
}
