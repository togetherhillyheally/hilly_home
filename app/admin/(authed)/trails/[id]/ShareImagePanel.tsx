"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  ImageIcon,
  Loader2,
  Smartphone,
  Square,
  X,
} from "lucide-react";
import { buildTrailMapboxStaticUrl, type TrailSharePreview } from "@/lib/trail-preview";

type Format = "story" | "post";

type Props = {
  open: boolean;
  onClose: () => void;
  trailId: string;
  trailName: string;
  seriesName: string | null;
  courseSummary: string | null;
  distanceKm: number | null;
  totalAscentM: number | null;
  mapType: "adventure" | "stamp";
  coordinates: TrailSharePreview["coordinates"];
};

const FORMAT_SPECS: Record<
  Format,
  { width: number; height: number; label: string }
> = {
  story: { width: 1080, height: 1920, label: "스토리 9:16" },
  post: { width: 1080, height: 1080, label: "게시물 1:1" },
};

const ACCENT = "#DC2F55";
const ACCENT_MUTED = "#F9A8B6";
const PREVIEW_MAX_HEIGHT = 480;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/** 텍스트 줄바꿈 (캔버스 width 안에서 자동 wrap), maxLines 까지 표시 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  if (!text) return [];
  const chars = Array.from(text);
  const lines: string[] = [];
  let cur = "";
  for (const ch of chars) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = ch;
      if (lines.length >= maxLines) break;
    } else {
      cur = test;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines) {
    // ellipsis 처리
    const last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth - 20) {
      let truncated = last;
      while (
        truncated.length > 1 &&
        ctx.measureText(truncated + "…").width > maxWidth
      ) {
        truncated = truncated.slice(0, -1);
      }
      lines[maxLines - 1] = truncated + "…";
    }
  }
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function ShareImagePanel({
  open,
  onClose,
  trailId,
  trailName,
  seriesName,
  courseSummary,
  distanceKm,
  totalAscentM,
  mapType,
  coordinates,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [format, setFormat] = useState<Format>("story");
  const [message, setMessage] = useState("");
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapImgRef = useRef<HTMLImageElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  // 모달 열릴 때 ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 자산 미리 로드 (한 번만)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setDrawing(true);

    const mapUrl = buildTrailMapboxStaticUrl(coordinates, {
      width: 800,
      height: 800,
      padding: 56,
    });

    (async () => {
      try {
        const [mapImg, logoImg] = await Promise.all([
          mapUrl ? loadImage(mapUrl) : Promise.resolve(null),
          loadImage("/images/home_logo.png").catch(() => null),
        ]);
        if (cancelled) return;
        mapImgRef.current = mapImg;
        logoImgRef.current = logoImg;
        draw();
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "이미지 로드 실패");
      } finally {
        if (!cancelled) setDrawing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, coordinates]);

  // 포맷·메시지 변경 시 다시 그림
  useEffect(() => {
    if (!open) return;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, message, open, trailName, seriesName, courseSummary]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width: W, height: H } = FORMAT_SPECS[format];
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1) 배경 그라데이션 (어두운 톤 + 상단 글로우)
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#10151D");
    bg.addColorStop(0.55, "#0A0D12");
    bg.addColorStop(1, "#000000");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 상단 브랜드 글로우
    const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, H * 0.55);
    glow.addColorStop(0, "rgba(220,47,85,0.22)");
    glow.addColorStop(1, "rgba(220,47,85,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // 2) 카드 영역 계산
    const isStory = format === "story";
    const cardW = isStory ? Math.round(W * 0.82) : Math.round(W * 0.82);
    const cardX = (W - cardW) / 2;
    const mapH = cardW; // 정사각형 이미지
    const bodyPad = Math.round(cardW * 0.06);
    const fontBase = Math.round(cardW * 0.045);

    // 메타·요약 줄 수 계산 (가변 카드 높이)
    ctx.font = `${Math.round(fontBase * 0.95)}px -apple-system, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", system-ui, sans-serif`;
    const subtitle = [
      seriesName || null,
      distanceKm != null ? `${Number(distanceKm).toFixed(1)}km` : null,
      totalAscentM != null ? `↑${Math.round(totalAscentM)}m` : null,
    ]
      .filter(Boolean)
      .join("   ");

    const courseLines = courseSummary
      ? wrapText(
          ctx,
          courseSummary,
          cardW - bodyPad * 2,
          isStory ? 4 : 3
        )
      : [];
    const messageTrim = message.trim();
    const hasMessage = messageTrim.length > 0;

    // 카드 바디 영역 높이 (kicker + name + divider + subtitle + course + message)
    const lineH = Math.round(fontBase * 1.4);
    const nameSize = Math.round(fontBase * 1.55);
    const bodyParts = [
      Math.round(fontBase * 1.2), // kicker row
      6, // gap
      Math.round(nameSize * 1.15), // trail name (1줄)
      18, // gap before divider
      6, // divider
      18, // gap after divider
      subtitle ? Math.round(fontBase * 1.15) : 0,
      subtitle ? 4 : 0,
      courseLines.length * lineH,
      hasMessage ? 14 : 0,
      hasMessage ? Math.round(fontBase * 1.25) : 0,
    ];
    const bodyH = bodyParts.reduce((a, b) => a + b, 0) + bodyPad * 2;
    const cardH = mapH + bodyH;

    // 스토리는 카드 위·아래에 여유, 정사각은 거의 화면 가득
    const cardY = isStory
      ? Math.round((H - cardH) / 2 - H * 0.04)
      : Math.round((H - cardH) / 2);

    // 3) 카드 그림자 (간단 처리)
    ctx.save();
    ctx.shadowColor = "rgba(220,47,85,0.28)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = "#0F141A";
    const r = Math.round(cardW * 0.05);
    roundRect(ctx, cardX, cardY, cardW, cardH, r);
    ctx.fill();
    ctx.restore();

    // 카드 보더
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    roundRect(ctx, cardX, cardY, cardW, cardH, r);
    ctx.stroke();

    // 4) 카드 클리핑 + 액센트 바
    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, r);
    ctx.clip();

    ctx.fillStyle = ACCENT;
    ctx.fillRect(cardX, cardY, cardW, 8);

    // 5) 지도 이미지 (또는 폴백)
    const imgY = cardY + 8;
    if (mapImgRef.current) {
      const img = mapImgRef.current;
      // cover 비율
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const targetRatio = cardW / mapH;
      const imgRatio = iw / ih;
      let sx = 0,
        sy = 0,
        sw = iw,
        sh = ih;
      if (imgRatio > targetRatio) {
        sw = ih * targetRatio;
        sx = (iw - sw) / 2;
      } else {
        sh = iw / targetRatio;
        sy = (ih - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, cardX, imgY, cardW, mapH);
    } else {
      ctx.fillStyle = "#0D1117";
      ctx.fillRect(cardX, imgY, cardW, mapH);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `${fontBase}px -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("지도 미리보기", cardX + cardW / 2, imgY + mapH / 2);
      ctx.textAlign = "start";
    }

    // 이미지 하단 페이드 — 바디와 연결
    const fade = ctx.createLinearGradient(0, imgY + mapH - 80, 0, imgY + mapH);
    fade.addColorStop(0, "rgba(15,20,26,0)");
    fade.addColorStop(1, "rgba(15,20,26,0.92)");
    ctx.fillStyle = fade;
    ctx.fillRect(cardX, imgY + mapH - 80, cardW, 80);

    // 6) 카드 바디
    const bodyTop = imgY + mapH;
    const bodyGrad = ctx.createLinearGradient(0, bodyTop, 0, bodyTop + bodyH);
    bodyGrad.addColorStop(0, "#1B222C");
    bodyGrad.addColorStop(1, "#0F141A");
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(cardX, bodyTop, cardW, bodyH);

    // 6-1) Kicker (스탬프/코스 지도)
    let cursorY = bodyTop + bodyPad;
    ctx.font = `800 ${Math.round(fontBase * 0.7)}px -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif`;
    ctx.fillStyle = ACCENT_MUTED;
    ctx.textBaseline = "top";
    const kicker = (mapType === "stamp" ? "스탬프 지도" : "코스 지도").toUpperCase();
    ctx.fillText(kicker, cardX + bodyPad, cursorY);
    cursorY += Math.round(fontBase * 1.2) + 6;

    // 6-2) 지도 이름
    ctx.font = `800 ${nameSize}px -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif`;
    ctx.fillStyle = "#ffffff";
    const nameLines = wrapText(ctx, trailName, cardW - bodyPad * 2, 1);
    if (nameLines[0]) {
      ctx.fillText(nameLines[0], cardX + bodyPad, cursorY);
    }
    cursorY += Math.round(nameSize * 1.15) + 18;

    // 6-3) Divider
    ctx.fillStyle = ACCENT;
    ctx.fillRect(cardX + bodyPad, cursorY, Math.round(cardW * 0.12), 6);
    cursorY += 6 + 18;

    // 6-4) Subtitle
    if (subtitle) {
      ctx.font = `600 ${Math.round(fontBase * 0.85)}px -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.fillText(subtitle, cardX + bodyPad, cursorY);
      cursorY += Math.round(fontBase * 1.15) + 4;
    }

    // 6-5) Course summary
    if (courseLines.length > 0) {
      ctx.font = `${Math.round(fontBase * 0.88)}px -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif`;
      ctx.fillStyle = ACCENT_MUTED;
      for (const ln of courseLines) {
        ctx.fillText(ln, cardX + bodyPad, cursorY);
        cursorY += lineH;
      }
    }

    // 6-6) 커스텀 메시지
    if (hasMessage) {
      cursorY += 14;
      ctx.font = `700 ${Math.round(fontBase * 0.95)}px -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif`;
      ctx.fillStyle = "#ffffff";
      const msgLines = wrapText(ctx, messageTrim, cardW - bodyPad * 2, 2);
      for (const ln of msgLines) {
        ctx.fillText(ln, cardX + bodyPad, cursorY);
        cursorY += Math.round(fontBase * 1.25);
      }
    }

    ctx.restore(); // 카드 클립 해제

    // 7) 로고 (카드 아래쪽)
    const logo = logoImgRef.current;
    if (logo) {
      const logoH = isStory ? Math.round(H * 0.038) : Math.round(H * 0.055);
      const logoW = Math.round((logo.naturalWidth / logo.naturalHeight) * logoH);
      const logoY = isStory
        ? Math.round(H - logoH - H * 0.04)
        : Math.round(cardY + cardH + (H - cardY - cardH) / 2 - logoH / 2);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(logo, (W - logoW) / 2, logoY, logoW, logoH);
      ctx.globalAlpha = 1;
    }
  }

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png", 1)
    );
    if (!blob) {
      setError("이미지 생성 실패");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = trailName.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
    a.href = url;
    a.download = `${safeName}_${format === "story" ? "story" : "post"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 lg:p-8">
      <div className="bg-[#0f0f17] rounded-2xl border border-white/10 w-full max-w-5xl max-h-[92vh] overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-orange-400" />
            <h2 className="text-lg font-semibold text-white">
              공유 이미지 생성
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-gray-400 hover:text-white"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 p-6">
          {/* 미리보기 */}
          <div className="flex items-center justify-center bg-black/40 rounded-xl border border-white/5 p-4 min-h-[400px] relative">
            {drawing && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs gap-2 bg-black/60 z-10">
                <Loader2 className="h-4 w-4 animate-spin" /> 이미지 준비 중…
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="rounded-lg shadow-2xl"
              style={{
                maxHeight: PREVIEW_MAX_HEIGHT,
                width: "auto",
                height: "auto",
                maxWidth: "100%",
              }}
            />
          </div>

          {/* 컨트롤 */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2">포맷</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat("story")}
                  className={`h-20 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-colors ${
                    format === "story"
                      ? "bg-orange-500/15 border-orange-500/50 text-orange-200"
                      : "bg-white/[0.04] border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="h-5 w-5" />
                  <span className="text-xs font-medium">스토리 9:16</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("post")}
                  className={`h-20 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-colors ${
                    format === "post"
                      ? "bg-orange-500/15 border-orange-500/50 text-orange-200"
                      : "bg-white/[0.04] border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <Square className="h-5 w-5" />
                  <span className="text-xs font-medium">게시물 1:1</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1.5">
                {FORMAT_SPECS[format].width} × {FORMAT_SPECS[format].height}
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                메시지 (선택, 최대 30자)
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 30))}
                maxLength={30}
                placeholder="카드 하단 강조 문구"
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-orange-500/50"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                {message.length}/30
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={drawing}
              className="w-full h-11 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-white/[0.06] disabled:text-gray-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="h-4 w-4" />
              PNG 다운로드
            </button>

            <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 text-[11px] text-gray-400 leading-relaxed">
              인스타그램 업로드 후 캡션이나 스토리 링크 스티커에 아래 주소를 붙여주세요.
              <div className="mt-1.5 flex items-center gap-1.5">
                <code className="flex-1 font-mono text-[11px] text-gray-300 break-all bg-white/[0.04] px-2 py-1 rounded">
                  https://hillyheally.com/t/{trailId}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(`https://hillyheally.com/t/${trailId}`)
                      .catch(() => {});
                  }}
                  className="px-2 h-7 rounded bg-white/[0.06] hover:bg-white/[0.1] text-gray-200 text-[11px]"
                >
                  복사
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
