"use client";

import { useRouter } from "next/navigation";

type Props = {
  options: { id: string; name: string }[];
  selectedId: string;
};

export default function PuzzlePicker({ options, selectedId }: Props) {
  const router = useRouter();
  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(`/admin/puzzle-progress?puzzle_id=${e.target.value}`)}
      className="w-full max-w-sm h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
    >
      {options.map((p) => (
        <option key={p.id} value={p.id} className="bg-[#161616]">
          {p.name}
        </option>
      ))}
    </select>
  );
}
