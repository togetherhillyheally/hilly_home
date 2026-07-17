"use client";

/**
 * 체크포인트 인스타그램 캐러셀 생성기.
 * 표지(전체 경로 + 번호 마커) 1장 + 체크포인트당 1장(확대 지도 + 강조 마커)을
 * 1080×1080 PNG 로 생성해 개별/zip 다운로드. 지도는 카메라 명시형 Mapbox Static —
 * 같은 카메라로 lat/lng 를 캔버스에 투영해 브랜드 마커를 직접 그린다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Images, Loader2, X } from "lucide-react";
import {
  buildTrailStaticUrlWithCamera,
  extractLine,
  fitCamera,
  projectToCanvas,
  type StaticCamera,
  type TrailSharePreview,
} from "@/lib/trail-preview";
import {
  SHARE_ACCENT as ACCENT,
  SHARE_ACCENT_MUTED as ACCENT_MUTED,
  SHARE_FONT,
  canvasToPngBlob,
  downloadBlob,
  drawImageCover,
  loadImage,
  roundRect,
  safeFileName,
  wrapText,
} from "@/lib/share-canvas";
import { buildZip, type ZipEntry } from "@/lib/zip-store";
import {
  CHECKPOINT_MARKER_ICONS,
  DEFAULT_MARKER_ICON,
  type MarkerIcon,
} from "@/lib/checkpoint-marker-icons";

export type CarouselCheckpoint = {
  id: string;
  sort_order: number;
  title: string;
  lng: number;
  lat: number;
  note: string | null;
  marker_icon: string | null;
  photo_url: string | null;
};

type Props = {
  trailName: string;
  seriesName: string | null;
  distanceKm: number | null;
  totalAscentM: number | null;
  coordinates: TrailSharePreview["coordinates"];
  checkpoints: CarouselCheckpoint[];
};

type Slide = { filename: string; blob: Blob; previewUrl: string; label: string };

const SIZE = 1080; // 캔버스 논리 크기 (1:1)
const MAP_LOGICAL = 800; // 정적 지도 요청 논리 px (@2x → 1600 실제)
const MARKER_BG = "#F4F4F5"; // 앱 체크포인트 마커와 동일한 밝은 원

function markerIconFor(name: string | null): MarkerIcon {
  return CHECKPOINT_MARKER_ICONS[name ?? ""] ?? DEFAULT_MARKER_ICON;
}

/** 앱 코스가이드와 동일 — 등록순 대신 경로 최근접점 인덱스 기준 "코스 진행방향" 정렬 */
function orderByRouteProgress(
  cps: CarouselCheckpoint[],
  coordinates: TrailSharePreview["coordinates"]
): CarouselCheckpoint[] {
  if (!Array.isArray(coordinates) || coordinates.length === 0 || cps.length < 2)
    return cps;
  const first = coordinates[0] as unknown;
  const isMulti = Array.isArray(first) && Array.isArray((first as unknown[])[0]);
  const path = (
    isMulti ? (coordinates as number[][][]).flat() : (coordinates as number[][])
  ).map((c) => [c[0], c[1]] as [number, number]);
  if (path.length === 0) return cps;
  return [...cps]
    .map((cp) => {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < path.length; i++) {
        const dx = path[i][0] - cp.lng;
        const dy = path[i][1] - cp.lat;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return { cp, i: best };
    })
    .sort((a, b) => a.i - b.i)
    .map((x) => x.cp);
}

/** 줄바꿈(\n)을 존중하는 wrap — 문단별로 wrap 후 maxLines 로 자름 */
function wrapParagraphs(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const paras = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lines: string[] = [];
  for (const para of paras) {
    const remain = maxLines - lines.length;
    if (remain <= 0) break;
    lines.push(...wrapText(ctx, para, maxWidth, remain));
  }
  // 문단이 더 남았는데 줄이 찼으면 말줄임 표시
  if (lines.length >= maxLines) {
    const joined = paras.join(" ");
    const shown = lines.join(" ");
    if (joined.length > shown.replace(/…$/, "").length && !lines[maxLines - 1].endsWith("…")) {
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + "…").width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = last + "…";
    }
  }
  return lines;
}

/** 앱과 같은 모양의 마커 — 밝은 원 + 등록 아이콘(색), 강조 시 아이콘 색으로 채움 + 흰 아이콘 */
function drawIconMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  mi: MarkerIcon,
  opts?: { emphasized?: boolean; badge?: string }
) {
  const emphasized = opts?.emphasized ?? false;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = emphasized ? mi.color : MARKER_BG;
  ctx.fill();
  ctx.lineWidth = Math.max(2.5, r * 0.14);
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // 아이콘 (lucide 24×24 stroke path)
  const iconBox = r * 1.2;
  const scale = iconBox / 24;
  ctx.save();
  ctx.translate(x - iconBox / 2, y - iconBox / 2);
  ctx.scale(scale, scale);
  ctx.strokeStyle = emphasized ? "#ffffff" : mi.color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = "transparent";
  for (const d of mi.paths) ctx.stroke(new Path2D(d));
  ctx.restore();

  // 순번 배지 (표지용)
  if (opts?.badge) {
    const br = Math.max(9, r * 0.52);
    const bx = x + r * 0.74;
    const by = y - r * 0.74;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = "#1B222C";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${Math.round(br * 1.05)}px ${SHARE_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.badge, bx, by + br * 0.06);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
}

export default function CheckpointCarouselButton(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-gray-200 text-sm font-medium transition-colors"
      >
        <Images className="h-4 w-4" />
        인스타 캐러셀
      </button>
      {open ? <CarouselModal {...props} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function CarouselModal({
  trailName,
  seriesName,
  distanceKm,
  totalAscentM,
  coordinates,
  checkpoints: checkpointsProp,
  onClose,
}: Props & { onClose: () => void }) {
  // 앱 코스가이드처럼 등록순이 아닌 코스 진행방향 순서
  const checkpoints = useMemo(
    () => orderByRouteProgress(checkpointsProp, coordinates),
    [checkpointsProp, coordinates]
  );
  const [slides, setSlides] = useState<Slide[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const slidesRef = useRef<Slide[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 생성 (모달 열릴 때 1회)
  useEffect(() => {
    let cancelled = false;
    const total = checkpoints.length + 2; // 표지 + 체크포인트 N + 아웃트로(로고)
    setProgress({ done: 0, total });
    setError(null);

    (async () => {
      try {
        const logo = await loadImage("/images/home_logo.png").catch(() => null);
        const routePts = extractLine(coordinates);
        const allPts: [number, number][] = [
          ...routePts,
          ...checkpoints.map((c) => [c.lng, c.lat] as [number, number]),
        ];
        const coverCam = fitCamera(allPts, MAP_LOGICAL, MAP_LOGICAL, 78);
        if (!coverCam) throw new Error("경로/체크포인트 좌표가 없습니다.");

        const out: Slide[] = [];
        const push = (blob: Blob, filename: string, label: string) => {
          out.push({
            blob,
            filename,
            label,
            previewUrl: URL.createObjectURL(blob),
          });
          if (!cancelled) {
            setProgress({ done: out.length, total });
            setSlides([...out]);
            slidesRef.current = [...out];
          }
        };

        // 1) 표지
        {
          const url = buildTrailStaticUrlWithCamera(coordinates, {
            width: MAP_LOGICAL,
            height: MAP_LOGICAL,
            camera: coverCam,
          });
          const mapImg = url ? await loadImage(url) : null;
          if (cancelled) return;
          const blob = await renderSlide({
            mapImg,
            logo,
            camera: coverCam,
            markers: checkpoints.map((c, i) => ({
              lng: c.lng,
              lat: c.lat,
              icon: markerIconFor(c.marker_icon),
              badge: String(i + 1),
              emphasized: false,
            })),
            kicker: `코스 지도 · 체크포인트 ${checkpoints.length}곳`,
            title: trailName,
            subtitle: [
              seriesName || null,
              distanceKm != null ? `${Number(distanceKm).toFixed(1)}km` : null,
              totalAscentM != null ? `↑${Math.round(totalAscentM)}m` : null,
            ]
              .filter(Boolean)
              .join("   "),
            note: null,
          });
          if (!blob) throw new Error("표지 생성 실패");
          push(blob, "01_cover.png", "표지");
        }

        // 2) 체크포인트 슬라이드 — 등록 사진 우선, 없으면 확대 지도
        for (let i = 0; i < checkpoints.length; i++) {
          if (cancelled) return;
          const cp = checkpoints[i];
          const zoom = Math.min(Math.max(13.5, coverCam.zoom + 1.2), 15.5);
          const cam: StaticCamera = {
            centerLng: cp.lng,
            centerLat: cp.lat,
            zoom,
          };
          const photoImg = cp.photo_url
            ? await loadImage(cp.photo_url).catch(() => null)
            : null;
          if (cancelled) return;
          let mapImg: HTMLImageElement | null = null;
          if (!photoImg) {
            const url = buildTrailStaticUrlWithCamera(coordinates, {
              width: MAP_LOGICAL,
              height: MAP_LOGICAL,
              camera: cam,
            });
            mapImg = url ? await loadImage(url).catch(() => null) : null;
            if (cancelled) return;
          }
          const blob = await renderSlide({
            mapImg,
            photoImg,
            // 로고는 표지·아웃트로에만 — 슬라이드는 사진/설명 공간 확보
            logo: null,
            camera: cam,
            markers: checkpoints.map((c, j) => ({
              lng: c.lng,
              lat: c.lat,
              icon: markerIconFor(c.marker_icon),
              emphasized: j === i,
            })),
            kicker: `CHECKPOINT ${String(i + 1).padStart(2, "0")} / ${String(checkpoints.length).padStart(2, "0")}`,
            title: cp.title,
            compactTitle: true,
            // 지도이름·거리는 표지에 이미 있어 체크포인트 장에선 생략
            subtitle: "",
            note: cp.note?.trim() || null,
          });
          if (!blob) throw new Error(`슬라이드 생성 실패: ${cp.title}`);
          push(
            blob,
            `${String(i + 2).padStart(2, "0")}_${safeFileName(cp.title, 30) || "checkpoint"}.png`,
            `${i + 1}. ${cp.title}`
          );
        }

        // 3) 아웃트로 — 로고 단독 (브랜딩 마무리 장)
        {
          const blob = await renderOutro(logo);
          if (blob) {
            push(
              blob,
              `${String(checkpoints.length + 2).padStart(2, "0")}_outro.png`,
              "아웃트로 (로고)"
            );
          }
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "이미지 생성 실패");
      } finally {
        if (!cancelled) setProgress(null);
      }
    })();

    return () => {
      cancelled = true;
      slidesRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 아웃트로 — 다크 배경 + 로고 단독 (캐러셀 마무리 브랜딩 장) */
  async function renderOutro(
    logo: HTMLImageElement | null
  ): Promise<Blob | null> {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const W = SIZE;
    const H = SIZE;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#10151D");
    bg.addColorStop(0.55, "#0A0D12");
    bg.addColorStop(1, "#000000");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // 중앙 브랜드 글로우
    const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.5);
    glow.addColorStop(0, "rgba(220,47,85,0.20)");
    glow.addColorStop(1, "rgba(220,47,85,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    if (logo) {
      const logoH = Math.round(H * 0.13);
      const logoW = Math.round((logo.naturalWidth / logo.naturalHeight) * logoH);
      ctx.drawImage(logo, (W - logoW) / 2, Math.round(H / 2 - logoH / 2) - 30, logoW, logoH);
    }
    ctx.font = `600 ${Math.round(W * 0.026)}px ${SHARE_FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.textAlign = "center";
    ctx.fillText("hillyheally.com", W / 2, Math.round(H / 2) + Math.round(H * 0.13));
    ctx.textAlign = "start";

    return canvasToPngBlob(canvas);
  }

  /** 슬라이드 1장 캔버스 렌더 → PNG Blob */
  async function renderSlide(opts: {
    mapImg: HTMLImageElement | null;
    /** 체크포인트 등록 사진 — 있으면 지도 대신 이걸 메인 비주얼로 */
    photoImg?: HTMLImageElement | null;
    logo: HTMLImageElement | null;
    camera: StaticCamera;
    markers: {
      lng: number;
      lat: number;
      icon: MarkerIcon;
      badge?: string;
      emphasized: boolean;
    }[];
    kicker: string;
    title: string;
    /** true 면 제목을 작게 (체크포인트 장 — 설명 줄을 더 확보) */
    compactTitle?: boolean;
    subtitle: string;
    note: string | null;
  }): Promise<Blob | null> {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const W = SIZE;
    const H = SIZE;

    // 배경 (ShareImagePanel 과 동일 톤)
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#10151D");
    bg.addColorStop(0.55, "#0A0D12");
    bg.addColorStop(1, "#000000");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, H * 0.55);
    glow.addColorStop(0, "rgba(220,47,85,0.22)");
    glow.addColorStop(1, "rgba(220,47,85,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const cardW = Math.round(W * 0.82);
    const cardX = (W - cardW) / 2;
    const bodyPad = Math.round(cardW * 0.06);
    const fontBase = Math.round(cardW * 0.045);
    const lineH = Math.round(fontBase * 1.4);
    const nameSize = Math.round(fontBase * (opts.compactTitle ? 1.12 : 1.45));

    ctx.font = `${Math.round(fontBase * 0.88)}px ${SHARE_FONT}`;
    const noteLines = opts.note
      ? wrapParagraphs(ctx, opts.note, cardW - bodyPad * 2, 3)
      : [];

    const bodyParts = [
      Math.round(fontBase * 1.2), // kicker
      6,
      Math.round(nameSize * 1.15), // title
      16,
      6, // divider
      16,
      opts.subtitle ? Math.round(fontBase * 1.15) : 0,
      opts.subtitle ? 4 : 0,
      noteLines.length * lineH,
    ];
    const bodyH = bodyParts.reduce((a, b) => a + b, 0) + bodyPad * 2;
    // 카드가 캔버스를 넘지 않게 미디어(사진/지도) 높이를 줄여 맞춤 — 텍스트/하단 로고 잘림 방지
    const TOP_MARGIN = 26;
    // 로고는 표지에만 — 없으면 그 공간만큼 사진/본문에 양보
    const LOGO_AREA = opts.logo ? Math.round(H * 0.055) + 44 : 30;
    const mapH = Math.max(
      Math.round(cardW * 0.45),
      Math.min(cardW, H - TOP_MARGIN - LOGO_AREA - 8 - bodyH)
    );
    const cardH = 8 + mapH + bodyH;
    const cardY = Math.max(TOP_MARGIN, Math.round((H - LOGO_AREA - cardH) / 2));

    // 카드 그림자 + 보더
    ctx.save();
    ctx.shadowColor = "rgba(220,47,85,0.28)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = "#0F141A";
    const r = Math.round(cardW * 0.05);
    roundRect(ctx, cardX, cardY, cardW, cardH, r);
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    roundRect(ctx, cardX, cardY, cardW, cardH, r);
    ctx.stroke();

    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, r);
    ctx.clip();
    ctx.fillStyle = ACCENT;
    ctx.fillRect(cardX, cardY, cardW, 8);

    // 메인 비주얼 — 사진 우선, 없으면 지도
    const imgY = cardY + 8;
    if (opts.photoImg) {
      drawImageCover(ctx, opts.photoImg, cardX, imgY, cardW, mapH);
    } else if (opts.mapImg) {
      drawImageCover(ctx, opts.mapImg, cardX, imgY, cardW, mapH);
    } else {
      ctx.fillStyle = "#0D1117";
      ctx.fillRect(cardX, imgY, cardW, mapH);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `${fontBase}px ${SHARE_FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("지도 미리보기", cardX + cardW / 2, imgY + mapH / 2);
      ctx.textAlign = "start";
    }

    // 마커 — 지도일 때만 (같은 카메라로 투영. cover-fit 세로 크롭 보정)
    if (!opts.photoImg && opts.mapImg) {
      const scale = cardW / MAP_LOGICAL;
      const cropTop = (MAP_LOGICAL - MAP_LOGICAL * (mapH / cardW)) / 2;
      const emphasized = opts.markers.filter((m) => m.emphasized);
      const normal = opts.markers.filter((m) => !m.emphasized);
      for (const m of [...normal, ...emphasized]) {
        const p = projectToCanvas(m.lng, m.lat, opts.camera, MAP_LOGICAL, MAP_LOGICAL);
        const x = cardX + p.x * scale;
        const y = imgY + (p.y - cropTop) * scale;
        const rr = m.emphasized ? 27 : emphasized.length > 0 ? 15 : 18;
        // 지도 영역 밖(여백 포함)이면 스킵
        if (x < cardX - rr || x > cardX + cardW + rr || y < imgY - rr || y > imgY + mapH + rr)
          continue;
        drawIconMarker(ctx, x, y, rr, m.icon, {
          emphasized: m.emphasized,
          badge: m.badge,
        });
      }
    }

    // 지도 하단 페이드
    const fade = ctx.createLinearGradient(0, imgY + mapH - 80, 0, imgY + mapH);
    fade.addColorStop(0, "rgba(15,20,26,0)");
    fade.addColorStop(1, "rgba(15,20,26,0.92)");
    ctx.fillStyle = fade;
    ctx.fillRect(cardX, imgY + mapH - 80, cardW, 80);

    // 바디
    const bodyTop = imgY + mapH;
    const bodyGrad = ctx.createLinearGradient(0, bodyTop, 0, bodyTop + bodyH);
    bodyGrad.addColorStop(0, "#1B222C");
    bodyGrad.addColorStop(1, "#0F141A");
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(cardX, bodyTop, cardW, bodyH);

    let cursorY = bodyTop + bodyPad;
    ctx.textBaseline = "top";
    ctx.font = `800 ${Math.round(fontBase * 0.7)}px ${SHARE_FONT}`;
    ctx.fillStyle = ACCENT_MUTED;
    ctx.fillText(opts.kicker, cardX + bodyPad, cursorY);
    cursorY += Math.round(fontBase * 1.2) + 6;

    ctx.font = `800 ${nameSize}px ${SHARE_FONT}`;
    ctx.fillStyle = "#ffffff";
    const titleLines = wrapText(ctx, opts.title, cardW - bodyPad * 2, 1);
    if (titleLines[0]) ctx.fillText(titleLines[0], cardX + bodyPad, cursorY);
    cursorY += Math.round(nameSize * 1.15) + 18;

    ctx.fillStyle = ACCENT;
    ctx.fillRect(cardX + bodyPad, cursorY, Math.round(cardW * 0.12), 6);
    cursorY += 6 + 18;

    if (opts.subtitle) {
      ctx.font = `600 ${Math.round(fontBase * 0.85)}px ${SHARE_FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.fillText(opts.subtitle, cardX + bodyPad, cursorY);
      cursorY += Math.round(fontBase * 1.15) + 4;
    }

    if (noteLines.length > 0) {
      ctx.font = `${Math.round(fontBase * 0.88)}px ${SHARE_FONT}`;
      ctx.fillStyle = ACCENT_MUTED;
      for (const ln of noteLines) {
        ctx.fillText(ln, cardX + bodyPad, cursorY);
        cursorY += lineH;
      }
    }
    ctx.restore();

    // 로고
    if (opts.logo) {
      const logo = opts.logo;
      const logoH = Math.round(H * 0.055);
      const logoW = Math.round((logo.naturalWidth / logo.naturalHeight) * logoH);
      const logoY = Math.round(cardY + cardH + (H - cardY - cardH) / 2 - logoH / 2);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(logo, (W - logoW) / 2, logoY, logoW, logoH);
      ctx.globalAlpha = 1;
    }

    return canvasToPngBlob(canvas);
  }

  const handleZip = async () => {
    if (slides.length === 0) return;
    setZipping(true);
    try {
      const entries: ZipEntry[] = [];
      for (const s of slides) {
        entries.push({
          name: s.filename,
          data: new Uint8Array(await s.blob.arrayBuffer()),
        });
      }
      downloadBlob(buildZip(entries), `${safeFileName(trailName)}_instagram.zip`);
    } finally {
      setZipping(false);
    }
  };

  const generating = progress != null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 lg:p-8">
      <div className="bg-[#0f0f17] rounded-2xl border border-white/10 w-full max-w-5xl max-h-[92vh] overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[#0f0f17] z-10">
          <div className="flex items-center gap-2">
            <Images className="h-4 w-4 text-orange-400" />
            <h2 className="text-lg font-semibold text-white">
              인스타 캐러셀 — 표지 + 체크포인트 {checkpoints.length}장
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZip}
              disabled={generating || zipping || slides.length === 0}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-white/[0.06] disabled:text-gray-500 text-white text-sm font-semibold transition-colors"
            >
              {zipping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              전체 zip 다운로드
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-white/[0.08] text-gray-400 hover:text-white"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="p-6">
          {generating ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              생성 중… {progress.done} / {progress.total}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 mb-4">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {slides.map((s) => (
              <figure
                key={s.filename}
                className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.previewUrl}
                  alt={s.label}
                  className="w-full aspect-square object-cover"
                />
                <figcaption className="flex items-center justify-between gap-2 px-2.5 py-2">
                  <span className="text-[11px] text-gray-300 truncate">
                    {s.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadBlob(s.blob, s.filename)}
                    className="p-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white flex-shrink-0"
                    aria-label={`${s.label} 다운로드`}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </figcaption>
              </figure>
            ))}
            {generating &&
              Array.from({
                length: Math.max(0, progress.total - slides.length),
              }).map((_, i) => (
                <div
                  key={`ph-${i}`}
                  className="rounded-xl border border-white/5 bg-white/[0.02] aspect-square animate-pulse"
                />
              ))}
          </div>

          <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
            파일명 순서(01_cover → …)대로 업로드하면 캐러셀 순서가 맞습니다 ·
            인스타그램 캐러셀은 최대 20장 · 지도 저작권 표기(© Mapbox © OpenStreetMap)는
            지도 이미지에 포함되어 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
