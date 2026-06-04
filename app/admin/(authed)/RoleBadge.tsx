type Color = "red" | "violet" | "emerald" | "gray" | "orange";

const PALETTE: Record<Color, string> = {
  red: "bg-red-500/15 text-red-300 border-red-500/30",
  violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  gray: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  orange: "bg-orange-500/15 text-orange-300 border-orange-500/30",
};

export default function RoleBadge({
  label,
  color = "gray",
}: {
  label: string;
  color?: Color;
}) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${PALETTE[color]}`}
    >
      {label}
    </span>
  );
}
