"use client";

import { useRouter } from "next/navigation";

type Props = {
  q: string;
  selected: string;
  options: { value: string; label: string }[];
};

export default function TierFilterSelect({ q, selected, options }: Props) {
  const router = useRouter();

  const onChange = (tier: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (tier !== "all") sp.set("tier", tier);
    const qs = sp.toString();
    router.push(qs ? `/admin/users?${qs}` : "/admin/users");
  };

  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#161616]">
          {o.label}
        </option>
      ))}
    </select>
  );
}
