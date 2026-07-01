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

export type Render = (w: number, g?: number) => React.ReactNode;
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
function Daisy(w: number, g = 1) {
  const lf = wiltC("#4FB257", w);
  const st = wiltC("#3E9E48", w);
  const pet = wiltC("#FFFFFF", w);
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
        [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <ellipse
            key={a}
            cx={50}
            cy={top}
            rx={3.4 * bloom}
            ry={8 * bloom}
            fill={pet}
            transform={`rotate(${a} 50 ${top.toFixed(1)}) translate(0 ${(
              -8 * bloom
            ).toFixed(1)})`}
          />
        ))}
      <circle cx={50} cy={top} r={2.4 + 3.2 * Math.max(bloom, 0.5 * g)} fill={ctr} />
    </g>
  );
}
function Tulip(w: number, g = 1) {
  const lf = wiltC("#3FA84F", w);
  const st = wiltC("#3E9E48", w);
  const top = 86 - (8 + 26 * g);
  const sH = 86 - top;
  const l1 = seg(g, 0.1, 0.55);
  const l2 = seg(g, 0.38, 0.9);
  const open = seg(g, 0.42, 1);
  const petBase = mix(
    mix("#86C566", "#FF9FB6", seg(g, 0.42, 0.7)),
    "#E0466A",
    seg(g, 0.7, 1)
  );
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
function Sunflower(w: number, g = 1) {
  const lf = wiltC("#4FB257", w);
  const st = wiltC("#3E9E48", w);
  const pet = wiltC("#FFC42E", w);
  const petDk = wiltC("#F0A21E", w);
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
        [18, 54, 90, 126, 162, 198, 234, 270, 306, 342].map((a) => (
          <ellipse
            key={`o${a}`}
            cx={50}
            cy={top}
            rx={3.4 * bloom}
            ry={7 * bloom}
            fill={petDk}
            transform={`rotate(${a} 50 ${top.toFixed(1)}) translate(0 ${(
              -11 * bloom
            ).toFixed(1)})`}
          />
        ))}
      {bloom > 0 &&
        [0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((a) => (
          <ellipse
            key={a}
            cx={50}
            cy={top}
            rx={4 * bloom}
            ry={8.5 * bloom}
            fill={pet}
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
function Rabbit(w: number, g = 1) {
  const c = wiltC("#ECE8E1", w);
  const s = 0.62 + 0.38 * g;
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
function Duck(w: number, g = 1) {
  const y = wiltC("#FBD24E", w);
  const s = 0.62 + 0.38 * g;
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
function DeerLike(w: number, g: number, isWhite: boolean) {
  const base = isWhite ? "#EDEAE3" : "#CC8E5E";
  const dkMix = isWhite ? "#A9A39A" : "#7A4F30";
  const spotBase = isWhite ? "#FCFBF8" : "#F3E4C8";
  const c = wiltC(base, w);
  const dk = mix(wiltC(base, w), dkMix, isWhite ? 0.5 : 0.45);
  const spot = wiltC(spotBase, w);
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
function Deer(w: number, g = 1) {
  return DeerLike(w, g, false);
}
function WhiteDeer(w: number, g = 1) {
  return DeerLike(w, g, true);
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
function CloudPlant(w: number) {
  const c = mix("#FFFFFF", "#C9D2D8", w * 0.4);
  return (
    <g>
      <ellipse cx={50} cy={55} rx={27} ry={12} fill={c} />
      <ellipse cx={35} cy={50} rx={15} ry={11} fill={c} />
      <ellipse cx={63} cy={49} rx={17} ry={12} fill={c} />
      <ellipse cx={50} cy={43} rx={16} ry={12} fill={c} />
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
