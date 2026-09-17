
import React, { useEffect, useRef, useState, useCallback } from 'react';

interface BlemishBrushOverlayProps {
  imageSrc: string;
  active: boolean;
  brushSize: number; // CSS px diameter
  maskDataUrl?: string;
  onMaskChange: (dataUrl: string | undefined) => void;
}

// A fixed drawing-buffer resolution (independent of the displayed CSS size) so strokes
// survive container resizes — only the canvas's on-screen size/position is recomputed
// on resize, never its pixel buffer, which would otherwise wipe existing marks.
const BUFFER_LONG_SIDE = 900;

const BRUSH_COLOR = 'rgba(255,64,64,0.55)';

// Mirrors CSS `object-fit: contain`: given a container box and the image's natural
// aspect ratio, returns the rect (in the container's own coordinate space) the image
// actually occupies, so the brush canvas can be placed and scaled to match it exactly.
const getContainedRect = (containerW: number, containerH: number, naturalW: number, naturalH: number) => {
  if (!containerW || !containerH || !naturalW || !naturalH) return { left: 0, top: 0, width: containerW, height: containerH };
  const containerAspect = containerW / containerH;
  const imageAspect = naturalW / naturalH;
  let width: number, height: number;
  if (imageAspect > containerAspect) {
    width = containerW;
    height = containerW / imageAspect;
  } else {
    height = containerH;
    width = containerH * imageAspect;
  }
  return { left: (containerW - width) / 2, top: (containerH - height) / 2, width, height };
};

const BlemishBrushOverlay: React.FC<BlemishBrushOverlayProps> = ({ imageSrc, active, brushSize, maskDataUrl, onMaskChange }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasStrokesRef = useRef(!!maskDataUrl);
  const [rect, setRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [buffer, setBuffer] = useState({ width: BUFFER_LONG_SIDE, height: BUFFER_LONG_SIDE });

  // Recompute the contained rect whenever the wrapper resizes or the source image loads.
  useEffect(() => {
    let natural = { w: 0, h: 0 };
    const img = new Image();
    img.onload = () => {
      natural = { w: img.naturalWidth, h: img.naturalHeight };
      const longSide = Math.max(natural.w, natural.h) || 1;
      const scale = BUFFER_LONG_SIDE / longSide;
      setBuffer({ width: Math.max(1, Math.round(natural.w * scale)), height: Math.max(1, Math.round(natural.h * scale)) });
      updateRect();
    };
    img.src = imageSrc;

    const updateRect = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper || !natural.w || !natural.h) return;
      setRect(getContainedRect(wrapper.clientWidth, wrapper.clientHeight, natural.w, natural.h));
    };

    const ro = new ResizeObserver(updateRect);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  // Load any previously-saved mask into the canvas buffer so old + new strokes combine,
  // and reset the buffer (blank) when the mask was cleared elsewhere (e.g. size change).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokesRef.current = !!maskDataUrl;
    if (maskDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = maskDataUrl;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer.width, buffer.height]);

  const getLocalPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const box = canvas.getBoundingClientRect();
    const scaleX = canvas.width / box.width;
    const scaleY = canvas.height / box.height;
    return { x: (clientX - box.left) * scaleX, y: (clientY - box.top) * scaleY };
  }, []);

  const drawDot = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = BRUSH_COLOR;
    ctx.fill();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = getLocalPoint(e.clientX, e.clientY);
    const scaleX = canvas.width / canvas.getBoundingClientRect().width;
    const radius = (brushSize / 2) * scaleX;
    drawDot(ctx, p.x, p.y, radius);
    lastPointRef.current = p;
    isDrawingRef.current = true;
    hasStrokesRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active || !isDrawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const p = getLocalPoint(e.clientX, e.clientY);
    const scaleX = canvas.width / canvas.getBoundingClientRect().width;
    const radius = (brushSize / 2) * scaleX;
    const prev = lastPointRef.current || p;
    ctx.strokeStyle = BRUSH_COLOR;
    ctx.lineWidth = radius * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.stopPropagation();
    isDrawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) onMaskChange(canvas.toDataURL('image/png'));
  };

  return (
    <div ref={wrapperRef} className="absolute inset-0" style={{ zIndex: 25, pointerEvents: active ? 'auto' : 'none' }}>
      <canvas
        ref={canvasRef}
        width={buffer.width}
        height={buffer.height}
        style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height, touchAction: 'none', cursor: active ? 'crosshair' : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
      />
    </div>
  );
};

export default BlemishBrushOverlay;
