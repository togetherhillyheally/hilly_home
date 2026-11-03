import { createLucideIcon } from "lucide-react";

/**
 * 보물 지도 테마 (2026-11-03, 앱 constants/treasure.ts 와 맞춤) — 청록 #2DD4BF(= Tailwind teal-400) + 보물상자 아이콘.
 * 이전엔 금색(#F2B705) + 다이아몬드(Gem)였다. 경고 문구는 보물 테마와 무관하게 amber 유지.
 * 아이콘은 앱과 같은 Material Design Icons "treasure-chest" 모양을 lucide 아이콘처럼 쓸 수 있게 감쌌다.
 */
export const TREASURE_COLOR = "#2DD4BF";

export const TreasureChest = createLucideIcon("TreasureChest", [
  [
    "path",
    {
      d: "M5,4H19A3,3 0 0,1 22,7V11H15V10H9V11H2V7A3,3 0 0,1 5,4M11,11H13V13H11V11M2,12H9V13L11,15H13L15,13V12H22V20H2V12Z",
      fill: "currentColor",
      stroke: "none",
      key: "treasure-chest",
    },
  ],
]);
