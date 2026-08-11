"use client";

import { useRouter } from "next/navigation";

type Props = {
  q: string;
  selected: string;
  options: { value: string; label: string }[];
};

export default function ReasonFilterSelect({ q, selected, options }: Props) {
  const router = useRouter();

  const onChange = (category: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category !== "all") sp.set("category", category);
    const qs = sp.toString();
    router.push(qs ? `/admin/bottle-ledger?${qs}` : "/admin/bottle-ledger");
  };

  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-sky-500/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#161616]">
          {o.label}
        </option>
      ))}
    </select>
  );
}
