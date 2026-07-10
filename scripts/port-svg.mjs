#!/usr/bin/env node
/**
 * 정원 SVG 동기화 스크립트 — BO(garden-svgs.tsx) → RN(plantSvgs.tsx)
 *
 * BO 에서 만든 종 SVG 함수를 react-native-svg 형태로 변환해 RN 저장소에 반영한다.
 * 태그만 PascalCase 로 치환 (<path> → <Path>) — 좌표·수식·헬퍼 호출은 동일.
 *
 * 사용법:
 *   node scripts/port-svg.mjs --list              BO 의 이관 가능한 함수 목록
 *   node scripts/port-svg.mjs Fox Owl             변환 결과를 stdout 으로 (복붙용)
 *   node scripts/port-svg.mjs Fox --write         RN 파일에 직접 반영 (기존 함수 교체 or 신규 삽입 + PLANT_SVG 등록)
 *   node scripts/port-svg.mjs --check             양쪽 함수/맵 동기화 상태 리포트
 *
 * RN 저장소 경로: 기본 ../hilly_rn (BO 저장소 기준 형제 디렉토리).
 *   덮어쓰려면 --rn <path> 또는 env HILLY_RN.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BO_ROOT = path.resolve(__dirname, "..");
const BO_FILE = path.join(
  BO_ROOT,
  "app/admin/(authed)/users/[id]/garden-svgs.tsx"
);

// ── CLI 파싱 ──
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const rnFlagIdx = argv.indexOf("--rn");
const rnRootArg = rnFlagIdx >= 0 ? argv[rnFlagIdx + 1] : null;
const names = argv.filter(
  (a, i) => !a.startsWith("--") && !(rnFlagIdx >= 0 && i === rnFlagIdx + 1)
);

const RN_ROOT = path.resolve(
  rnRootArg ?? process.env.HILLY_RN ?? path.join(BO_ROOT, "..", "hilly_rn")
);
const RN_FILE = path.join(RN_ROOT, "components/garden/plantSvgs.tsx");

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(BO_FILE)) die(`BO 파일 없음: ${BO_FILE}`);
if (!fs.existsSync(RN_FILE))
  die(`RN 파일 없음: ${RN_FILE}\n  --rn <path> 또는 HILLY_RN 환경변수로 hilly_rn 경로를 지정하세요.`);

const boSrc = fs.readFileSync(BO_FILE, "utf8");
const rnSrc = fs.readFileSync(RN_FILE, "utf8");

/* ── 소스 스캐너: 문자열/템플릿/주석을 인지하며 중괄호 매칭 ── */
function findFunction(src, name) {
  const re = new RegExp(`(^|\\n)function ${name}\\s*\\(`, "m");
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index + m[1].length;
  // 함수 본문 시작 '{' 찾기 (파라미터 괄호 스킵)
  let i = src.indexOf("(", start);
  let paren = 0;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === "(") paren++;
    else if (ch === ")") {
      paren--;
      if (paren === 0) break;
    }
  }
  const bodyStart = src.indexOf("{", i);
  if (bodyStart < 0) return null;

  // 중괄호 매칭 — 문자열/템플릿/주석 상태 추적
  let depth = 0;
  let state = "code"; // code | s1 | s2 | tpl | line | block
  const tplExprStack = []; // 템플릿 내 ${} 중첩 깊이
  for (let j = bodyStart; j < src.length; j++) {
    const ch = src[j];
    const next = src[j + 1];
    if (state === "code") {
      if (ch === "'") state = "s1";
      else if (ch === '"') state = "s2";
      else if (ch === "`") state = "tpl";
      else if (ch === "/" && next === "/") state = "line";
      else if (ch === "/" && next === "*") state = "block";
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          return { start, end: j + 1, code: src.slice(start, j + 1) };
        }
        // 템플릿 표현식 안이었다면 복귀
        if (
          tplExprStack.length > 0 &&
          depth === tplExprStack[tplExprStack.length - 1]
        ) {
          tplExprStack.pop();
          state = "tpl";
        }
      }
    } else if (state === "s1") {
      if (ch === "\\") j++;
      else if (ch === "'") state = "code";
    } else if (state === "s2") {
      if (ch === "\\") j++;
      else if (ch === '"') state = "code";
    } else if (state === "tpl") {
      if (ch === "\\") j++;
      else if (ch === "`") state = "code";
      else if (ch === "$" && next === "{") {
        tplExprStack.push(depth);
        depth++;
        state = "code";
        j++; // '{' 소비
      }
    } else if (state === "line") {
      if (ch === "\n") state = "code";
    } else if (state === "block") {
      if (ch === "*" && next === "/") {
        state = "code";
        j++;
      }
    }
  }
  return null;
}

/* ── PLANT_SVG 맵 키 추출 ── */
function extractMapKeys(src) {
  const m = src.match(
    /export const PLANT_SVG[^=]*=\s*\{([\s\S]*?)\n\}/
  );
  if (!m) return [];
  return m[1]
    .split(/[,\n]/)
    .map((s) => s.replace(/\/\/.*$/, "").trim())
    .filter((s) => /^[A-Z][A-Za-z0-9]*$/.test(s));
}

/* ── BO(웹) → RN(react-native-svg) 변환 ── */
const TAG_MAP = {
  g: "G",
  path: "Path",
  circle: "Circle",
  ellipse: "Ellipse",
  rect: "Rect",
  line: "Line",
  polygon: "Polygon",
  polyline: "Polyline",
};

function convertToRn(code) {
  let out = code;
  // 태그 PascalCase 치환 (여는/닫는 태그 모두)
  out = out.replace(
    /<(\/?)(g|path|circle|ellipse|rect|line|polygon|polyline)(?=[\s/>])/g,
    (_, slash, tag) => `<${slash}${TAG_MAP[tag]}`
  );
  // 시그니처: RN 관례는 (w, g, _flying, front) — front 파라미터가 있는데 _flying 이 없으면 삽입
  out = out.replace(
    /^(function [A-Za-z0-9]+\s*\(w: number, g = 1), (front = false\))/m,
    "$1, _flying = false, $2"
  );
  return out;
}

/* ── 비교용 정규화: 태그 소문자화·주석/세미콜론/공백 제거·_flying 제거 ── */
function normalize(code) {
  let out = code;
  out = out.replace(/\/\*[\s\S]*?\*\//g, "");
  out = out.replace(/\/\/[^\n]*/g, "");
  // JSX 주석 {/* */} 제거 후 남는 빈 표현식 {} 정리
  out = out.replace(/\{\s*\}/g, "");
  out = out.replace(
    /<(\/?)(G|Path|Circle|Ellipse|Rect|Line|Polygon|Polyline)(?=[\s/>])/g,
    (_, slash, tag) => `<${slash}${tag.toLowerCase()}`
  );
  // 미사용 관례 파라미터 (_flying/_f/_fr) 는 노이즈로 취급
  out = out.replace(/,\s*_(?:flying|f|fr) = false/g, "");
  out = out.replace(/;/g, "");
  out = out.replace(/\s+/g, " ").trim();
  // JSX 표기 차이 무시: `&& ( <x/> )` ↔ `&& <x/>`, 멀티라인 attr 뒤 `} >` ↔ `}>`
  out = out.replace(/\( </g, "<").replace(/> \)/g, ">").replace(/\/> \)/g, "/>");
  out = out.replace(/ \/>/g, "/>").replace(/ >/g, ">");
  return out;
}

/* ── 명령: --list ── */
if (flags.has("--list")) {
  const keys = extractMapKeys(boSrc);
  console.log(`BO PLANT_SVG (${keys.length}개):`);
  const rnKeys = new Set(extractMapKeys(rnSrc));
  for (const k of keys) {
    console.log(`  ${rnKeys.has(k) ? "✓" : "✗ (RN 미등록)"}  ${k}`);
  }
  process.exit(0);
}

/* ── 명령: --check ── */
if (flags.has("--check")) {
  const boKeys = extractMapKeys(boSrc);
  const rnKeys = extractMapKeys(rnSrc);
  const rnSet = new Set(rnKeys);
  const boSet = new Set(boKeys);

  const missingInRn = boKeys.filter((k) => !rnSet.has(k));
  const rnOnly = rnKeys.filter((k) => !boSet.has(k));

  console.log("── PLANT_SVG 맵 ──");
  console.log(`BO ${boKeys.length}개 / RN ${rnKeys.length}개`);
  if (missingInRn.length)
    console.log(`✗ RN 미등록: ${missingInRn.join(", ")}`);
  if (rnOnly.length) console.log(`ℹ RN 전용: ${rnOnly.join(", ")}`);
  if (!missingInRn.length) console.log("✓ BO 의 모든 종이 RN 에 등록됨");

  // RN 쪽에만 있는 부가 기능(tint/flying/사슴 분리 구조) 때문에
  // 코드가 원래 다른 legacy 종 — 차이가 떠도 정상.
  const LEGACY = new Set([
    "Seed", "Sprout", "Daisy", "Tulip", "Sunflower", "Bush", "Mushroom",
    "Pine", "RoundTree", "TallTree", "BigPine", "HallasanTree", "Cactus",
    "Rabbit", "Duck", "Deer", "WhiteDeer", "Unicorn", "Cat", "Bird", "Frog",
    "Tent", "Flag", "Sign", "CloudPlant",
  ]);

  console.log("\n── 함수 본문 비교 (정규화 후) ──");
  let same = 0;
  const drift = []; // 진짜 문제 — 재이관 필요
  const legacyDiff = []; // 무시 가능
  for (const k of boKeys) {
    if (!rnSet.has(k)) continue;
    const bo = findFunction(boSrc, k);
    const rn = findFunction(rnSrc, k);
    if (!bo || !rn) {
      drift.push(`${k} (함수 추출 실패)`);
      continue;
    }
    if (normalize(bo.code) === normalize(rn.code)) same++;
    else if (LEGACY.has(k)) legacyDiff.push(k);
    else drift.push(k);
  }
  console.log(`✓ 동일: ${same}개`);
  if (legacyDiff.length)
    console.log(
      `ℹ legacy 차이 (무시 가능 — RN 에 tint/flying 등 부가 기능): ${legacyDiff.join(", ")}`
    );
  if (drift.length) {
    console.log(`✗ 드리프트 — 재이관 필요: ${drift.join(", ")}`);
    console.log(`  → npm run port-svg -- ${drift[0]} --write`);
    process.exit(1);
  }
  console.log("✓ 드리프트 없음 — 신규 종 전부 동기화됨");
  process.exit(0);
}

/* ── 명령: 이름들 변환 (기본 stdout, --write 시 RN 반영) ── */
if (names.length === 0) {
  console.log(
    "사용법: node scripts/port-svg.mjs <함수명...> [--write] | --list | --check"
  );
  process.exit(0);
}

const write = flags.has("--write");
let rnOut = rnSrc;
const registered = [];
const replaced = [];
const inserted = [];

for (const name of names) {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) die(`함수명이 이상해요: ${name}`);
  const bo = findFunction(boSrc, name);
  if (!bo) die(`BO 에서 함수를 찾을 수 없어요: ${name}`);
  const converted = convertToRn(bo.code);

  if (!write) {
    console.log(`\n// ── ${name} (BO → RN 변환) ──`);
    console.log(converted);
    continue;
  }

  const rnExisting = findFunction(rnOut, name);
  if (rnExisting) {
    rnOut =
      rnOut.slice(0, rnExisting.start) +
      converted +
      rnOut.slice(rnExisting.end);
    replaced.push(name);
  } else {
    // 신규 — PLANT_SVG 맵 정의 직전에 삽입
    const marker = rnOut.search(/\n\/\*\* svg_key\(garden_species/);
    const at = marker >= 0 ? marker : rnOut.search(/\nexport const PLANT_SVG/);
    if (at < 0) die("RN 파일에서 삽입 위치를 찾지 못했어요.");
    rnOut = rnOut.slice(0, at) + `\n${converted}\n` + rnOut.slice(at);
    inserted.push(name);
  }

  // PLANT_SVG 맵 등록
  if (!extractMapKeys(rnOut).includes(name)) {
    rnOut = rnOut.replace(
      /(export const PLANT_SVG[^=]*=\s*\{[\s\S]*?)(\n\})/,
      (_, body, close) => `${body}\n  ${name},${close}`
    );
    registered.push(name);
  }
}

if (write) {
  fs.writeFileSync(RN_FILE, rnOut);
  console.log(`✓ RN 반영 완료: ${RN_FILE}`);
  if (replaced.length) console.log(`  교체: ${replaced.join(", ")}`);
  if (inserted.length) console.log(`  신규 삽입: ${inserted.join(", ")}`);
  if (registered.length)
    console.log(`  PLANT_SVG 등록: ${registered.join(", ")}`);
  console.log("\n다음 단계: hilly_rn 에서 tsc/앱 확인 → OTA → BO 에서 공개");
}
