"use client";

/**
 * 체크포인트 인스타그램 캐러셀 생성기.
 * 표지(전체 경로 + 번호 마커) 1장 + 체크포인트당 1장(확대 지도 + 강조 마커)을
 * 1080×1080 PNG 로 생성해 개별/zip 다운로드. 지도는 카메라 명시형 Mapbox Static —
 * 같은 카메라로 lat/lng 를 캔버스에 투영해 브랜드 마커를 직접 그린다.
 */
import { useEffect, useRef, useState } from "react";
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
  checkpoints,
  onClose,
}: Props & { onClose: () => void }) {
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
    const total = checkpoints.length + 1;
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

        // 2) 체크포인트 슬라이드
        for (let i = 0; i < checkpoints.length; i++) {
          if (cancelled) return;
          const cp = checkpoints[i];
          const zoom = Math.min(Math.max(13.5, coverCam.zoom + 1.2), 15.5);
          const cam: StaticCamera = {
            centerLng: cp.lng,
            centerLat: cp.lat,
            zoom,
          };
          const url = buildTrailStaticUrlWithCamera(coordinates, {
            width: MAP_LOGICAL,
            height: MAP_LOGICAL,
            camera: cam,
          });
          const mapImg = url ? await loadImage(url).catch(() => null) : null;
          if (cancelled) return;
          const blob = await renderSlide({
            mapImg,
            logo,
            camera: cam,
            markers: checkpoints.map((c, j) => ({
              lng: c.lng,
              lat: c.lat,
              icon: markerIconFor(c.marker_icon),
              emphasized: j === i,
            })),
            kicker: `CHECKPOINT ${String(i + 1).padStart(2, "0")} / ${String(checkpoints.length).padStart(2, "0")}`,
            title: cp.title,
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

  /** 슬라이드 1장 캔버스 렌더 → PNG Blob */
  async function renderSlide(opts: {
    mapImg: HTMLImageElement | null;
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
    const mapH = cardW;
    const bodyPad = Math.round(cardW * 0.06);
    const fontBase = Math.round(cardW * 0.045);
    const lineH = Math.round(fontBase * 1.4);
    const nameSize = Math.round(fontBase * 1.45);

    ctx.font = `${Math.round(fontBase * 0.88)}px ${SHARE_FONT}`;
    const noteLines = opts.note
      ? wrapText(ctx, opts.note, cardW - bodyPad * 2, 3)
      : [];

    const bodyParts = [
      Math.round(fontBase * 1.2), // kicker
      6,
      Math.round(nameSize * 1.15), // title
      18,
      6, // divider
      18,
      opts.subtitle ? Math.round(fontBase * 1.15) : 0,
      opts.subtitle ? 4 : 0,
      noteLines.length * lineH,
    ];
    const bodyH = bodyParts.reduce((a, b) => a + b, 0) + bodyPad * 2;
    const cardH = mapH + bodyH;
    const cardY = Math.round((H - cardH) / 2);

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

    // 지도
    const imgY = cardY + 8;
    if (opts.mapImg) {
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

    // 마커 (같은 카메라로 투영; 정사각 이미지를 정사각으로 그리므로 스케일만 적용)
    const scale = cardW / MAP_LOGICAL;
    const emphasized = opts.markers.filter((m) => m.emphasized);
    const normal = opts.markers.filter((m) => !m.emphasized);
    for (const m of [...normal, ...emphasized]) {
      const p = projectToCanvas(m.lng, m.lat, opts.camera, MAP_LOGICAL, MAP_LOGICAL);
      const x = cardX + p.x * scale;
      const y = imgY + p.y * scale;
      const rr = m.emphasized ? 27 : emphasized.length > 0 ? 15 : 18;
      // 지도 영역 밖(여백 포함)이면 스킵
      if (x < cardX - rr || x > cardX + cardW + rr || y < imgY - rr || y > imgY + mapH + rr)
        continue;
      drawIconMarker(ctx, x, y, rr, m.icon, {
        emphasized: m.emphasized,
        badge: m.badge,
      });
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
