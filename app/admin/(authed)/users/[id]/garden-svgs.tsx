// hilly_rn/components/garden/plantSvgs.tsx 를 웹 SVG(lowercase JSX) 로 이식.
// 원본 좌표계·계산은 그대로. react-native-svg → 브라우저 SVG 태그로만 치환.
// 수정 시 hilly_rn 쪽도 함께 갱신할 것.
import React from "react";

export function mix(c1: string, c2: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(c1), p(c2)];
  const h = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${a.map((v, i) => h(v + (b[i] - v) * t)).join("")}`;
}
export const wiltC = (c: string, w: number) => mix(c, "#9A7B4F", w);
export const dim = (c: string, w: number) => mix(c, "#9CA08A", w * 0.5);

/** 무지개 팔레트 (유니콘 갈기/꼬리 등) — hilly_rn 과 동일 */
const RAINBOW = [
  "#FF6B6B",
  "#FFA94D",
  "#FFE066",
  "#8CE99A",
  "#74C0FC",
  "#B197FC",
  "#F783AC",
];

function Leaf({
  x,
  y,
  rot,
  c,
  len = 15,
}: {
  x: number;
  y: number;
  rot: number;
  c: string;
  len?: number;
}) {
  return (
    <ellipse
      cx={x}
      cy={y}
      rx={len / 2}
      ry={len / 4.2}
      fill={c}
      transform={`rotate(${rot} ${x} ${y})`}
    />
  );
}
const stem = (d: string, c: string, w = 4) => (
  <path d={d} stroke={c} strokeWidth={w} strokeLinecap="round" fill="none" />
);

export type Render = (
  w: number,
  g?: number,
  front?: boolean,
  tint?: string | null
) => React.ReactNode;

/** 꽃 색 변이 — null=기본, hex=파스텔, 'gold'=황금, 'rainbow'=무지개(꽃잎별 색순환). hilly_rn 과 동일 */
function petalColor(
  tint: string | null | undefined,
  def: string,
  w: number,
  i = 0
): string {
  if (!tint) return wiltC(def, w);
  if (tint === "rainbow") return wiltC(RAINBOW[i % RAINBOW.length], w);
  if (tint === "gold") return wiltC("#D4A017", w);
  return wiltC(tint, w);
}

/** svg_key 별 앞모습(front) 지원 여부 — 없으면 옆모습(default) 만 렌더 */
export const HAS_FRONT_VIEW = new Set<string>([
  "Rabbit",
  "Duck",
  "Cat",
  "Bird",
  "Frog",
  "Deer",
  "WhiteDeer",
  "Unicorn",
  "Turtle",
  "Squirrel",
  // Fox·Owl 은 기본이 이미 정면, Butterfly 는 대칭이라 별도 front 불필요
]);
const seg = (g: number, a: number, b: number) =>
  Math.max(0, Math.min(1, (g - a) / (b - a)));

function Sprout(w: number, g = 1) {
  const lf = wiltC("#5BBF5A", w);
  const st = wiltC("#3E9E48", w);
  const top = 86 - (14 + 14 * g);
  return (
    <g>
      {stem(`M50 86 L50 ${top.toFixed(1)}`, st, 4)}
      <Leaf x={50} y={top} rot={0} c={lf} len={8 + 6 * g} />
      <Leaf x={43} y={86 - 12 - 4 * g} rot={38} c={lf} len={9 + 7 * g} />
      <Leaf x={57} y={86 - 12 - 4 * g} rot={-38} c={lf} len={9 + 7 * g} />
    </g>
  );
}
function Daisy(w: number, g = 1, _front = false, tint: string | null = null) {
  const lf = wiltC("#4FB257", w);
  const st = wiltC("#3E9E48", w);
  const top = 86 - (8 + 26 * g);
  const sH = 86 - top;
  const bloom = seg(g, 0.45, 1);
  const ctr = wiltC(mix("#9CCB5A", "#FFD24A", seg(g, 0.4, 0.85)), w);
  const l1 = seg(g, 0.12, 0.55);
  const l2 = seg(g, 0.38, 0.85);
  return (
    <g>
      {stem(`M50 86 L50 ${top.toFixed(1)}`, st, 3.2 + g)}
      {l1 > 0 && (
        <Leaf x={50 - 5 * l1} y={86 - sH * 0.42} rot={46} c={lf} len={6 + 12 * l1} />
      )}
      {l2 > 0 && (
        <Leaf x={50 + 5 * l2} y={86 - sH * 0.62} rot={-46} c={lf} len={5 + 11 * l2} />
      )}
      {bloom > 0 &&
        [0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
          <ellipse
            key={a}
            cx={50}
            cy={top}
            rx={3.4 * bloom}
            ry={8 * bloom}
            fill={petalColor(tint, "#FFFFFF", w, i)}
            transform={`rotate(${a} 50 ${top.toFixed(1)}) translate(0 ${(
              -8 * bloom
            ).toFixed(1)})`}
          />
        ))}
      <circle cx={50} cy={top} r={2.4 + 3.2 * Math.max(bloom, 0.5 * g)} fill={ctr} />
    </g>
  );
}
function Tulip(w: number, g = 1, _front = false, tint: string | null = null) {
  const lf = wiltC("#3FA84F", w);
  const st = wiltC("#3E9E48", w);
  const top = 86 - (8 + 26 * g);
  const sH = 86 - top;
  const l1 = seg(g, 0.1, 0.55);
  const l2 = seg(g, 0.38, 0.9);
  const open = seg(g, 0.42, 1);
  const petMorph = mix(
    mix("#86C566", "#FF9FB6", seg(g, 0.42, 0.7)),
    "#E0466A",
    seg(g, 0.7, 1)
  );
  // 색 변이면 꽃잎 색 override (황금/무지개/파스텔), 아니면 성장 모프 색
  const petBase = !tint
    ? petMorph
    : tint === "gold"
      ? "#F4CE5A"
      : tint === "rainbow"
        ? "#FF6B6B"
        : tint;
  const pet = wiltC(petBase, w);
  const wd = 3 + 5.5 * open;
  const bh = 13 + 3 * open;
  return (
    <g>
      {stem(`M50 86 L50 ${(top + 2).toFixed(1)}`, st, 3.4 + 0.8 * g)}
      {l1 > 0 && (
        <Leaf x={50 - 6 * l1} y={86 - sH * 0.4} rot={64} c={lf} len={7 + 15 * l1} />
      )}
      {l2 > 0 && (
        <Leaf x={50 + 6 * l2} y={86 - sH * 0.62} rot={-64} c={lf} len={6 + 13 * l2} />
      )}
      <path
        d={`M${(50 - wd).toFixed(1)} ${top.toFixed(1)} Q ${(50 - wd).toFixed(1)} ${(
          top - bh
        ).toFixed(1)} 50 ${(top - bh - 2).toFixed(1)} Q ${(50 + wd).toFixed(1)} ${(
          top - bh
        ).toFixed(1)} ${(50 + wd).toFixed(1)} ${top.toFixed(1)} Q 50 ${(
          top + 3
        ).toFixed(1)} ${(50 - wd).toFixed(1)} ${top.toFixed(1)} Z`}
        fill={pet}
      />
      {open > 0.5 && (
        <path
          d={`M50 ${(top - bh - 2).toFixed(1)} Q ${(50 - wd * 0.55).toFixed(1)} ${(
            top -
            bh * 0.5
          ).toFixed(1)} 50 ${(top + 1).toFixed(1)} Q ${(50 + wd * 0.55).toFixed(
            1
          )} ${(top - bh * 0.5).toFixed(1)} 50 ${(top - bh - 2).toFixed(1)} Z`}
          fill={mix(petBase, "#FFFFFF", 0.28)}
          opacity={0.6 * open}
        />
      )}
    </g>
  );
}
function Sunflower(
  w: number,
  g = 1,
  _front = false,
  tint: string | null = null
) {
  const lf = wiltC("#4FB257", w);
  const st = wiltC("#3E9E48", w);
  // 꽃잎 색(안쪽/바깥 어두운 링). tint 있으면 변이색, 없으면 노랑.
  const petC = (i: number) => petalColor(tint, "#FFC42E", w, i);
  const petDkC = (i: number) =>
    tint ? mix(petC(i), "#7A4F10", 0.28) : wiltC("#F0A21E", w);
  const top = 86 - (10 + 32 * g);
  const sH = 86 - top;
  const bloom = seg(g, 0.5, 1);
  const ctr = wiltC(mix("#9CCB5A", "#6E3E22", seg(g, 0.45, 0.85)), w);
  const l1 = seg(g, 0.12, 0.5);
  const l2 = seg(g, 0.35, 0.8);
  const l3 = seg(g, 0.6, 1);
  return (
    <g>
      {stem(`M50 86 L50 ${top.toFixed(1)}`, st, 3.8 + 1.2 * g)}
      {l1 > 0 && (
        <Leaf x={50 - 7 * l1} y={86 - sH * 0.32} rot={45} c={lf} len={8 + 14 * l1} />
      )}
      {l2 > 0 && (
        <Leaf x={50 + 7 * l2} y={86 - sH * 0.52} rot={-45} c={lf} len={7 + 13 * l2} />
      )}
      {l3 > 0 && (
        <Leaf x={50 - 6 * l3} y={86 - sH * 0.7} rot={50} c={lf} len={6 + 10 * l3} />
      )}
      {bloom > 0 &&
        [18, 54, 90, 126, 162, 198, 234, 270, 306, 342].map((a, i) => (
          <ellipse
            key={`o${a}`}
            cx={50}
            cy={top}
            rx={3.4 * bloom}
            ry={7 * bloom}
            fill={petDkC(i)}
            transform={`rotate(${a} 50 ${top.toFixed(1)}) translate(0 ${(
              -11 * bloom
            ).toFixed(1)})`}
          />
        ))}
      {bloom > 0 &&
        [0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((a, i) => (
          <ellipse
            key={a}
            cx={50}
            cy={top}
            rx={4 * bloom}
            ry={8.5 * bloom}
            fill={petC(i)}
            transform={`rotate(${a} 50 ${top.toFixed(1)}) translate(0 ${(
              -10 * bloom
            ).toFixed(1)})`}
          />
        ))}
      <circle cx={50} cy={top} r={3.5 + 4 * Math.max(bloom, 0.5 * g)} fill={ctr} />
    </g>
  );
}
function Bush(w: number, g = 1) {
  const lf = wiltC("#56B85C", w);
  const lfD = mix(wiltC("#56B85C", w), "#3FA050", 0.35);
  const be = wiltC("#E2484C", w);
  const s = 0.5 + 0.5 * g;
  return (
    <g>
      <circle cx={50 - 8 * s} cy={86 - 14 * s} r={12 * s} fill={lf} />
      <circle cx={50 + 8 * s} cy={86 - 14 * s} r={12 * s} fill={lf} />
      <circle cx={50} cy={86 - 24 * s} r={13 * s} fill={lfD} />
      {g > 0.5 && (
        <>
          <circle cx={44} cy={86 - 20 * s} r={2.4} fill={be} />
          <circle cx={56} cy={86 - 16 * s} r={2.4} fill={be} />
          <circle cx={50} cy={86 - 12 * s} r={2.4} fill={be} />
        </>
      )}
    </g>
  );
}
function Mushroom(w: number, g = 1) {
  const cap = wiltC("#E14B4B", w);
  const capDk = mix(wiltC("#E14B4B", w), "#A82E2E", 0.4);
  const st = wiltC("#F3EAD8", w);
  const s = 0.45 + 0.55 * g;
  const stH = 21 * s;
  const capW = 18 * s;
  const capTop = 86 - stH;
  return (
    <g>
      <rect x={50 - 5 * s} y={capTop} width={10 * s} height={stH} rx={4} fill={st} />
      <path
        d={`M${(50 - capW).toFixed(1)} ${capTop.toFixed(1)} Q ${(50 - capW).toFixed(
          1
        )} ${(capTop - 18 * s).toFixed(1)} 50 ${(capTop - 18 * s).toFixed(1)} Q ${(
          50 + capW
        ).toFixed(1)} ${(capTop - 18 * s).toFixed(1)} ${(50 + capW).toFixed(
          1
        )} ${capTop.toFixed(1)} Z`}
        fill={cap}
      />
      <path
        d={`M${(50 - capW).toFixed(1)} ${capTop.toFixed(1)} Q 50 ${(
          capTop +
          3 * s
        ).toFixed(1)} ${(50 + capW).toFixed(1)} ${capTop.toFixed(1)}`}
        stroke={capDk}
        strokeWidth={1.5}
        fill="none"
      />
      {g > 0.4 && (
        <>
          <circle cx={45} cy={capTop - 8 * s} r={2.2} fill="#fff" opacity={0.9} />
          <circle cx={56} cy={capTop - 6 * s} r={1.8} fill="#fff" opacity={0.9} />
          <circle cx={50} cy={capTop - 12 * s} r={1.6} fill="#fff" opacity={0.9} />
        </>
      )}
    </g>
  );
}
function Pine(w: number) {
  const lf = wiltC("#2E8B57", w);
  const tr = wiltC("#8A5A3A", w);
  return (
    <g>
      <rect x={47} y={70} width={6} height={17} rx={2} fill={tr} />
      <path d="M50 36 L62 56 L38 56 Z" fill={lf} />
      <path d="M50 48 L66 70 L34 70 Z" fill={mix(lf, "#1F6E43", 0.15)} />
    </g>
  );
}
function RoundTree(w: number, g = 1) {
  const lf = wiltC("#4FB36A", w);
  const lfD = mix(wiltC("#4FB36A", w), "#2F8F4E", 0.3);
  const tr = wiltC("#8A5A3A", w);
  const trunkH = 12 + 20 * g;
  const top = 86 - trunkH;
  const cr = 9 + 21 * g;
  const tw = 5 * (0.6 + 0.4 * g);
  return (
    <g>
      <rect x={50 - tw} y={top} width={2 * tw} height={trunkH} rx={3} fill={tr} />
      <ellipse cx={50} cy={top - cr * 0.55} rx={cr} ry={cr * 0.95} fill={lf} />
      <ellipse
        cx={50}
        cy={top - cr * 0.28}
        rx={cr * 0.92}
        ry={cr * 0.5}
        fill={lfD}
        opacity={0.5}
      />
      {g > 0.5 && (
        <ellipse
          cx={50 - cr * 0.35}
          cy={top - cr * 0.85}
          rx={cr * 0.4}
          ry={cr * 0.28}
          fill="#fff"
          opacity={0.14}
        />
      )}
    </g>
  );
}
function TallTree(w: number) {
  const lf = wiltC("#54B86E", w);
  const tr = wiltC("#8A5A3A", w);
  return (
    <g>
      <rect x={47} y={60} width={6} height={28} rx={2} fill={tr} />
      <path
        d="M50 12 C 64 30 65 52 57 70 C 53 76 47 76 43 70 C 35 52 36 30 50 12 Z"
        fill={lf}
      />
      <ellipse cx={46} cy={36} rx={5} ry={13} fill="#fff" opacity={0.1} />
    </g>
  );
}
function conifer(w: number, g: number, c1: string, c2: string, snow: boolean) {
  const tr = wiltC("#7A5A42", w);
  const trunkH = 8 + 12 * g;
  const base = 86 - trunkH;
  const fh = 28 + 40 * g;
  const wMax = 11 + 16 * g;
  const tri = (ay: number, by: number, ww: number) =>
    `M50 ${ay.toFixed(1)} L${(50 + ww).toFixed(1)} ${by.toFixed(1)} L${(50 - ww).toFixed(
      1
    )} ${by.toFixed(1)} Z`;
  return (
    <g>
      <rect x={46} y={base} width={8} height={trunkH} rx={2} fill={tr} />
      <path d={tri(base - fh, base - fh * 0.4, wMax * 0.52)} fill={c1} />
      <path d={tri(base - fh * 0.66, base - fh * 0.16, wMax * 0.76)} fill={c2} />
      <path d={tri(base - fh * 0.34, base, wMax)} fill={c1} />
      {snow && g > 0.5 && (
        <>
          <path
            d={`M50 ${(base - fh).toFixed(1)} L${(50 + wMax * 0.26).toFixed(1)} ${(
              base -
              fh * 0.72
            ).toFixed(1)} Q 50 ${(base - fh * 0.8).toFixed(1)} ${(
              50 -
              wMax * 0.26
            ).toFixed(1)} ${(base - fh * 0.72).toFixed(1)} Z`}
            fill="#FFFFFF"
          />
          {g > 0.7 && (
            <path
              d={`M50 ${(base - fh * 0.34).toFixed(1)} L${(50 + wMax * 0.5).toFixed(
                1
              )} ${(base - fh * 0.1).toFixed(1)} Q 50 ${(base - fh * 0.18).toFixed(
                1
              )} ${(50 - wMax * 0.5).toFixed(1)} ${(base - fh * 0.1).toFixed(1)} Z`}
              fill="#FFFFFF"
              opacity={0.9}
            />
          )}
        </>
      )}
    </g>
  );
}
function BigPine(w: number, g = 1) {
  return conifer(
    w,
    g,
    wiltC("#2F8F58", w),
    mix(wiltC("#2F8F58", w), "#1F6E43", 0.25),
    false
  );
}
function HallasanTree(w: number, g = 1) {
  return conifer(
    w,
    g,
    wiltC("#6FA193", w),
    mix(wiltC("#6FA193", w), "#48766A", 0.35),
    true
  );
}
function Cactus(w: number) {
  const c = wiltC("#3FAE6B", w);
  const fl = wiltC("#FF7FA3", w);
  return (
    <g>
      <rect x={43} y={50} width={14} height={37} rx={7} fill={c} />
      <path
        d="M43 68 q-10 0 -10 -10 l0 -4"
        stroke={c}
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M57 64 q10 0 10 -10 l0 -3"
        stroke={c}
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={50} cy={50} r={3.5} fill={fl} />
    </g>
  );
}
function Rabbit(w: number, g = 1, front = false) {
  const c = wiltC("#ECE8E1", w);
  const s = 0.62 + 0.38 * g;
  if (front) {
    return (
      <g transform={`translate(50 87) scale(${s.toFixed(3)}) translate(-50 -87)`}>
        <ellipse cx={45} cy={57} rx={2.8} ry={9.5} fill={c} />
        <ellipse cx={55} cy={57} rx={2.8} ry={9.5} fill={c} />
        <ellipse cx={45} cy={58} rx={1.2} ry={5.2} fill="#F4B8C4" />
        <ellipse cx={55} cy={58} rx={1.2} ry={5.2} fill="#F4B8C4" />
        <ellipse cx={50} cy={80} rx={10} ry={8} fill={c} />
        <circle cx={50} cy={69} r={8} fill={c} />
        <circle cx={46.5} cy={68} r={1.1} fill="#3a2a20" />
        <circle cx={53.5} cy={68} r={1.1} fill="#3a2a20" />
        <path d="M50 70.3 l-1.2 1.3 h2.4 Z" fill="#F4B8C4" />
        <ellipse cx={45} cy={87} rx={3} ry={1.7} fill={c} />
        <ellipse cx={55} cy={87} rx={3} ry={1.7} fill={c} />
      </g>
    );
  }
  return (
    <g transform={`translate(50 87) scale(${s.toFixed(3)}) translate(-50 -87)`}>
      <ellipse cx={50} cy={78} rx={13} ry={9} fill={c} />
      <circle cx={59} cy={68} r={7.5} fill={c} />
      <ellipse cx={56} cy={55} rx={2.6} ry={8} fill={c} />
      <ellipse cx={61} cy={55} rx={2.6} ry={8} fill={c} />
      <ellipse cx={56} cy={56} rx={1.1} ry={4.5} fill="#F4B8C4" />
      <ellipse cx={61} cy={56} rx={1.1} ry={4.5} fill="#F4B8C4" />
      <circle cx={61} cy={67} r={1.1} fill="#3a2a20" />
      <circle cx={38} cy={76} r={3.4} fill={c} />
    </g>
  );
}
function Duck(w: number, g = 1, front = false) {
  const y = wiltC("#FBD24E", w);
  const s = 0.62 + 0.38 * g;
  if (front) {
    const wing = mix(wiltC("#FBD24E", w), "#E0B83A", 0.4);
    return (
      <g transform={`translate(50 88) scale(${s.toFixed(3)}) translate(-50 -88)`}>
        <ellipse cx={50} cy={80} rx={11} ry={8} fill={y} />
        <path d="M40 78 q-3 3 0 6" stroke={wing} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <path d="M60 78 q3 3 0 6" stroke={wing} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <circle cx={50} cy={70} r={6.5} fill={y} />
        <ellipse cx={50} cy={73.5} rx={3.2} ry={2} fill="#E8893A" />
        <circle cx={47.4} cy={69} r={1} fill="#3a2a20" />
        <circle cx={52.6} cy={69} r={1} fill="#3a2a20" />
        <path d="M47 87.5 l0 1.5 M53 87.5 l0 1.5" stroke="#E8893A" strokeWidth={2} strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g transform={`translate(50 88) scale(${s.toFixed(3)}) translate(-50 -88)`}>
      <ellipse cx={48} cy={80} rx={13} ry={8} fill={y} />
      <circle cx={60} cy={71} r={6.5} fill={y} />
      <path d="M66 71 l8 2 l-8 3 Z" fill="#E8893A" />
      <circle cx={61} cy={69} r={1.1} fill="#3a2a20" />
      <path
        d="M40 81 q-6 -1 -10 2"
        stroke={y}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}
function deerFront(w: number, g: number, c: string, dk: string, spot: string) {
  const legH = 9 + 6 * g;
  const top = 86 - legH;
  const bCy = top - 6;
  const antler = seg(g, 0.5, 1);
  return (
    <g>
      <rect x={45} y={top} width={3} height={legH} rx={1.5} fill={dk} />
      <rect x={52} y={top} width={3} height={legH} rx={1.5} fill={dk} />
      <ellipse cx={50} cy={bCy} rx={6.2} ry={6.3} fill={c} />
      <circle cx={47} cy={bCy} r={1.3} fill={spot} />
      <circle cx={53} cy={bCy + 2.5} r={1.3} fill={spot} />
      <rect x={48} y={bCy - 11} width={4} height={7} rx={2} fill={c} />
      <ellipse cx={50} cy={bCy - 14} rx={5} ry={4.6} fill={c} />
      <ellipse cx={50} cy={bCy - 11.5} rx={2.6} ry={2} fill={mix(c, "#FFFFFF", 0.18)} />
      <ellipse cx={45.6} cy={bCy - 15.5} rx={2} ry={3.4} fill={c}
        transform={`rotate(-22 45.6 ${(bCy - 15.5).toFixed(1)})`} />
      <ellipse cx={54.4} cy={bCy - 15.5} rx={2} ry={3.4} fill={c}
        transform={`rotate(22 54.4 ${(bCy - 15.5).toFixed(1)})`} />
      <circle cx={47.8} cy={bCy - 14} r={1} fill="#3a2a20" />
      <circle cx={52.2} cy={bCy - 14} r={1} fill="#3a2a20" />
      <circle cx={50} cy={bCy - 10.8} r={0.9} fill={dk} />
      {antler > 0 && (
        <>
          <path
            d={`M47.5 ${(bCy - 17).toFixed(1)} l-1 ${(-7 * antler).toFixed(1)} m0.4 ${(3 * antler).toFixed(1)} l${(-3 * antler).toFixed(1)} ${(-2 * antler).toFixed(1)}`}
            stroke={dk} strokeWidth={1.5} fill="none" strokeLinecap="round"
          />
          <path
            d={`M52.5 ${(bCy - 17).toFixed(1)} l1 ${(-7 * antler).toFixed(1)} m-0.4 ${(3 * antler).toFixed(1)} l${(3 * antler).toFixed(1)} ${(-2 * antler).toFixed(1)}`}
            stroke={dk} strokeWidth={1.5} fill="none" strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
}

function DeerLike(w: number, g: number, isWhite: boolean, front = false) {
  const base = isWhite ? "#EDEAE3" : "#CC8E5E";
  const dkMix = isWhite ? "#A9A39A" : "#7A4F30";
  const spotBase = isWhite ? "#FCFBF8" : "#F3E4C8";
  const c = wiltC(base, w);
  const dk = mix(wiltC(base, w), dkMix, isWhite ? 0.5 : 0.45);
  const spot = wiltC(spotBase, w);
  if (front) return deerFront(w, g, c, dk, spot);
  const legH = 9 + 6 * g;
  const top = 86 - legH;
  const bRx = 11 + 5 * g;
  const bRy = 6.5 + 2.5 * g;
  const bCy = top - bRy + 3;
  const hr = 8 - 2 * g;
  const hx = 60 + 6 * g;
  const hy = bCy - (6 + 6 * g);
  const antler = seg(g, 0.5, 1);
  const tailC = mix(spot, c, seg(g, 0.4, 1));
  return (
    <g>
      <rect x={43} y={top} width={3.2} height={legH} rx={1.5} fill={dk} />
      <rect x={48.5} y={top} width={3.2} height={legH} rx={1.5} fill={dk} />
      <rect x={54} y={top} width={3.2} height={legH} rx={1.5} fill={dk} />
      <rect x={59.5} y={top} width={3.2} height={legH} rx={1.5} fill={dk} />
      <circle cx={51 - bRx} cy={bCy - 1} r={2.2 + 0.6 * g} fill={tailC} />
      <ellipse cx={51} cy={bCy} rx={bRx} ry={bRy} fill={c} />
      <circle cx={41} cy={bCy - 1} r={1.4} fill={spot} />
      <circle cx={47} cy={bCy - 2.5} r={1.4} fill={spot} />
      {g > 0.4 && <circle cx={44} cy={bCy + 2.5} r={1.3} fill={spot} />}
      {g > 0.65 && <circle cx={52} cy={bCy - 1.5} r={1.2} fill={spot} />}
      {g > 0.85 && <circle cx={50} cy={bCy + 2.5} r={1.2} fill={spot} />}
      <path
        d={`M${(hx - 6).toFixed(1)} ${bCy.toFixed(1)} Q ${(hx - 2).toFixed(1)} ${(
          hy + hr
        ).toFixed(1)} ${hx.toFixed(1)} ${(hy + hr * 0.6).toFixed(1)}`}
        stroke={c}
        strokeWidth={6 + 2 * g}
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={hx} cy={hy} rx={hr} ry={hr * 0.85} fill={c} />
      <ellipse
        cx={hx + hr * 0.7}
        cy={hy + 2}
        rx={3}
        ry={2.4}
        fill={mix(c, "#FFFFFF", 0.18)}
      />
      <circle cx={hx + hr} cy={hy + 2} r={1} fill={dk} />
      <ellipse
        cx={hx - 3.5}
        cy={hy - hr * 0.6}
        rx={2.2}
        ry={4}
        fill={c}
        transform={`rotate(-28 ${(hx - 3.5).toFixed(1)} ${(hy - hr * 0.6).toFixed(1)})`}
      />
      <ellipse
        cx={hx + 3.5}
        cy={hy - hr * 0.6}
        rx={2.2}
        ry={4}
        fill={c}
        transform={`rotate(22 ${(hx + 3.5).toFixed(1)} ${(hy - hr * 0.6).toFixed(1)})`}
      />
      <circle cx={hx + 1} cy={hy} r={1.1} fill="#3a2a20" />
      {antler > 0 && (
        <>
          <path
            d={`M${(hx - 2).toFixed(1)} ${(hy - hr * 0.8).toFixed(1)} l-2 ${(
              -8 * antler
            ).toFixed(1)} m1 ${(4 * antler).toFixed(1)} l${(-3.5 * antler).toFixed(
              1
            )} ${(-2.5 * antler).toFixed(1)}`}
            stroke={dk}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M${(hx + 2).toFixed(1)} ${(hy - hr * 0.8).toFixed(1)} l2 ${(
              -8 * antler
            ).toFixed(1)} m-1 ${(4 * antler).toFixed(1)} l${(3.5 * antler).toFixed(
              1
            )} ${(-2.5 * antler).toFixed(1)}`}
            stroke={dk}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
}
function Deer(w: number, g = 1, front = false) {
  return DeerLike(w, g, false, front);
}
function WhiteDeer(w: number, g = 1, front = false) {
  return DeerLike(w, g, true, front);
}

// 유니콘 옆모습 — 흰 몸 + 황금 뿔 + 무지개 갈기/꼬리 (hilly_rn 이식)
function unicornSide(w: number, g: number, c: string, dk: string) {
  const legH = 9 + 6 * g;
  const top = 86 - legH;
  const bRx = 11.5 + 5 * g;
  const bRy = 5 + 1.8 * g;
  const bCy = top - bRy + 3;
  const hr = 6.5 - 1.2 * g;
  const hx = 61 + 6 * g;
  const hy = bCy - (7 + 6 * g);
  const horn = seg(g, 0.35, 1);
  const gold = wiltC("#F2C94C", w);
  const goldDk = wiltC("#C9971A", w);
  const hornTipY = hy - hr * 0.6 - (6 + 8 * horn);
  return (
    <g>
      {[-0.58, -0.24, 0.16, 0.46].map((f, i) => (
        <rect key={`leg-${i}`} x={51 + bRx * f - 1.6} y={top} width={3.2} height={legH} rx={1.5} fill={dk} />
      ))}
      {RAINBOW.slice(0, 5).map((rc, i) => (
        <path key={`tail-${i}`}
          d={`M${(51 - bRx + 0.5).toFixed(1)} ${(bCy - 3 + i * 1.5).toFixed(1)} q ${(-6 - 2 * g).toFixed(1)} ${(3 + i).toFixed(1)} -4 ${(9 + 2 * g).toFixed(1)}`}
          stroke={wiltC(rc, w)} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      ))}
      <ellipse cx={51} cy={bCy} rx={bRx} ry={bRy} fill={c} />
      <path d={`M${(hx - 7).toFixed(1)} ${bCy.toFixed(1)} Q ${(hx - 2).toFixed(1)} ${(hy + hr).toFixed(1)} ${hx.toFixed(1)} ${(hy + hr * 0.7).toFixed(1)}`}
        stroke={c} strokeWidth={6.5 + 2 * g} fill="none" strokeLinecap="round" />
      {RAINBOW.slice(0, 6).map((rc, i) => {
        const t = i / 5;
        const mx = (hx - 2) + ((hx - 9) - (hx - 2)) * t;
        const my = (hy - hr * 0.2) + ((bCy - bRy * 0.5) - (hy - hr * 0.2)) * t;
        return (
          <path key={`mane-${i}`} d={`M${mx.toFixed(1)} ${my.toFixed(1)} q -2 2 -3.5 ${(3 + 2 * g).toFixed(1)}`}
            stroke={wiltC(rc, w)} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        );
      })}
      <ellipse cx={hx} cy={hy} rx={hr * 1.05} ry={hr * 0.8} fill={c} transform={`rotate(14 ${hx} ${hy})`} />
      <ellipse cx={hx + hr * 0.9} cy={hy + hr * 0.55} rx={hr * 0.55} ry={hr * 0.42} fill={c} />
      <circle cx={hx + hr * 1.25} cy={hy + hr * 0.6} r={0.8} fill={dk} />
      <path d={`M${(hx - 2).toFixed(1)} ${(hy - hr * 0.7).toFixed(1)} l-1.5 -4 l3.2 1.2 Z`} fill={c} />
      <circle cx={hx + hr * 0.25} cy={hy} r={1} fill="#3a2a20" />
      <path d={`M${(hx - 0.5).toFixed(1)} ${(hy - hr * 0.55).toFixed(1)} L${(hx + 2.6).toFixed(1)} ${(hy - hr * 0.55).toFixed(1)} L${(hx + 1.8).toFixed(1)} ${hornTipY.toFixed(1)} Z`} fill={gold} />
      <path d={`M${(hx + 0.2).toFixed(1)} ${(hy - hr * 0.55 - 2).toFixed(1)} L${(hx + 1.6).toFixed(1)} ${(hy - hr * 0.55 - 2.4).toFixed(1)} M${(hx + 0.4).toFixed(1)} ${(hy - hr * 0.55 - 5).toFixed(1)} L${(hx + 1.5).toFixed(1)} ${(hy - hr * 0.55 - 5.4).toFixed(1)}`}
        stroke={goldDk} strokeWidth={0.8} fill="none" strokeLinecap="round" />
    </g>
  );
}

// 유니콘 정면 포즈 (hilly_rn 이식)
function unicornFront(w: number, g: number, c: string, dk: string) {
  const legH = 9 + 6 * g;
  const top = 86 - legH;
  const bCy = top - 6;
  const horn = seg(g, 0.35, 1);
  const gold = wiltC("#F2C94C", w);
  const goldDk = wiltC("#C9971A", w);
  const hCy = bCy - 14;
  const hornTipY = hCy - 5 - (6 + 8 * horn);
  return (
    <g>
      <rect x={45} y={top} width={3} height={legH} rx={1.5} fill={dk} />
      <rect x={52} y={top} width={3} height={legH} rx={1.5} fill={dk} />
      <ellipse cx={50} cy={bCy} rx={6.2} ry={6.3} fill={c} />
      <rect x={48} y={bCy - 11} width={4} height={7} rx={2} fill={c} />
      {RAINBOW.slice(0, 5).map((rc, i) => (
        <path key={`mane-${i}`} d={`M${(44.5 + i * 0.4).toFixed(1)} ${(hCy - 3).toFixed(1)} q -2 4 -1.5 ${(8 + 2 * g).toFixed(1)}`}
          stroke={wiltC(rc, w)} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      ))}
      <ellipse cx={50} cy={hCy} rx={5} ry={4.6} fill={c} />
      <ellipse cx={50} cy={hCy + 2.5} rx={2.6} ry={2} fill={mix(c, "#FFFFFF", 0.18)} />
      <ellipse cx={45.6} cy={hCy - 1.5} rx={2} ry={3.4} fill={c} transform={`rotate(-22 45.6 ${(hCy - 1.5).toFixed(1)})`} />
      <ellipse cx={54.4} cy={hCy - 1.5} rx={2} ry={3.4} fill={c} transform={`rotate(22 54.4 ${(hCy - 1.5).toFixed(1)})`} />
      <circle cx={47.8} cy={hCy} r={1} fill="#3a2a20" />
      <circle cx={52.2} cy={hCy} r={1} fill="#3a2a20" />
      <circle cx={50} cy={hCy + 3.2} r={0.9} fill={dk} />
      <path d={`M48.6 ${(hCy - 4).toFixed(1)} L51.4 ${(hCy - 4).toFixed(1)} L50 ${hornTipY.toFixed(1)} Z`} fill={gold} />
      <path d={`M49.2 ${(hCy - 6).toFixed(1)} L50.8 ${(hCy - 6).toFixed(1)} M49.4 ${(hCy - 9).toFixed(1)} L50.6 ${(hCy - 9).toFixed(1)}`}
        stroke={goldDk} strokeWidth={0.8} fill="none" strokeLinecap="round" />
    </g>
  );
}

// 유니콘 (흰 몸 + 무지개 갈기) — 히든 종
function Unicorn(w: number, g = 1, front = false) {
  const c = wiltC("#F0EDF7", w);
  const dk = mix(wiltC("#F0EDF7", w), "#9A93AC", 0.5);
  return front ? unicornFront(w, g, c, dk) : unicornSide(w, g, c, dk);
}
function Cat(w: number, g = 1, front = false) {
  const c = wiltC("#E8A15D", w);
  const dk = mix(wiltC("#E8A15D", w), "#9C5F2E", 0.5);
  const lt = mix(wiltC("#E8A15D", w), "#FFF3E2", 0.62);
  const pink = wiltC("#E79AA6", w);
  const s = 0.62 + 0.38 * g;
  if (front) {
    // 정면 — 화자를 바라보는 앉은 고양이 (hilly_rn 과 동일)
    return (
      <g transform={`translate(50 87) scale(${s.toFixed(3)}) translate(-50 -87)`}>
        <path d="M58 82 q13 1 12 -12 q-0.5 -5 -4 -7" stroke={c} strokeWidth={4.8} fill="none" strokeLinecap="round" />
        <ellipse cx={50} cy={79} rx={11} ry={10} fill={c} />
        <ellipse cx={50} cy={81} rx={5.5} ry={6.5} fill={lt} />
        <ellipse cx={45.5} cy={86.5} rx={3.6} ry={2.2} fill={c} />
        <ellipse cx={54.5} cy={86.5} rx={3.6} ry={2.2} fill={c} />
        <circle cx={50} cy={60} r={11} fill={c} />
        <path d="M41 53 L38 41 L50 51 Z" fill={c} />
        <path d="M59 53 L62 41 L50 51 Z" fill={c} />
        <path d="M42.5 52 L40.5 44.5 L48 50.5 Z" fill={pink} />
        <path d="M57.5 52 L59.5 44.5 L52 50.5 Z" fill={pink} />
        <path d="M47 56 l1 -5 M50 55.5 l0 -5 M53 56 l-1 -5" stroke={dk} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        <ellipse cx={45.5} cy={60} rx={2.4} ry={2.9} fill="#6FB56A" />
        <ellipse cx={54.5} cy={60} rx={2.4} ry={2.9} fill="#6FB56A" />
        <ellipse cx={45.5} cy={60.3} rx={1} ry={2.4} fill="#2b2018" />
        <ellipse cx={54.5} cy={60.3} rx={1} ry={2.4} fill="#2b2018" />
        <circle cx={44.7} cy={58.9} r={0.7} fill="#fff" />
        <circle cx={53.7} cy={58.9} r={0.7} fill="#fff" />
        <path d="M50 63.5 l-1.6 1.8 h3.2 Z" fill={pink} />
        <path d="M50 65.3 q-1.8 1.8 -3.4 0.6 M50 65.3 q1.8 1.8 3.4 0.6" stroke={dk} strokeWidth={1.1} fill="none" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g
      transform={`translate(50 87) scale(${s.toFixed(3)}) translate(-50 -87)`}
    >
      {/* 꼬리 */}
      <path
        d="M40 84 Q 33 87 42 86 Q 52 86 58 82"
        stroke={c}
        strokeWidth={3.6}
        fill="none"
        strokeLinecap="round"
      />
      {/* 뒷다리 */}
      <ellipse cx={42} cy={80} rx={7} ry={7.5} fill={c} />
      {/* 몸통 */}
      <ellipse cx={49} cy={73} rx={8.5} ry={12.5} fill={c} />
      {/* 앞다리 + 발 */}
      <rect x={51} y={76} width={3.8} height={11} rx={1.9} fill={c} />
      <ellipse cx={52.9} cy={87} rx={3.2} ry={1.7} fill={lt} />
      {/* 가슴 크림 */}
      <ellipse cx={52} cy={75} rx={3.8} ry={7.5} fill={lt} />
      {/* 등 태비 */}
      <path
        d="M42 67 q3 -1.5 5.5 0.5 M41.7 70.5 q3 -1.5 5.5 0.5"
        stroke={dk}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
        opacity={0.75}
      />
      {/* 머리 */}
      <circle cx={54} cy={60} r={8.5} fill={c} />
      {/* 주둥이 */}
      <ellipse cx={60} cy={62.5} rx={3.5} ry={3} fill={lt} />
      {/* 귀 */}
      <path d="M48 55 L46 45 L54 53 Z" fill={c} />
      <path d="M55 54 L58 45 L61 55 Z" fill={c} />
      <path d="M49 54 L47.5 48 L52.5 52.6 Z" fill={pink} />
      <path d="M56 54 L57.8 48.5 L59.6 54 Z" fill={pink} />
      {/* 이마 태비 */}
      <path
        d="M51.5 55.5 l0.5 -3.4 M54 55.1 l0 -3.4 M56.5 55.5 l-0.5 -3.4"
        stroke={dk}
        strokeWidth={1.2}
        fill="none"
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* 눈 */}
      <ellipse cx={57} cy={60} rx={2} ry={2.5} fill="#6FB56A" />
      <ellipse cx={57.2} cy={60} rx={0.8} ry={2.1} fill="#2b2018" />
      <circle cx={56.5} cy={59} r={0.6} fill="#fff" />
      {/* 코 + 입 */}
      <path d="M63.5 61.2 l2 1.3 l-2 1.3 Z" fill={pink} />
      <path
        d="M57.8 64.4 q1.5 1.2 3 0.2"
        stroke={dk}
        strokeWidth={1}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

function Bird(w: number, g = 1, front = false) {
  const c = wiltC("#6DA9E0", w);
  const dk = mix(wiltC("#6DA9E0", w), "#3E7BB8", 0.4);
  const belly = wiltC("#F5E9C8", w);
  const s = 0.62 + 0.38 * g;
  if (front) {
    // 정면 — 화자를 바라보는 새 (hilly_rn 과 동일)
    return (
      <g transform={`translate(50 86) scale(${s.toFixed(3)}) translate(-50 -86)`}>
        <ellipse cx={50} cy={76} rx={10} ry={11} fill={c} />
        <path d="M41 73 q-3 4 0 9" stroke={dk} strokeWidth={3} fill="none" strokeLinecap="round" />
        <path d="M59 73 q3 4 0 9" stroke={dk} strokeWidth={3} fill="none" strokeLinecap="round" />
        <ellipse cx={50} cy={79} rx={5.5} ry={6} fill={belly} />
        <circle cx={50} cy={67} r={6.5} fill={c} />
        <path d="M50 70 l-1.6 2.4 h3.2 Z" fill="#E8A64A" />
        <circle cx={47.4} cy={66} r={1.1} fill="#2a2018" />
        <circle cx={52.6} cy={66} r={1.1} fill="#2a2018" />
        <path d="M47 86 l0 2.5 M53 86 l0 2.5" stroke="#E8A64A" strokeWidth={1.6} strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g
      transform={`translate(50 86) scale(${s.toFixed(3)}) translate(-50 -86)`}
    >
      {/* 꼬리 */}
      <path d="M41 74 l-9 3 l8 3 Z" fill={dk} />
      {/* 몸통 */}
      <ellipse cx={52} cy={75} rx={11} ry={10} fill={c} />
      {/* 배 */}
      <ellipse cx={54} cy={78} rx={6} ry={6} fill={belly} />
      {/* 날개 */}
      <path d="M50 72 q7 2 9 8 q-6 1 -10 -3 Z" fill={dk} />
      {/* 머리 */}
      <circle cx={58} cy={68} r={6.5} fill={c} />
      {/* 부리 */}
      <path d="M64 68 l6 2 l-6 2 Z" fill="#E8A64A" />
      {/* 눈 */}
      <circle cx={60} cy={67} r={1.1} fill="#2a2018" />
      {/* 다리 */}
      <path
        d="M50 85 l0 3 M55 85 l0 3"
        stroke="#E8A64A"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </g>
  );
}

function Frog(w: number, g = 1, front = false) {
  const c = wiltC("#5FB86A", w);
  const dk = mix(wiltC("#5FB86A", w), "#3C8A4A", 0.4);
  const belly = wiltC("#DCEBB0", w);
  const s = 0.6 + 0.4 * g;
  if (front) {
    // 정면 — 대칭 (hilly_rn 과 동일)
    return (
      <g transform={`translate(50 87) scale(${s.toFixed(3)}) translate(-50 -87)`}>
        <ellipse cx={50} cy={78} rx={14} ry={10} fill={c} />
        <ellipse cx={50} cy={82} rx={9} ry={5} fill={belly} />
        <path d="M38 82 q-4 2 -2 6 M62 82 q4 2 2 6" stroke={c} strokeWidth={4} fill="none" strokeLinecap="round" />
        <ellipse cx={44} cy={86} rx={3} ry={1.6} fill={dk} />
        <ellipse cx={56} cy={86} rx={3} ry={1.6} fill={dk} />
        <circle cx={43} cy={68} r={4.5} fill={c} />
        <circle cx={57} cy={68} r={4.5} fill={c} />
        <circle cx={43} cy={68} r={2.2} fill="#fff" />
        <circle cx={57} cy={68} r={2.2} fill="#fff" />
        <circle cx={43} cy={68.5} r={1.1} fill="#2a2018" />
        <circle cx={57} cy={68.5} r={1.1} fill="#2a2018" />
        <path d="M42 76 q8 5 16 0" stroke={dk} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g
      transform={`translate(50 87) scale(${s.toFixed(3)}) translate(-50 -87)`}
    >
      {/* 뒷다리 */}
      <path
        d="M40 78 q-9 1 -8 9 q0 2 3 2"
        stroke={c}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={35} cy={87} rx={3} ry={1.5} fill={dk} />
      {/* 몸통 + 배 */}
      <ellipse cx={49} cy={80} rx={14} ry={8.5} fill={c} />
      <ellipse cx={53} cy={83} rx={8} ry={4} fill={belly} />
      {/* 앞다리 + 발 */}
      <path
        d="M58 82 q3 2 4 5"
        stroke={c}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={62} cy={87} rx={3.2} ry={1.6} fill={dk} />
      {/* 눈 */}
      <circle cx={56} cy={70} r={4.8} fill={c} />
      <circle cx={56.5} cy={70} r={2.4} fill="#fff" />
      <circle cx={57.3} cy={70.4} r={1.2} fill="#2a2018" />
      {/* 콧구멍 + 입 */}
      <circle cx={62} cy={76} r={0.7} fill={dk} />
      <path
        d="M50 78 q7 3.5 12 -0.5"
        stroke={dk}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

/* ── 신규 동물 (2026-07) ── */

// 정면 앉은 여우 — 성장 모핑: 아기 = 큰 머리·짧은 귀·꼬리 미발달 / 성체 = 균형 + 풍성한 흰끝 꼬리
function Fox(w: number, g = 1) {
  const c = wiltC("#E37A3B", w);
  const dk = mix(wiltC("#E37A3B", w), "#A24B18", 0.5);
  const belly = wiltC("#F5E4CE", w);
  const s = 0.7 + 0.3 * g;
  const hr = 9.8 - 1.3 * g; // 아기일수록 머리 비율 큼
  const earL = 4 + 5 * g; // 귀 길이
  const tail = seg(g, 0.1, 1); // 꼬리 발달도
  const bRx = 8.5 + 2.5 * g;
  const bRy = 7 + 2 * g;
  const legH = 5 + 2 * g;
  const bCy = 87 - bRy;
  const headCy = bCy - bRy - hr + 3.5;
  return (
    <g transform={`translate(50 87) scale(${s.toFixed(3)}) translate(-50 -87)`}>
      {/* 꼬리 — 자랄수록 굵고 길게, 흰 끝 */}
      {tail > 0.05 && (
        <>
          <path
            d={`M${(50 - bRx + 1).toFixed(1)} ${(bCy + 2).toFixed(1)} Q ${(50 - bRx - 6 * tail).toFixed(1)} ${(bCy + 4).toFixed(1)} ${(50 - bRx - 6 * tail).toFixed(1)} ${(bCy - 4 - 4 * tail).toFixed(1)}`}
            stroke={c}
            strokeWidth={3 + 2.5 * tail}
            fill="none"
            strokeLinecap="round"
          />
          <circle
            cx={50 - bRx - 6 * tail}
            cy={bCy - 4 - 4 * tail}
            r={1.6 + 1.2 * tail}
            fill="#fff"
          />
        </>
      )}
      {/* 몸통 + 배 */}
      <ellipse cx={50} cy={bCy} rx={bRx} ry={bRy} fill={c} />
      <ellipse
        cx={50}
        cy={bCy + bRy * 0.5}
        rx={bRx * 0.62}
        ry={bRy * 0.42}
        fill={belly}
      />
      {/* 앞다리 (좌우 대칭) */}
      <rect x={44.3} y={87 - legH} width={3.2} height={legH} rx={1.5} fill={c} />
      <rect x={52.5} y={87 - legH} width={3.2} height={legH} rx={1.5} fill={c} />
      {/* 머리 */}
      <circle cx={50} cy={headCy} r={hr} fill={c} />
      {/* 얼굴 흰 V */}
      <path
        d={`M${(50 - hr * 0.8).toFixed(1)} ${(headCy + 1).toFixed(1)} L50 ${(headCy + hr).toFixed(1)} L${(50 + hr * 0.8).toFixed(1)} ${(headCy + 1).toFixed(1)} L${(50 + hr * 0.45).toFixed(1)} ${(headCy - 3).toFixed(1)} L50 ${(headCy + 0.5).toFixed(1)} L${(50 - hr * 0.45).toFixed(1)} ${(headCy - 3).toFixed(1)} Z`}
        fill={belly}
      />
      {/* 귀 — 자랄수록 길고 뾰족 */}
      <path
        d={`M${(50 - hr * 0.75).toFixed(1)} ${(headCy - hr * 0.45).toFixed(1)} L${(50 - hr * 0.95).toFixed(1)} ${(headCy - hr * 0.45 - earL).toFixed(1)} L${(50 - hr * 0.2).toFixed(1)} ${(headCy - hr * 0.85).toFixed(1)} Z`}
        fill={c}
      />
      <path
        d={`M${(50 + hr * 0.75).toFixed(1)} ${(headCy - hr * 0.45).toFixed(1)} L${(50 + hr * 0.95).toFixed(1)} ${(headCy - hr * 0.45 - earL).toFixed(1)} L${(50 + hr * 0.2).toFixed(1)} ${(headCy - hr * 0.85).toFixed(1)} Z`}
        fill={c}
      />
      {/* 눈/코/입 */}
      <circle cx={50 - hr * 0.38} cy={headCy - 0.5} r={1.2} fill="#2a2018" />
      <circle cx={50 + hr * 0.38} cy={headCy - 0.5} r={1.2} fill="#2a2018" />
      <ellipse cx={50} cy={headCy + hr * 0.52} rx={1.2} ry={0.9} fill={dk} />
      <path
        d={`M50 ${(headCy + hr * 0.62).toFixed(1)} q-1.5 1.2 -3 0.2 M50 ${(headCy + hr * 0.62).toFixed(1)} q1.5 1.2 3 0.2`}
        stroke={dk}
        strokeWidth={0.8}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

// 부엉이 — 성장 모핑: 아기 = 동글 솜뭉치 병아리(귀깃·줄무늬 없음) / 성체 = 길쭉 몸 + 귀깃 + 배 줄무늬
function Owl(w: number, g = 1) {
  const c = wiltC("#8B6B4A", w);
  const dk = mix(wiltC("#8B6B4A", w), "#4A3620", 0.5);
  const belly = wiltC("#E8D3B0", w);
  const s = 0.72 + 0.28 * g;
  const bRy = 12 + 4 * g; // 자랄수록 길쭉
  const bRx = 13.5 - 1.5 * g; // 아기가 더 둥글
  const bCy = 87 - bRy - 1;
  const tuft = seg(g, 0.4, 1); // 귀깃 발달
  const stripes = seg(g, 0.45, 1); // 배 줄무늬
  const fluff = 1 - seg(g, 0, 0.6); // 아기 솜털
  const faceCy = bCy - bRy * 0.42;
  const eyeR = 3.2 + 0.6 * g;
  return (
    <g transform={`translate(50 87) scale(${s.toFixed(3)}) translate(-50 -87)`}>
      {/* 몸통 */}
      <ellipse cx={50} cy={bCy} rx={bRx} ry={bRy} fill={c} />
      {/* 아기 솜털 (양옆 보풀) */}
      {fluff > 0.05 && (
        <path
          d={`M${(50 - bRx).toFixed(1)} ${(bCy - 2).toFixed(1)} q -2.5 1 -1.5 3 M${(50 - bRx + 1).toFixed(1)} ${(bCy + 4).toFixed(1)} q -2.5 1 -1.5 3 M${(50 + bRx).toFixed(1)} ${(bCy - 2).toFixed(1)} q 2.5 1 1.5 3 M${(50 + bRx - 1).toFixed(1)} ${(bCy + 4).toFixed(1)} q 2.5 1 1.5 3`}
          stroke={c}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
          opacity={fluff * 0.9}
        />
      )}
      {/* 배 */}
      <ellipse
        cx={50}
        cy={bCy + bRy * 0.25}
        rx={bRx * 0.68}
        ry={bRy * 0.68}
        fill={belly}
      />
      {/* 배 줄무늬 — 성체만 */}
      {stripes > 0.05 && (
        <path
          d={`M46 ${(bCy + 2).toFixed(1)} l0 3 M50 ${(bCy + 2).toFixed(1)} l0 4 M54 ${(bCy + 2).toFixed(1)} l0 3 M46 ${(bCy + 8).toFixed(1)} l0 3 M50 ${(bCy + 8).toFixed(1)} l0 3 M54 ${(bCy + 8).toFixed(1)} l0 3`}
          stroke={dk}
          strokeWidth={0.9}
          strokeLinecap="round"
          opacity={stripes * 0.6}
        />
      )}
      {/* 귀 깃털 — 자라면서 생김 */}
      {tuft > 0.05 && (
        <>
          <path
            d={`M${(50 - bRx * 0.6).toFixed(1)} ${(faceCy - 4).toFixed(1)} L${(50 - bRx * 0.75).toFixed(1)} ${(faceCy - 4 - 8 * tuft).toFixed(1)} L${(50 - bRx * 0.28).toFixed(1)} ${(faceCy - 6).toFixed(1)} Z`}
            fill={c}
          />
          <path
            d={`M${(50 + bRx * 0.6).toFixed(1)} ${(faceCy - 4).toFixed(1)} L${(50 + bRx * 0.75).toFixed(1)} ${(faceCy - 4 - 8 * tuft).toFixed(1)} L${(50 + bRx * 0.28).toFixed(1)} ${(faceCy - 6).toFixed(1)} Z`}
            fill={c}
          />
        </>
      )}
      {/* 얼굴 판 */}
      <ellipse cx={50} cy={faceCy} rx={bRx * 0.85} ry={8 + g} fill={belly} />
      {/* 눈 (아기도 큰 눈 — 상대적으로 더 커 보임) */}
      <circle cx={50 - 5.5} cy={faceCy} r={eyeR} fill="#fff" />
      <circle cx={50 + 5.5} cy={faceCy} r={eyeR} fill="#fff" />
      <circle cx={50 - 5.5} cy={faceCy + 0.5} r={eyeR * 0.62} fill={dk} />
      <circle cx={50 + 5.5} cy={faceCy + 0.5} r={eyeR * 0.62} fill={dk} />
      <circle cx={50 - 5.2} cy={faceCy - 0.4} r={0.8} fill="#fff" />
      <circle cx={50 + 5.8} cy={faceCy - 0.4} r={0.8} fill="#fff" />
      {/* 부리 */}
      <path
        d={`M50 ${(faceCy + 2.5).toFixed(1)} l-2 ${(4 + g).toFixed(1)} l4 0 Z`}
        fill="#E8A64A"
      />
      {/* 발 */}
      <path
        d="M46 87 l-1 2 M50 87 l0 2 M54 87 l1 2"
        stroke="#E8A64A"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </g>
  );
}

// 거북이 — 성장 모핑: 아기 = 작고 밝은 민무늬 껍질·큰 머리 / 성체 = 큰 돔 + 육각 패턴
function Turtle(w: number, g = 1, front = false) {
  const shellBase = wiltC("#4E9E4E", w);
  const shell = mix(shellBase, "#7CC97C", (1 - g) * 0.45); // 아기는 밝은 초록
  const shellDk = mix(shellBase, "#2F6B2F", 0.5);
  const skin = wiltC("#8FBE6E", w);
  const s = 0.62 + 0.38 * g;
  const pat = seg(g, 0.35, 1); // 육각 패턴 발달
  const headR = 5.8 - 0.8 * g; // 아기 머리 비율 큼
  if (front) {
    // 정면 — 돔이 화자를 향하고 머리가 위로 빼꼼
    return (
      <g transform={`translate(50 87) scale(${s.toFixed(3)}) translate(-50 -87)`}>
        {/* 앞발 (좌우) */}
        <ellipse cx={39} cy={85} rx={4} ry={2.2} fill={skin} />
        <ellipse cx={61} cy={85} rx={4} ry={2.2} fill={skin} />
        {/* 머리 (돔 위 중앙) */}
        <circle cx={50} cy={62 - headR * 0.5} r={headR} fill={skin} />
        <circle cx={50 - headR * 0.4} cy={61 - headR * 0.5} r={0.9} fill="#2a2018" />
        <circle cx={50 + headR * 0.4} cy={61 - headR * 0.5} r={0.9} fill="#2a2018" />
        <path
          d={`M${(50 - 1.6).toFixed(1)} ${(63.4 - headR * 0.5).toFixed(1)} q1.6 1.2 3.2 0`}
          stroke={shellDk}
          strokeWidth={0.8}
          fill="none"
          strokeLinecap="round"
        />
        {/* 돔 (정면) */}
        <path d="M33 85 q0 -20 17 -20 q17 0 17 20 Z" fill={shell} />
        {/* 배딱지 라인 */}
        <path d="M35 82 q15 5 30 0" stroke={shellDk} strokeWidth={1} fill="none" opacity={0.5} />
        {/* 육각 패턴 — 성체만 */}
        {pat > 0.05 && (
          <g opacity={pat * 0.6}>
            <path d="M50 68 l5.5 2.8 l-5.5 2.8 l-5.5 -2.8 Z" fill={shellDk} />
            <path d="M41 75 l4.5 2.3 l-4.5 2.3 l-4 -2.3 Z" fill={shellDk} />
            <path d="M59 75 l4.5 2.3 l-4.5 2.3 l-4 -2.3 Z" fill={shellDk} />
          </g>
        )}
      </g>
    );
  }
  return (
    <g transform={`translate(50 87) scale(${s.toFixed(3)}) translate(-50 -87)`}>
      {/* 다리 */}
      <ellipse cx={36} cy={83} rx={4} ry={2.5} fill={skin} />
      <ellipse cx={62} cy={83} rx={4} ry={2.5} fill={skin} />
      {/* 꼬리 */}
      <path d="M32 78 l-4 2 l4 1 Z" fill={skin} />
      {/* 껍질 아래 몸통 */}
      <ellipse cx={50} cy={80} rx={16} ry={5} fill={skin} />
      {/* 껍질 (돔) — 자랄수록 높아짐 */}
      <path
        d={`M32 78 q0 ${(-14 - 5 * g).toFixed(1)} 18 ${(-14 - 5 * g).toFixed(1)} q18 0 18 ${(14 + 5 * g).toFixed(1)} Z`}
        fill={shell}
      />
      {/* 육각 패턴 — 성체만 */}
      {pat > 0.05 && (
        <g opacity={pat * 0.6}>
          <path d="M50 62 l6 3 l-6 3 l-6 -3 Z" fill={shellDk} />
          <path d="M40 70 l5 2.5 l-5 2.5 l-4 -2.5 Z" fill={shellDk} />
          <path d="M60 70 l5 2.5 l-5 2.5 l-4 -2.5 Z" fill={shellDk} />
        </g>
      )}
      {/* 머리 (오른쪽) — 아기가 상대적으로 큼 */}
      <circle cx={70} cy={73} r={headR} fill={skin} />
      <circle cx={72} cy={71.5} r={0.9} fill="#2a2018" />
      <path
        d="M69 75 q2 1.5 4 0"
        stroke={shellDk}
        strokeWidth={0.8}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

// 다람쥐 — 성장 모핑: 아기 = 큰 머리·작은 꼬리·도토리 없음 / 성체 = 풍성한 S 꼬리 + 도토리
function Squirrel(w: number, g = 1, front = false) {
  const c = wiltC("#B57A46", w);
  const dk = mix(wiltC("#B57A46", w), "#6E4523", 0.5);
  const belly = wiltC("#F5E4CE", w);
  const s = 0.62 + 0.38 * g;
  const hr = 9 - 1.5 * g; // 아기 머리 큼
  const tailS = 0.45 + 0.55 * g; // 꼬리 발달
  const acorn = seg(g, 0.5, 1); // 도토리는 성장 후
  if (front) {
    // 정면 — 도토리를 두 앞발로 안고 있는 다람쥐
    return (
      <g transform={`translate(50 87) scale(${s.toFixed(3)}) translate(-50 -87)`}>
        {/* 꼬리 (뒤에서 오른쪽 위로 솟음) */}
        <path
          d={`M58 82 Q ${(58 + 12 * tailS).toFixed(1)} ${(84 - 4 * tailS).toFixed(1)} ${(58 + 10 * tailS).toFixed(1)} ${(80 - 18 * tailS).toFixed(1)} Q ${(56 + 8 * tailS).toFixed(1)} ${(76 - 24 * tailS).toFixed(1)} ${(52 + 4 * tailS).toFixed(1)} ${(78 - 22 * tailS).toFixed(1)}`}
          stroke={c}
          strokeWidth={5 + 4 * tailS}
          fill="none"
          strokeLinecap="round"
        />
        {/* 몸통 */}
        <ellipse cx={50} cy={78} rx={9.5} ry={8.5} fill={c} />
        <ellipse cx={50} cy={80} rx={6} ry={5.5} fill={belly} />
        {/* 발 */}
        <ellipse cx={45} cy={86.5} rx={3.2} ry={1.8} fill={c} />
        <ellipse cx={55} cy={86.5} rx={3.2} ry={1.8} fill={c} />
        {/* 도토리 (가슴 중앙) — 성체만 */}
        {acorn > 0.05 && (
          <g opacity={acorn}>
            <ellipse cx={50} cy={77} rx={2.8} ry={3.6} fill="#B08050" />
            <ellipse cx={50} cy={74.8} rx={3} ry={1.6} fill={dk} />
            {/* 앞발 두 개가 도토리 감싸기 */}
            <ellipse cx={46.8} cy={77.5} rx={1.8} ry={2.6} fill={c} />
            <ellipse cx={53.2} cy={77.5} rx={1.8} ry={2.6} fill={c} />
          </g>
        )}
        {/* 머리 */}
        <circle cx={50} cy={64} r={hr} fill={c} />
        {/* 볼 */}
        <ellipse cx={50 - hr * 0.55} cy={66} rx={2.2} ry={1.8} fill={belly} />
        <ellipse cx={50 + hr * 0.55} cy={66} rx={2.2} ry={1.8} fill={belly} />
        {/* 귀 */}
        <path
          d={`M${(50 - hr * 0.7).toFixed(1)} ${(64 - hr * 0.6).toFixed(1)} L${(50 - hr * 0.85).toFixed(1)} ${(64 - hr * 0.6 - 6).toFixed(1)} L${(50 - hr * 0.25).toFixed(1)} ${(64 - hr * 0.9).toFixed(1)} Z`}
          fill={c}
        />
        <path
          d={`M${(50 + hr * 0.7).toFixed(1)} ${(64 - hr * 0.6).toFixed(1)} L${(50 + hr * 0.85).toFixed(1)} ${(64 - hr * 0.6 - 6).toFixed(1)} L${(50 + hr * 0.25).toFixed(1)} ${(64 - hr * 0.9).toFixed(1)} Z`}
          fill={c}
        />
        {/* 눈/코/입 */}
        <circle cx={50 - hr * 0.35} cy={63.5} r={1.2} fill="#2a2018" />
        <circle cx={50 + hr * 0.35} cy={63.5} r={1.2} fill="#2a2018" />
        <circle cx={50} cy={66.5} r={0.9} fill={dk} />
        <path
          d="M50 67.5 q-1.3 1 -2.6 0.2 M50 67.5 q1.3 1 2.6 0.2"
          stroke={dk}
          strokeWidth={0.7}
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );
  }
  return (
    <g transform={`translate(50 87) scale(${s.toFixed(3)}) translate(-50 -87)`}>
      {/* S 꼬리 — 부착점(46,84)이 엉덩이 안쪽이라 스케일해도 몸에서 안 떨어짐 */}
      <g
        transform={`translate(46 84) scale(${tailS.toFixed(3)}) translate(-46 -84)`}
      >
        <path
          d="M46 84 Q 29 84 29 67 Q 29 52 44 53 Q 37 59 38 69 Q 39 79 48 79 Z"
          fill={c}
        />
        <path
          d="M44 80 Q 34 78 34 67 Q 34 58 41 56"
          stroke={dk}
          strokeWidth={1.6}
          fill="none"
          opacity={0.45}
          strokeLinecap="round"
        />
      </g>
      {/* 뒷다리 앉은 자세 (꼬리 부착부 덮음) */}
      <ellipse cx={46} cy={82} rx={6} ry={5} fill={c} />
      {/* 몸통 (세로) */}
      <ellipse cx={52} cy={72} rx={8} ry={11} fill={c} />
      {/* 배 */}
      <ellipse cx={53} cy={75} rx={4.5} ry={7} fill={belly} />
      {/* 앞다리 */}
      <ellipse cx={58} cy={72} rx={2.5} ry={4} fill={c} />
      {/* 도토리 — 성체만 */}
      {acorn > 0.05 && (
        <g opacity={acorn}>
          <ellipse cx={60} cy={71} rx={2.6} ry={3.4} fill="#B08050" />
          <ellipse cx={60} cy={69} rx={2.8} ry={1.5} fill={dk} />
        </g>
      )}
      {/* 머리 — 아기가 상대적으로 큼 */}
      <circle cx={54} cy={58} r={hr} fill={c} />
      {/* 볼 크림 */}
      <ellipse cx={57} cy={60.5} rx={2.5} ry={2} fill={belly} />
      {/* 귀 */}
      <path d="M49 51 L47 44 L52 50 Z" fill={c} />
      <path d="M58 51 L60 44 L61 51 Z" fill={c} />
      {/* 눈 + 코 */}
      <circle cx={53} cy={57} r={1.2} fill="#2a2018" />
      <circle cx={60} cy={60} r={0.9} fill={dk} />
    </g>
  );
}

// 나비 — 변태(metamorphosis): 애벌레 → 번데기 → 나비 → 화려한 나비
function Butterfly(w: number, g = 1) {
  const bodyC = wiltC("#3A2F4A", w);
  // stage 0~1 (g < 0.34): 애벌레
  if (g < 0.34) {
    const cat = wiltC("#7CC94E", w);
    const catDk = mix(wiltC("#7CC94E", w), "#4A8A28", 0.5);
    return (
      <g>
        {/* 몸 마디 5개 (땅 위를 기어감) */}
        {[0, 1, 2, 3].map((i) => (
          <circle
            key={i}
            cx={40 + i * 6}
            cy={84 - (i % 2) * 1.2}
            r={4}
            fill={i % 2 === 0 ? cat : catDk}
          />
        ))}
        {/* 머리 */}
        <circle cx={62} cy={82.5} r={4.8} fill={cat} />
        {/* 더듬이 (짧게) */}
        <path
          d="M64 78.5 q1 -2.5 2.5 -3.5 M60.5 78.2 q-0.5 -2.5 0.5 -4"
          stroke={catDk}
          strokeWidth={1}
          fill="none"
          strokeLinecap="round"
        />
        {/* 눈 + 볼 */}
        <circle cx={63.5} cy={81.5} r={1} fill="#2a2018" />
        <circle cx={65.5} cy={84} r={1} fill="#F4A6B0" opacity={0.8} />
        {/* 발 (작은 점들) */}
        {[0, 1, 2, 3].map((i) => (
          <circle key={`f${i}`} cx={40 + i * 6} cy={87.4} r={0.9} fill={catDk} />
        ))}
      </g>
    );
  }
  // stage 2 근처 (g < 0.67): 번데기 — 줄기에 매달림
  if (g < 0.67) {
    const chry = wiltC("#B8C46A", w);
    const chryDk = mix(wiltC("#B8C46A", w), "#7A8A3A", 0.5);
    const leaf = wiltC("#5FB86A", w);
    const stemC = wiltC("#3E9E48", w);
    return (
      <g>
        {/* 줄기 */}
        <path
          d="M52 86 Q 53 72 50 62"
          stroke={stemC}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
        {/* 잎 */}
        <ellipse cx={57} cy={65} rx={6} ry={3} fill={leaf} transform="rotate(-24 57 65)" />
        {/* 매달린 실 */}
        <path d="M50 62 L48.5 66" stroke={chryDk} strokeWidth={1} strokeLinecap="round" />
        {/* 번데기 본체 */}
        <ellipse cx={48} cy={74} rx={5} ry={8.5} fill={chry} />
        {/* 마디 줄 */}
        <path
          d="M43.5 70 q4.5 2 9 0 M43.2 74 q4.8 2 9.6 0 M43.7 78 q4.3 2 8.6 0"
          stroke={chryDk}
          strokeWidth={0.9}
          fill="none"
          opacity={0.7}
        />
        {/* 안에 비치는 날개 힌트 */}
        <ellipse cx={48} cy={74} rx={2.4} ry={5} fill={wiltC("#F58B9E", w)} opacity={0.35} />
      </g>
    );
  }
  // stage 3 (g ≥ 0.67): 나비 — g 가 1 에 가까울수록 화려해짐
  const wing = seg(g, 0.67, 1); // 날개 발달 0..1
  const fancy = seg(g, 0.85, 1); // 화려한 무늬
  const wingA = wiltC("#F58B9E", w);
  const wingB = wiltC("#E24468", w);
  const wingC = wiltC("#FFE07A", w);
  const ws = 0.75 + 0.25 * wing;
  return (
    <g transform={`translate(50 82) scale(${ws.toFixed(3)}) translate(-50 -82)`}>
      {/* 위 날개 (왼/오) */}
      <ellipse cx={36} cy={72} rx={13} ry={11} fill={wingA} transform="rotate(-14 36 72)" />
      <circle cx={34} cy={68} r={3} fill={wingC} />
      <circle cx={34} cy={68} r={1.4} fill={bodyC} />
      <ellipse cx={64} cy={72} rx={13} ry={11} fill={wingA} transform="rotate(14 64 72)" />
      <circle cx={66} cy={68} r={3} fill={wingC} />
      <circle cx={66} cy={68} r={1.4} fill={bodyC} />
      {/* 아래 날개 */}
      <ellipse cx={40} cy={84} rx={9} ry={7} fill={wingB} transform="rotate(-6 40 84)" />
      <ellipse cx={60} cy={84} rx={9} ry={7} fill={wingB} transform="rotate(6 60 84)" />
      {/* 화려한 무늬 — 마지막 단계에서만 */}
      {fancy > 0.05 && (
        <g opacity={fancy}>
          <circle cx={40} cy={75} r={1.8} fill={wingC} />
          <circle cx={60} cy={75} r={1.8} fill={wingC} />
          <circle cx={40} cy={84} r={1.5} fill="#fff" opacity={0.75} />
          <circle cx={60} cy={84} r={1.5} fill="#fff" opacity={0.75} />
          <path
            d="M30 64 l1 -2 M70 64 l-1 -2"
            stroke={wingC}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </g>
      )}
      {/* 몸통 */}
      <ellipse cx={50} cy={78} rx={2.2} ry={9} fill={bodyC} />
      {/* 더듬이 */}
      <path d="M48.5 68 q-2 -6 -4 -8" stroke={bodyC} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <path d="M51.5 68 q2 -6 4 -8" stroke={bodyC} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <circle cx={44.5} cy={60} r={0.9} fill={bodyC} />
      <circle cx={55.5} cy={60} r={0.9} fill={bodyC} />
    </g>
  );
}

/* ── 신규 특별 꽃 (2026-07) ── */

function Lotus(w: number, g = 1) {
  const petal = wiltC("#F5A6BE", w);
  const petalDk = mix(wiltC("#F5A6BE", w), "#D4587A", 0.5);
  const leaf = wiltC("#5FB86A", w);
  const ctr = wiltC("#FBD24E", w);
  const top = 86 - (10 + 26 * g);
  const bloom = seg(g, 0.45, 1);
  return (
    <g>
      {/* 물잎 (바닥) */}
      {g > 0.3 && (
        <ellipse cx={38} cy={85} rx={10} ry={2.4} fill={leaf} />
      )}
      {/* 줄기 */}
      {stem(`M50 86 L50 ${top.toFixed(1)}`, wiltC("#3E9E48", w), 3 + g)}
      {bloom > 0 && (
        <>
          {/* 바깥 꽃잎 4장 */}
          {[-45, -15, 15, 45].map((a) => (
            <ellipse
              key={`o${a}`}
              cx={50}
              cy={top}
              rx={3.5 * bloom}
              ry={9 * bloom}
              fill={petalDk}
              transform={`rotate(${a} 50 ${top.toFixed(1)}) translate(0 ${(-8 * bloom).toFixed(1)})`}
            />
          ))}
          {/* 안쪽 꽃잎 3장 */}
          {[-25, 0, 25].map((a) => (
            <ellipse
              key={`i${a}`}
              cx={50}
              cy={top}
              rx={3 * bloom}
              ry={7 * bloom}
              fill={petal}
              transform={`rotate(${a} 50 ${top.toFixed(1)}) translate(0 ${(-6 * bloom).toFixed(1)})`}
            />
          ))}
          {/* 중심 씨앗 */}
          <circle cx={50} cy={top - 2} r={2.5 * bloom} fill={ctr} />
        </>
      )}
    </g>
  );
}

function Rose(w: number, g = 1) {
  const petal = wiltC("#E63755", w);
  const petalDk = mix(wiltC("#E63755", w), "#8A1E30", 0.5);
  const lf = wiltC("#4FB257", w);
  const st = wiltC("#3E9E48", w);
  const top = 86 - (10 + 26 * g);
  const bloom = seg(g, 0.4, 1);
  const sH = 86 - top;
  return (
    <g>
      {/* 줄기 (가시 힌트) */}
      {stem(`M50 86 L50 ${top.toFixed(1)}`, st, 3 + g)}
      {g > 0.3 && (
        <>
          <path d={`M50 ${(86 - sH * 0.4).toFixed(1)} l-2 -1`} stroke={st} strokeWidth={0.9} strokeLinecap="round" />
          <path d={`M50 ${(86 - sH * 0.65).toFixed(1)} l2 -1`} stroke={st} strokeWidth={0.9} strokeLinecap="round" />
        </>
      )}
      {/* 잎 */}
      {g > 0.35 && <Leaf x={44} y={86 - sH * 0.45} rot={40} c={lf} len={9} />}
      {g > 0.55 && <Leaf x={56} y={86 - sH * 0.65} rot={-40} c={lf} len={9} />}
      {bloom > 0 && (
        <>
          {/* 바깥 꽃잎(원형 곡선) */}
          <circle cx={50} cy={top} r={9 * bloom} fill={petalDk} />
          <circle cx={50} cy={top - 1} r={7 * bloom} fill={petal} />
          <circle cx={50} cy={top - 1.5} r={5 * bloom} fill={petalDk} />
          {/* 안쪽 나선 (bud) */}
          <path
            d={`M50 ${(top - 2).toFixed(1)} q -3 0 -3 3 q 0 3 3 3 q 3 0 3 -3 q 0 -2 -2 -2`}
            fill={petal}
            stroke={petalDk}
            strokeWidth={0.6}
          />
        </>
      )}
    </g>
  );
}

function Lavender(w: number, g = 1) {
  const stemC = wiltC("#4FB257", w);
  const flower = wiltC("#9A7BE8", w);
  const flowerDk = mix(wiltC("#9A7BE8", w), "#5A3AA8", 0.5);
  const stalkH = 20 + 20 * g;
  const bloom = seg(g, 0.35, 1);
  return (
    <g>
      {/* 3~4 줄기 */}
      {[42, 50, 58, 46, 54].map((x, i) => {
        const h = stalkH * (0.75 + (i % 3) * 0.1);
        const top = 86 - h;
        return (
          <g key={i}>
            <path d={`M${x} 86 L${x} ${top.toFixed(1)}`} stroke={stemC} strokeWidth={1.6} strokeLinecap="round" fill="none" />
            {/* 꽃봉오리 알갱이들 */}
            {bloom > 0 &&
              Array.from({ length: 5 }).map((_, j) => {
                const y = top + j * 3;
                const r = 1.8 * bloom;
                return (
                  <ellipse
                    key={j}
                    cx={x}
                    cy={y}
                    rx={r}
                    ry={r + 0.5}
                    fill={j % 2 === 0 ? flower : flowerDk}
                  />
                );
              })}
          </g>
        );
      })}
    </g>
  );
}

function CherryBlossom(w: number, g = 1) {
  const petal = wiltC("#FFC0D6", w);
  const petalDk = mix(wiltC("#FFC0D6", w), "#E48CB0", 0.5);
  const ctr = wiltC("#F5E4A0", w);
  const lf = wiltC("#4FB257", w);
  const st = wiltC("#7A5A42", w);
  const top = 86 - (14 + 22 * g);
  const bloom = seg(g, 0.4, 1);
  return (
    <g>
      {/* 잔가지 */}
      {stem(`M50 86 L50 ${top.toFixed(1)}`, st, 2.5 + g)}
      {g > 0.4 && stem(`M50 ${(top + 4).toFixed(1)} q -6 -4 -10 -6`, st, 1.8)}
      {g > 0.4 && stem(`M50 ${(top + 4).toFixed(1)} q 6 -4 10 -6`, st, 1.8)}
      {/* 잎 */}
      {g > 0.35 && <Leaf x={38} y={top + 2} rot={20} c={lf} len={7} />}
      {g > 0.5 && <Leaf x={62} y={top + 2} rot={-20} c={lf} len={7} />}
      {bloom > 0 && (
        <>
          {/* 꽃 3개: 중앙, 왼, 오 */}
          {[
            { x: 50, y: top - 2, r: 5 * bloom },
            { x: 40, y: top - 4, r: 4 * bloom },
            { x: 60, y: top - 4, r: 4 * bloom },
          ].map((f, i) => (
            <g key={i}>
              {/* 5장 꽃잎 */}
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse
                  key={a}
                  cx={f.x}
                  cy={f.y}
                  rx={f.r * 0.55}
                  ry={f.r}
                  fill={petal}
                  transform={`rotate(${a} ${f.x} ${f.y}) translate(0 ${(-f.r * 0.7).toFixed(1)})`}
                />
              ))}
              <circle cx={f.x} cy={f.y} r={f.r * 0.35} fill={ctr} />
              <circle cx={f.x} cy={f.y} r={f.r * 0.2} fill={petalDk} />
            </g>
          ))}
        </>
      )}
    </g>
  );
}

/* ── 신규 특별 나무 (2026-07) ── */

function MapleTree(w: number, g = 1) {
  const trunk = wiltC("#7A5A42", w);
  const leafA = wiltC("#E85A2A", w);
  const leafB = wiltC("#F58A3A", w);
  const leafC = wiltC("#FBC46A", w);
  const trunkH = 14 + 20 * g;
  const top = 86 - trunkH;
  const cr = 10 + 22 * g;
  const tw = 5 * (0.6 + 0.4 * g);
  return (
    <g>
      <rect x={50 - tw} y={top} width={2 * tw} height={trunkH} rx={3} fill={trunk} />
      {/* 세 겹 낙엽 캐노피 */}
      <ellipse cx={50} cy={top - cr * 0.5} rx={cr} ry={cr * 0.95} fill={leafA} />
      <ellipse cx={50 - cr * 0.35} cy={top - cr * 0.4} rx={cr * 0.65} ry={cr * 0.6} fill={leafB} />
      <ellipse cx={50 + cr * 0.35} cy={top - cr * 0.55} rx={cr * 0.6} ry={cr * 0.55} fill={leafC} />
      {/* 몇 잎 떨어지는 */}
      {g > 0.5 && (
        <>
          <path d={`M${(50 + cr).toFixed(1)} ${(top).toFixed(1)} l1 2 l-2 -1 Z`} fill={leafB} />
          <path d={`M${(50 - cr).toFixed(1)} ${(top + 3).toFixed(1)} l1 2 l-2 -1 Z`} fill={leafC} />
        </>
      )}
    </g>
  );
}

function GinkgoTree(w: number, g = 1) {
  const trunk = wiltC("#8A5A3A", w);
  const yellow = wiltC("#F5C544", w);
  const yellowDk = mix(wiltC("#F5C544", w), "#B08820", 0.4);
  const trunkH = 14 + 22 * g;
  const top = 86 - trunkH;
  const cr = 10 + 22 * g;
  const tw = 5 * (0.6 + 0.4 * g);
  return (
    <g>
      <rect x={50 - tw} y={top} width={2 * tw} height={trunkH} rx={3} fill={trunk} />
      {/* 삼각형 부채꼴 캐노피 (아래가 둥근 삼각형) */}
      <path
        d={`M50 ${(top - cr * 1.3).toFixed(1)} Q ${(50 - cr).toFixed(1)} ${(top - cr * 0.3).toFixed(1)} ${(50 - cr * 0.9).toFixed(1)} ${top.toFixed(1)} Q 50 ${(top + cr * 0.15).toFixed(1)} ${(50 + cr * 0.9).toFixed(1)} ${top.toFixed(1)} Q ${(50 + cr).toFixed(1)} ${(top - cr * 0.3).toFixed(1)} 50 ${(top - cr * 1.3).toFixed(1)} Z`}
        fill={yellow}
      />
      {/* 잎 결 (부채살) */}
      {[-30, -15, 0, 15, 30].map((a) => (
        <path
          key={a}
          d={`M50 ${(top - cr * 0.1).toFixed(1)} L${(50 + Math.sin((a * Math.PI) / 180) * cr * 0.85).toFixed(1)} ${(top - Math.cos((a * Math.PI) / 180) * cr * 1).toFixed(1)}`}
          stroke={yellowDk}
          strokeWidth={0.8}
          fill="none"
          opacity={0.5}
        />
      ))}
    </g>
  );
}

function CherryTree(w: number, g = 1) {
  const trunk = wiltC("#7A5A42", w);
  const blossom = wiltC("#FFC0D6", w);
  const blossomDk = mix(wiltC("#FFC0D6", w), "#E48CB0", 0.5);
  const trunkH = 14 + 20 * g;
  const top = 86 - trunkH;
  const cr = 10 + 22 * g;
  const tw = 5 * (0.6 + 0.4 * g);
  const bloom = seg(g, 0.4, 1);
  return (
    <g>
      <rect x={50 - tw} y={top} width={2 * tw} height={trunkH} rx={3} fill={trunk} />
      {/* 3개 겹친 벚꽃 캐노피 (구름형) */}
      <circle cx={50} cy={top - cr * 0.5} r={cr * 0.9} fill={blossom} />
      <circle cx={50 - cr * 0.5} cy={top - cr * 0.35} r={cr * 0.7} fill={blossom} />
      <circle cx={50 + cr * 0.5} cy={top - cr * 0.4} r={cr * 0.7} fill={blossom} />
      <circle cx={50 - cr * 0.25} cy={top - cr * 0.75} r={cr * 0.55} fill={blossomDk} opacity={0.5} />
      {/* 꽃 힌트 (작은 점들) */}
      {bloom > 0.5 && (
        <>
          <circle cx={50 - cr * 0.4} cy={top - cr * 0.55} r={1.4} fill={blossomDk} />
          <circle cx={50 + cr * 0.2} cy={top - cr * 0.7} r={1.4} fill={blossomDk} />
          <circle cx={50 + cr * 0.4} cy={top - cr * 0.3} r={1.4} fill={blossomDk} />
        </>
      )}
    </g>
  );
}

function Tent(w: number) {
  const c = wiltC("#E2725B", w);
  const dk = mix(wiltC("#E2725B", w), "#B85A45", 0.4);
  return (
    <g>
      <path d="M50 36 L82 86 L18 86 Z" fill={c} />
      <path d="M50 36 L50 86 L18 86 Z" fill={dk} />
      <path d="M50 86 L50 60 Q 43 72 39 86 Z" fill="#2c2c2c" opacity={0.85} />
      <path
        d="M50 36 L84 86"
        stroke={dk}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}
function Flag(w: number) {
  const fl = wiltC("#3FAE6B", w);
  return (
    <g>
      <rect x={48} y={38} width={3} height={48} rx={1.5} fill="#9A7B5A" />
      <path d="M51 41 L76 48 L51 55 Z" fill={fl} />
    </g>
  );
}
function Sign(w: number) {
  const wood = wiltC("#B5895A", w);
  return (
    <g>
      <rect x={48} y={56} width={4.5} height={30} rx={1} fill={wood} />
      <rect x={33} y={48} width={34} height={17} rx={2.5} fill="#EBDDB8" />
      <rect
        x={33}
        y={48}
        width={34}
        height={17}
        rx={2.5}
        fill="none"
        stroke={wood}
        strokeWidth={2.5}
      />
      <rect x={38} y={53} width={24} height={2.4} rx={1} fill={wood} opacity={0.55} />
      <rect x={38} y={58} width={17} height={2.4} rx={1} fill={wood} opacity={0.55} />
    </g>
  );
}
function Seed(w: number) {
  const soil = wiltC("#8A6A47", w);
  const soilD = mix(wiltC("#8A6A47", w), "#5E4630", 0.45);
  const sprout = wiltC("#7BC97B", w);
  return (
    <g>
      <ellipse cx={50} cy={84} rx={16} ry={7} fill={soil} />
      <ellipse cx={50} cy={82} rx={10} ry={4.5} fill={soilD} opacity={0.5} />
      <path
        d="M50 84 L50 73"
        stroke={sprout}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <ellipse
        cx={45}
        cy={73}
        rx={4.5}
        ry={2.6}
        fill={sprout}
        transform="rotate(-28 45 73)"
      />
      <ellipse
        cx={55}
        cy={73}
        rx={4.5}
        ry={2.6}
        fill={sprout}
        transform="rotate(28 55 73)"
      />
    </g>
  );
}
// 구름 — 성장값 g 로 크기 모핑, tint 로 색 변이(무지개/황금). hilly_rn 과 동일
function CloudPlant(
  w: number,
  g = 1,
  _front = false,
  tint: string | null = null
) {
  const isRainbow = tint === "rainbow";
  const body =
    !tint || isRainbow
      ? mix("#FFFFFF", "#C9D2D8", w * 0.4)
      : tint === "gold"
        ? mix("#E8B93A", "#FFFFFF", 0.12)
        : mix(tint, "#FFFFFF", 0.3);
  const sh = mix(body, "#AEB8C0", 0.35);
  const s = 0.5 + 0.5 * g;
  return (
    <g transform={`translate(50 49) scale(${s.toFixed(3)}) translate(-50 -49)`}>
      {/* 무지개 아치 — 구름 아래 살짝 삐져나오게 */}
      {isRainbow &&
        ["#FF6B6B", "#FFA94D", "#FFE066", "#7CD97C", "#74C0FC", "#B197FC"].map(
          (col, i) => {
            const r = 17 - i * 2.2;
            return (
              <path
                key={col}
                d={`M${(50 - r).toFixed(1)} 55 Q 50 ${(55 + r * 0.9).toFixed(1)} ${(50 + r).toFixed(1)} 55`}
                stroke={col}
                strokeWidth={2.1}
                fill="none"
                strokeLinecap="round"
              />
            );
          }
        )}
      <ellipse cx={50} cy={55} rx={22} ry={9.5} fill={sh} opacity={0.6} />
      <ellipse cx={50} cy={53} rx={22} ry={9.5} fill={body} />
      <ellipse cx={37} cy={49} rx={12.5} ry={9.5} fill={body} />
      <ellipse cx={62} cy={48} rx={14} ry={10} fill={body} />
      <ellipse cx={50} cy={43} rx={13} ry={10} fill={body} />
    </g>
  );
}

export const PLANT_SVG: Record<string, Render> = {
  Seed,
  Sprout,
  Daisy,
  Tulip,
  Sunflower,
  Bush,
  Mushroom,
  Pine,
  RoundTree,
  TallTree,
  BigPine,
  HallasanTree,
  Cactus,
  Rabbit,
  Duck,
  Deer,
  WhiteDeer,
  Unicorn,
  Cat,
  Bird,
  Frog,
  Fox,
  Owl,
  Turtle,
  Squirrel,
  Butterfly,
  Lotus,
  Rose,
  Lavender,
  CherryBlossom,
  MapleTree,
  GinkgoTree,
  CherryTree,
  Tent,
  Flag,
  Sign,
  CloudPlant,
};

/* ── 풍경 헬퍼 ── */
export function ridgePath(
  W: number,
  H: number,
  baseY: number,
  peakY: number,
  n: number
): string {
  let d = `M0 ${baseY.toFixed(1)}`;
  const seg = W / n;
  for (let i = 0; i < n; i++) {
    const xMid = i * seg + seg / 2;
    const x1 = (i + 1) * seg;
    const py = peakY + (i % 3) * (baseY - peakY) * 0.24;
    d += ` Q ${xMid.toFixed(1)} ${py.toFixed(1)} ${x1.toFixed(1)} ${baseY.toFixed(1)}`;
  }
  return d + ` L ${W.toFixed(1)} ${H.toFixed(1)} L 0 ${H.toFixed(1)} Z`;
}
export function hillPath(
  W: number,
  H: number,
  topY: number,
  amp: number,
  waves: number
): string {
  let d = `M0 ${topY.toFixed(1)}`;
  const seg = W / waves;
  for (let i = 0; i < waves; i++) {
    const xMid = i * seg + seg / 2;
    const x1 = (i + 1) * seg;
    const cy = topY + (i % 2 === 0 ? -amp : amp);
    d += ` Q ${xMid.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${topY.toFixed(1)}`;
  }
  return d + ` L ${W.toFixed(1)} ${H.toFixed(1)} L 0 ${H.toFixed(1)} Z`;
}
export function bandPath(
  W: number,
  topY: number,
  botY: number,
  amp: number,
  waves: number
): string {
  const seg = W / waves;
  let d = `M0 ${topY.toFixed(1)}`;
  for (let i = 0; i < waves; i++) {
    const xm = i * seg + seg / 2;
    const x1 = (i + 1) * seg;
    d += ` Q ${xm.toFixed(1)} ${(topY + (i % 2 ? amp : -amp)).toFixed(1)} ${x1.toFixed(
      1
    )} ${topY.toFixed(1)}`;
  }
  d += ` L ${W.toFixed(1)} ${botY.toFixed(1)}`;
  for (let i = waves; i > 0; i--) {
    const xm = (i - 1) * seg + seg / 2;
    const x0 = (i - 1) * seg;
    d += ` Q ${xm.toFixed(1)} ${(botY + (i % 2 ? -amp : amp)).toFixed(1)} ${x0.toFixed(
      1
    )} ${botY.toFixed(1)}`;
  }
  return d + " Z";
}
export function MiniTree({
  x,
  y,
  h,
  c,
}: {
  x: number;
  y: number;
  h: number;
  c: string;
}) {
  return (
    <path
      d={`M${x} ${y - h} L${x + h * 0.5} ${y} L${x - h * 0.5} ${y} Z`}
      fill={c}
    />
  );
}
export function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g opacity={0.92}>
      <ellipse cx={x} cy={y} rx={26 * s} ry={11 * s} fill="#fff" />
      <ellipse cx={x + 18 * s} cy={y + 2 * s} rx={16 * s} ry={9 * s} fill="#fff" />
      <ellipse cx={x - 18 * s} cy={y + 3 * s} rx={14 * s} ry={8 * s} fill="#fff" />
    </g>
  );
}

/** 깊이별 식물 스케일 (yf 클수록=앞일수록 큼) */
export const plantScale = (yf: number, m: number, sBase: number) =>
  (0.36 + ((Math.min(0.98, Math.max(0.56, yf)) - 0.58) / 0.38) * 0.7) * m * sBase;
