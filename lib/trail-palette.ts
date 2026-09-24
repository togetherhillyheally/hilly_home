/**
 * 트레일 세그먼트 순환 팔레트 — segments_colored=true 때 각 세그먼트 색.
 * hilly_po/lib/trail-palette.ts 와 동일 순서 유지.
 */
export const TRAIL_SEGMENT_PALETTE = [
  "#DC2F55", // rose (brand)
  "#F97316", // orange
  "#EAB308", // amber
  "#22C55E", // emerald
  "#0EA5E9", // sky
  "#8B5CF6", // violet
] as const;

export function segmentColor(index: number): string {
  return TRAIL_SEGMENT_PALETTE[
    ((index % TRAIL_SEGMENT_PALETTE.length) + TRAIL_SEGMENT_PALETTE.length) %
      TRAIL_SEGMENT_PALETTE.length
  ];
}
