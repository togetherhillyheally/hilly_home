// 공유 카드 캔버스 공통 헬퍼 — ShareImagePanel / CheckpointCarouselPanel 공용

export const SHARE_ACCENT = "#DC2F55";
export const SHARE_ACCENT_MUTED = "#F9A8B6";
export const SHARE_FONT =
  '-apple-system, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", system-ui, sans-serif';

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/** 텍스트 줄바꿈 (캔버스 width 안에서 자동 wrap), maxLines 까지 표시 + 말줄임 */
export function wrapText(
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

export function roundRect(
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

/** cover 비율로 img 를 (dx,dy,dw,dh) 에 그리기 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const targetRatio = dw / dh;
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
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png", 1)
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function safeFileName(name: string, max = 40): string {
  return name.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, max);
}
