
import { InfoSettings } from '../types';

export interface DrawInfoBandOptions {
  canvasWidth: number;
  canvasHeight: number; // full photo height in px — must correspond to a 20x30 (30cm-tall) photo
  info: InfoSettings;
  infoBandHeightCm: number;
  transparentBackground: boolean;
  reserveIdentityRow: boolean; // true when a logo/shop-name/QR row will be drawn on top later
}

const PHOTO_HEIGHT_CM = 30; // 20x30 print photo height
const IDENTITY_ROW_HEIGHT_CM = 2; // fixed 20mm row reserved for logo/shop-name/QR

// Bakes the "Hiển thị thông tin" white band + text directly onto the finished photo
// canvas, once, at Hoàn tất (finish) time — the single source of truth for this
// layout, so the editor preview, the print sheet, and any later re-download of the
// saved photo (PhotoViewer) all agree pixel-for-pixel. Print/viewer code then only
// has to lay the logo + QR on top, inside the fixed bottom row this reserves —
// never re-derive the band's background or text, which is what let the two drift
// out of sync before.
export function drawInfoBand(ctx: CanvasRenderingContext2D, opts: DrawInfoBandOptions): void {
  const { canvasWidth, canvasHeight, info, infoBandHeightCm, transparentBackground, reserveIdentityRow } = opts;
  if (!info?.enabled || !info.text?.trim()) return;

  const pxPerCm = canvasHeight / PHOTO_HEIGHT_CM;
  const bandHeightPx = infoBandHeightCm * pxPerCm;
  const bandY = canvasHeight - bandHeightPx;
  const identityRowHeightPx = IDENTITY_ROW_HEIGHT_CM * pxPerCm;

  if (!transparentBackground) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, bandY, canvasWidth, bandHeightPx);
  }

  // Text and the (later, separately-drawn) identity row never share a row anymore,
  // so text is free to use the photo's full width instead of dodging logo/QR bounds.
  const paddingPx = 0.5 * pxPerCm;
  const textAreaBottom = (reserveIdentityRow && bandHeightPx > identityRowHeightPx)
    ? canvasHeight - identityRowHeightPx
    : canvasHeight;
  const centerY = (bandY + textAreaBottom) / 2;

  const fontSizePt = info.fontSize || 20;
  const fontSizePx = fontSizePt * pxPerCm * 0.0352;
  ctx.font = `bold ${fontSizePx}px sans-serif`;
  ctx.fillStyle = info.color || '#000000';
  ctx.textBaseline = 'middle';

  const lines = info.text.split('\n');
  const lineHeight = fontSizePx * 1.2;
  const totalTextHeight = lines.length * lineHeight;
  let currentTextY = centerY - totalTextHeight / 2 + lineHeight / 2;

  const alignment = info.alignment || 'center';
  const contentLeft = paddingPx;
  const contentRight = canvasWidth - paddingPx;
  const contentWidth = contentRight - contentLeft;

  lines.forEach(line => {
    let textX = contentLeft;
    if (alignment === 'center') { ctx.textAlign = 'center'; textX = contentLeft + contentWidth / 2; }
    else if (alignment === 'right') { ctx.textAlign = 'right'; textX = contentRight; }
    else { ctx.textAlign = 'left'; }
    ctx.fillText(line, textX, currentTextY, contentWidth);
    currentTextY += lineHeight;
  });
}
