
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PhotoSize } from '../types';

interface ManualCropperProps {
  imageSrc: string;
  photoSize: PhotoSize;
  onCancel: () => void;
  onConfirm: (croppedImage: string) => void;
}

/*
 * Photoshop-style crop tool.
 *
 * The photo stays put and a crop box with 8 handles is dragged over it:
 *  - drag a handle to resize (corners keep the ratio when a ratio is locked)
 *  - drag inside the box to move it, drag outside it to draw a new box
 *  - Shift = toggle ratio lock, Alt = resize from the centre
 *  - wheel / pinch = zoom the view, Space+drag / middle mouse = pan the view
 *  - "Straighten" slider and ±90° buttons rotate the photo UNDER the box
 *  - Enter / double-click = commit, Esc = cancel, arrow keys nudge the box
 *
 * Coordinates: the crop box lives in the "frame": natural image pixels, origin at the
 * image centre, axes aligned with the screen once the photo's rotation is applied. That
 * keeps the box stable while the view is zoomed/panned and while the photo is rotated.
 */

type Rect = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };
type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HANDLE_DIR: Record<Handle, [number, number]> = {
  n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1]
};
const HANDLE_CURSOR: Record<Handle, string> = {
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize'
};
const HANDLE_POS: Record<Handle, React.CSSProperties> = {
  nw: { left: 0, top: 0 }, n: { left: '50%', top: 0 }, ne: { left: '100%', top: 0 },
  e: { left: '100%', top: '50%' }, se: { left: '100%', top: '100%' }, s: { left: '50%', top: '100%' },
  sw: { left: 0, top: '100%' }, w: { left: 0, top: '50%' }
};

type Preset = { id: string; label: string; kind: 'free' | 'original' | 'fixed'; value?: number };
const PRESETS: Preset[] = [
  { id: 'free', label: 'Tự do', kind: 'free' },
  { id: 'original', label: 'Gốc', kind: 'original' },
  { id: '1:1', label: '1:1', kind: 'fixed', value: 1 },
  { id: '3:4', label: '3:4', kind: 'fixed', value: 3 / 4 },
  { id: '2:3', label: '2:3 (20x30)', kind: 'fixed', value: 2 / 3 },
];

const PAD = 28;          // breathing room around the photo at "fit" zoom (screen px)
const MAX_EDGE = 4096;   // longest side of the exported image (px)
const MIN_SCREEN = 28;   // smallest crop box on screen (px)
const MAX_ZOOM = 12;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// Keep a rect inside the photo's bounding box [-hw,hw]x[-hh,hh] (shrinking about its centre if needed).
const clampRect = (r: Rect, hw: number, hh: number, ratio: number | null): Rect => {
  let { w, h } = r;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  // Only keep the ratio if the box actually has it. A box that was unlocked with Shift is
  // free-form, so shrink its width and height independently instead of reshaping it.
  const locked = !!ratio && r.h > 0 && Math.abs(r.w / r.h - ratio) / ratio < 0.02;
  if (locked && ratio) {
    w = Math.min(w, 2 * hw, 2 * hh * ratio);
    h = w / ratio;
  } else {
    w = Math.min(w, 2 * hw); h = Math.min(h, 2 * hh);
  }
  const resized = w !== r.w || h !== r.h;
  const x = clamp(resized ? cx - w / 2 : r.x, -hw, hw - w);
  const y = clamp(resized ? cy - h / 2 : r.y, -hh, hh - h);
  return { x, y, w, h };
};

// Largest rect of the given ratio that fits the photo, centred on `center` (clamped inside).
const largestRect = (hw: number, hh: number, ratio: number | null, center?: Pt): Rect => {
  let w = 2 * hw, h = 2 * hh;
  if (ratio) { if (w / h > ratio) w = h * ratio; else h = w / ratio; }
  const cx = center?.x ?? 0, cy = center?.y ?? 0;
  return clampRect({ x: cx - w / 2, y: cy - h / 2, w, h }, hw, hh, ratio);
};

// Resize from a handle (or draw a new box when r0 is a degenerate rect and dir comes from the drag direction).
const resizeRect = (
  r0: Rect, dir: [number, number], P: Pt,
  o: { ratio: number | null; fromCenter: boolean; minSize: number; hw: number; hh: number }
): Rect => {
  const [dx, dy] = dir;
  const { ratio, fromCenter: fc, minSize, hw, hh } = o;
  const cx = r0.x + r0.w / 2, cy = r0.y + r0.h / 2;
  const ax = dx > 0 ? r0.x : dx < 0 ? r0.x + r0.w : cx;   // the edge/point that stays put
  const ay = dy > 0 ? r0.y : dy < 0 ? r0.y + r0.h : cy;

  let w = r0.w, h = r0.h;
  if (dx !== 0) w = Math.max(0, dx * (P.x - (fc ? cx : ax))) * (fc ? 2 : 1);
  if (dy !== 0) h = Math.max(0, dy * (P.y - (fc ? cy : ay))) * (fc ? 2 : 1);

  if (ratio) {
    if (dx !== 0 && dy !== 0) w = Math.max(w, h * ratio);
    else if (dy !== 0) w = h * ratio;
    w = Math.max(w, minSize, minSize * ratio);
    h = w / ratio;
  } else {
    if (dx !== 0) w = Math.max(w, minSize);
    if (dy !== 0) h = Math.max(h, minSize);
  }

  const centredX = fc || dx === 0, centredY = fc || dy === 0;
  const roomX = centredX ? 2 * Math.min(cx + hw, hw - cx) : dx > 0 ? hw - ax : ax + hw;
  const roomY = centredY ? 2 * Math.min(cy + hh, hh - cy) : dy > 0 ? hh - ay : ay + hh;
  if (ratio) {
    w = Math.min(w, roomX, roomY * ratio);
    h = w / ratio;
  } else {
    if (dx !== 0) w = Math.min(w, roomX);
    if (dy !== 0) h = Math.min(h, roomY);
  }

  const x = centredX ? cx - w / 2 : dx > 0 ? ax : ax - w;
  const y = centredY ? cy - h / 2 : dy > 0 ? ay : ay - h;
  return { x, y, w, h };
};

const Icon: React.FC<{ d: string; className?: string }> = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
  </svg>
);

const ManualCropper: React.FC<ManualCropperProps> = ({ imageSrc, onCancel, onConfirm }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ zoom: 1, panX: 0, panY: 0 });
  const [quarter, setQuarter] = useState(0);   // 90° steps
  const [fine, setFine] = useState(0);         // straighten, -45..45
  const [ratioId, setRatioId] = useState('2:3');
  const [swapped, setSwapped] = useState(false);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [interacting, setInteracting] = useState(false);
  const [straightening, setStraightening] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);

  // ---- derived geometry ----
  const deg = quarter * 90 + fine;
  const theta = (deg * Math.PI) / 180;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  const hw = nat ? (Math.abs(nat.w * cos) + Math.abs(nat.h * sin)) / 2 : 0;
  const hh = nat ? (Math.abs(nat.w * sin) + Math.abs(nat.h * cos)) / 2 : 0;
  const odd = Math.abs(quarter % 2) === 1;
  const dispW = nat ? (odd ? nat.h : nat.w) : 1;
  const dispH = nat ? (odd ? nat.w : nat.h) : 1;
  const fit = nat && stage.w > 0
    ? Math.max(0.0001, Math.min((stage.w - PAD * 2) / dispW, (stage.h - PAD * 2) / dispH))
    : 1;
  const k = fit * view.zoom;                            // natural px -> screen px
  const ox = stage.w / 2 + view.panX, oy = stage.h / 2 + view.panY;

  const preset = PRESETS.find(p => p.id === ratioId) || PRESETS[4];
  const ratioFor = (p: Preset, sw: boolean, dw: number, dh: number): number | null => {
    if (p.kind === 'free') return null;
    const base = p.kind === 'original' ? dw / dh : (p.value as number);
    return sw ? 1 / base : base;
  };
  const ratio = ratioFor(preset, swapped, dispW, dispH);

  const latest = useRef({ stage, fit, view });
  latest.current = { stage, fit, view };

  // ---- load / size tracking ----
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const readNatural = () => {
    const img = imgRef.current;
    if (img && img.naturalWidth && img.naturalHeight) setNat({ w: img.naturalWidth, h: img.naturalHeight });
  };
  useEffect(() => { if (imgRef.current?.complete) readNatural(); }, []);

  useEffect(() => {
    if (nat && !crop) setCrop(largestRect(hw, hh, ratio));
  }, [nat]);

  // ---- view zoom ----
  const zoomAround = (m: Pt, newZoom: number) => {
    const { stage: st, fit: f, view: v } = latest.current;
    const z = clamp(newZoom, 1, MAX_ZOOM);
    const Fx = (m.x - (st.w / 2 + v.panX)) / (f * v.zoom);
    const Fy = (m.y - (st.h / 2 + v.panY)) / (f * v.zoom);
    setView(z <= 1.001 ? { zoom: 1, panX: 0, panY: 0 } : { zoom: z, panX: m.x - st.w / 2 - f * z * Fx, panY: m.y - st.h / 2 - f * z * Fy });
  };
  const zoomCentre = (z: number) => zoomAround({ x: stage.w / 2, y: stage.h / 2 }, z);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAround({ x: e.clientX - r.left, y: e.clientY - r.top }, latest.current.view.zoom * Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ---- rotation / ratio actions ----
  // Choosing a ratio re-fits the biggest box of that ratio, centred on the photo.
  const refit = (r: number | null, c: Rect | null, hw2: number, hh2: number): Rect =>
    r ? largestRect(hw2, hh2, r)
      : clampRect(c || largestRect(hw2, hh2, null), hw2, hh2, null);

  const applyAngle = (q: number, f: number) => {
    if (!nat) return;
    const t = ((q * 90 + f) * Math.PI) / 180;
    const hw2 = (Math.abs(nat.w * Math.cos(t)) + Math.abs(nat.h * Math.sin(t))) / 2;
    const hh2 = (Math.abs(nat.w * Math.sin(t)) + Math.abs(nat.h * Math.cos(t))) / 2;
    const odd2 = Math.abs(q % 2) === 1;
    const r2 = ratioFor(preset, swapped, odd2 ? nat.h : nat.w, odd2 ? nat.w : nat.h);
    setQuarter(q); setFine(f);
    setCrop(c => (q !== quarter && preset.kind === 'original') ? refit(r2, c, hw2, hh2) : c && clampRect(c, hw2, hh2, r2));
  };

  const selectRatio = (id: string) => {
    const p = PRESETS.find(x => x.id === id)!;
    setRatioId(id); setSwapped(false);
    const r = ratioFor(p, false, dispW, dispH);
    setCrop(c => (p.kind === 'free' && c) ? c : refit(r, c, hw, hh));
  };

  // After straightening, the box can reach past the photo and show white wedges. Shrink it (same
  // shape, same centre when possible) until all four corners lie inside the rotated photo.
  const fitInsidePhoto = () => {
    if (!nat) return;
    const inside = (cx: number, cy: number, w: number, h: number) => {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const X = cx + (sx * w) / 2, Y = cy + (sy * h) / 2;
        if (Math.abs(X * cos + Y * sin) > nat.w / 2 + 0.5 || Math.abs(-X * sin + Y * cos) > nat.h / 2 + 0.5) return false;
      }
      return true;
    };
    setCrop(c => {
      if (!c) return c;
      const solve = (cx: number, cy: number) => {
        if (inside(cx, cy, c.w, c.h)) return 1;
        let lo = 0, hi = 1;
        for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (inside(cx, cy, c.w * m, c.h * m)) lo = m; else hi = m; }
        return lo;
      };
      let cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      let s = solve(cx, cy);
      if (s < 0.05) { cx = 0; cy = 0; s = solve(0, 0); }   // box centre was far outside the photo
      const w = c.w * s, h = c.h * s;
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    });
  };

  const swapOrientation = () => {
    setCrop(c => {
      if (!c) return c;
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      const r = ratio ? 1 / ratio : null;
      return clampRect({ x: cx - c.h / 2, y: cy - c.w / 2, w: c.h, h: c.w }, hw, hh, r);
    });
    if (ratio) setSwapped(s => !s);
  };

  const resetAll = () => {
    setQuarter(0); setFine(0); setSwapped(false); setView({ zoom: 1, panX: 0, panY: 0 });
    if (nat) {
      const p = PRESETS.find(x => x.id === ratioId)!;
      setCrop(largestRect(nat.w / 2, nat.h / 2, ratioFor(p, false, nat.w, nat.h)));
    }
  };

  // ---- pointer interaction ----
  const pointers = useRef<Map<number, Pt>>(new Map());
  const drag = useRef<null | { mode: 'move' | 'resize' | 'new' | 'pan'; start: Pt; rect0: Rect; handle?: Handle; client0: Pt; pan0: Pt }>(null);
  const pinch = useRef<null | { dist0: number; zoom0: number; F0: Pt }>(null);

  const toFrame = (cx: number, cy: number): Pt => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: (cx - r.left - ox) / k, y: (cy - r.top - oy) / k };
  };

  const pinchPoints = () => {
    const pts: Pt[] = [];
    pointers.current.forEach(p => pts.push(p));
    const r = stageRef.current!.getBoundingClientRect();
    return {
      mid: { x: (pts[0].x + pts[1].x) / 2 - r.left, y: (pts[0].y + pts[1].y) / 2 - r.top },
      dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!nat || !crop) return;
    try { stageRef.current!.setPointerCapture(e.pointerId); } catch { /* pointer already gone: ignore */ }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const { mid, dist } = pinchPoints();
      pinch.current = { dist0: dist, zoom0: view.zoom, F0: { x: (mid.x - ox) / k, y: (mid.y - oy) / k } };
      drag.current = null;
      setInteracting(true);
      return;
    }
    if (pointers.current.size > 2) return;

    const P = toFrame(e.clientX, e.clientY);
    const base = { client0: { x: e.clientX, y: e.clientY }, pan0: { x: view.panX, y: view.panY }, start: P, rect0: crop };

    if (e.button === 1 || e.button === 2 || spaceDown) {
      drag.current = { ...base, mode: 'pan' };
    } else {
      const handle = (e.target as HTMLElement).closest('[data-handle]')?.getAttribute('data-handle') as Handle | null;
      const inside = P.x >= crop.x && P.x <= crop.x + crop.w && P.y >= crop.y && P.y <= crop.y + crop.h;
      if (handle) {
        drag.current = { ...base, mode: 'resize', handle };
      } else if (inside) {
        drag.current = { ...base, mode: 'move' };
      } else {
        const A = { x: clamp(P.x, -hw, hw), y: clamp(P.y, -hh, hh) };
        drag.current = { ...base, mode: 'new', start: A, rect0: { x: A.x, y: A.y, w: 0, h: 0 } };
      }
    }
    setInteracting(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current && pointers.current.size >= 2) {
      const { mid, dist } = pinchPoints();
      const z = clamp(pinch.current.zoom0 * (dist / pinch.current.dist0), 1, MAX_ZOOM);
      const F0 = pinch.current.F0;
      setView(z <= 1.001 ? { zoom: 1, panX: 0, panY: 0 } : { zoom: z, panX: mid.x - stage.w / 2 - fit * z * F0.x, panY: mid.y - stage.h / 2 - fit * z * F0.y });
      return;
    }

    const d = drag.current;
    if (!d) return;
    const P = toFrame(e.clientX, e.clientY);

    if (d.mode === 'pan') {
      if (view.zoom <= 1.001) return; // nothing to pan while the whole photo is in view
      setView(v => ({ ...v, panX: d.pan0.x + (e.clientX - d.client0.x), panY: d.pan0.y + (e.clientY - d.client0.y) }));
    } else if (d.mode === 'move') {
      setCrop(clampRect({ ...d.rect0, x: d.rect0.x + (P.x - d.start.x), y: d.rect0.y + (P.y - d.start.y) }, hw, hh, null));
    } else {
      // The pointer may leave the photo; treat it as sitting on the nearest edge so the box
      // never flips direction or collapses to nothing when dragged past the border.
      const Pc = { x: clamp(P.x, -hw, hw), y: clamp(P.y, -hh, hh) };
      let r = ratio;
      if (e.shiftKey) r = ratio ? null : (d.rect0.w > 0 && d.rect0.h > 0 ? d.rect0.w / d.rect0.h : 1);
      const dir: [number, number] = d.mode === 'new'
        ? [Pc.x >= d.start.x ? 1 : -1, Pc.y >= d.start.y ? 1 : -1]
        : HANDLE_DIR[d.handle!];
      const next = resizeRect(d.rect0, dir, Pc, { ratio: r, fromCenter: e.altKey, minSize: MIN_SCREEN / k, hw, hh });
      // Ignore degenerate results (e.g. no room left in that direction) instead of applying them.
      if (!isFinite(next.x + next.y + next.w + next.h) || next.w < 1 || next.h < 1) return;
      // Starting a new box right at the photo's border can leave no room for a usable size;
      // keep the current box instead of replacing it with a speck that is hard to grab.
      if (d.mode === 'new' && (next.w * k < MIN_SCREEN - 0.5 || next.h * k < MIN_SCREEN - 0.5)) return;
      setCrop(next);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) { drag.current = null; setInteracting(false); }
    else if (pointers.current.size === 1) { drag.current = null; }
  };

  // ---- commit ----
  const outScale = crop ? Math.min(1, MAX_EDGE / Math.max(crop.w, crop.h)) : 1;
  const outW = crop ? Math.max(1, Math.round(crop.w * outScale)) : 0;
  const outH = crop ? Math.max(1, Math.round(crop.h * outScale)) : 0;

  const handleCrop = () => {
    const img = imgRef.current;
    if (!img || !nat || !crop) return;
    const canvas = document.createElement('canvas');
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // canvas = scale · translate(-crop origin) · rotate(theta) · (image point - image centre)
    ctx.scale(outScale, outScale);
    ctx.translate(-crop.x, -crop.y);
    ctx.rotate(theta);
    ctx.drawImage(img, -nat.w / 2, -nat.h / 2);
    try {
      onConfirm(canvas.toDataURL('image/png', 1.0));
    } catch {
      alert('Không thể xuất ảnh vì ảnh nguồn bị chặn (CORS). Hãy tải ảnh lên lại từ máy.');
    }
  };

  // ---- keyboard ----
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e.target)) { e.preventDefault(); setSpaceDown(true); return; }
      if (e.key === 'Escape') { onCancel(); return; }
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); handleCrop(); return; }
      if ((e.key === 'x' || e.key === 'X') && !isTyping(e.target)) { swapOrientation(); return; }
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (arrows[e.key] && !isTyping(e.target)) {
        e.preventDefault();
        const step = (e.shiftKey ? 10 : 1) / k;
        const [ax, ay] = arrows[e.key];
        setCrop(c => c && clampRect({ ...c, x: c.x + ax * step, y: c.y + ay * step }, hw, hh, null));
      }
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceDown(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  });

  // ---- render ----
  const boxStyle = useMemo<React.CSSProperties | null>(() => crop ? ({
    left: ox + k * crop.x, top: oy + k * crop.y, width: k * crop.w, height: k * crop.h,
  }) : null, [crop, ox, oy, k]);

  // Ratio of the box as it actually is (also right while Shift temporarily unlocks it).
  const ratioText = crop && crop.h > 0
    ? (() => {
        const r = crop.w / crop.h;
        const n = Math.round((r >= 1 ? r : 1 / r) * 100) / 100;
        return r >= 1 ? `${n}:1` : `1:${n}`;
      })()
    : '';

  const chip = (active: boolean) =>
    `px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
      active ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`;
  const iconBtn = 'w-9 h-9 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all active:scale-95';

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col h-[100dvh] w-screen select-none">
      {/* Header */}
      <div className="shrink-0 h-14 bg-black/90 flex justify-between items-center px-4 z-50 border-b border-white/10">
        <button onClick={onCancel} className="text-white font-bold text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20" title="Esc">
          Hủy
        </button>
        <div className="flex flex-col items-center">
          <span className="text-white font-black uppercase text-sm tracking-widest">CẮT ẢNH</span>
          <span className="text-[10px] text-brand-400 font-bold">
            {crop ? `${outW} × ${outH} px · tỷ lệ ${ratioText}` : 'Đang tải ảnh...'}
          </span>
        </div>
        <button onClick={handleCrop} disabled={!crop} className="text-white font-bold text-sm px-6 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/30 disabled:opacity-40" title="Enter">
          Xong
        </button>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="flex-1 relative overflow-hidden bg-neutral-900 touch-none"
        style={{ cursor: spaceDown ? (interacting ? 'grabbing' : 'grab') : 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={e => e.preventDefault()}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Source"
          crossOrigin="anonymous"
          draggable={false}
          onLoad={readNatural}
          className="absolute max-w-none pointer-events-none select-none"
          style={{
            left: 0, top: 0,
            width: nat ? nat.w : undefined, height: nat ? nat.h : undefined,
            visibility: nat ? 'visible' : 'hidden',
            transformOrigin: '0 0',
            transform: nat ? `translate(${ox}px, ${oy}px) scale(${k}) rotate(${deg}deg) translate(${-nat.w / 2}px, ${-nat.h / 2}px)` : undefined,
            imageRendering: k > 3 ? 'pixelated' : 'auto'
          }}
        />

        {boxStyle && (
          <div
            className="absolute"
            style={{ ...boxStyle, boxShadow: '0 0 0 9999px rgba(0,0,0,0.62)', outline: '1px solid rgba(255,255,255,0.95)', cursor: spaceDown ? undefined : 'move' }}
            onDoubleClick={handleCrop}
          >
            {/* Rule of thirds */}
            <div className="absolute inset-0 pointer-events-none" style={{ opacity: interacting ? 0.9 : 0.4 }}>
              <div className="absolute top-0 bottom-0 border-l border-white/70" style={{ left: '33.333%' }} />
              <div className="absolute top-0 bottom-0 border-l border-white/70" style={{ left: '66.666%' }} />
              <div className="absolute left-0 right-0 border-t border-white/70" style={{ top: '33.333%' }} />
              <div className="absolute left-0 right-0 border-t border-white/70" style={{ top: '66.666%' }} />
            </div>
            {/* Fine grid while straightening */}
            {straightening && (
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.28) 1px, transparent 1px)',
                backgroundSize: '10% 10%'
              }} />
            )}
            {/* 8 handles */}
            {HANDLES.map(h => {
              const edgeV = h === 'n' || h === 's', edgeH = h === 'e' || h === 'w';
              return (
                <div
                  key={h}
                  data-handle={h}
                  className="absolute flex items-center justify-center"
                  style={{ ...HANDLE_POS[h], width: 32, height: 32, transform: 'translate(-50%, -50%)', cursor: spaceDown ? undefined : HANDLE_CURSOR[h], touchAction: 'none' }}
                >
                  <div className="bg-white border border-black/70 shadow-md pointer-events-none" style={{ width: edgeV ? 22 : edgeH ? 6 : 11, height: edgeH ? 22 : edgeV ? 6 : 11 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 bg-gray-900 px-4 py-3 pb-safe border-t border-white/10 z-50 space-y-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => selectRatio(p.id)} className={chip(ratioId === p.id)}>{p.label}</button>
            ))}
          </div>
          <button onClick={swapOrientation} className={iconBtn} title="Đổi ngang/dọc (X)">
            <Icon d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
          </button>
          <button onClick={resetAll} className={iconBtn} title="Đặt lại">
            <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </button>
        </div>

        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <button onClick={() => applyAngle(quarter - 1, fine)} className={iconBtn} title="Xoay trái 90°">
            <Icon d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Xoay thẳng ảnh</span>
              <span className="flex items-center gap-3">
                {Math.abs(fine) > 0.05 && (
                  <button onClick={fitInsidePhoto} className="text-brand-400 hover:text-white" title="Thu khung vào trong ảnh để không còn góc trắng">Bỏ viền trắng</button>
                )}
                <button onClick={() => applyAngle(quarter, 0)} className="hover:text-white" title="Về 0°">{fine.toFixed(1)}°</button>
              </span>
            </div>
            <input
              type="range" min="-45" max="45" step="0.1" value={fine}
              onChange={e => applyAngle(quarter, parseFloat(e.target.value))}
              onPointerDown={() => setStraightening(true)}
              onPointerUp={() => setStraightening(false)}
              onBlur={() => setStraightening(false)}
              onDoubleClick={() => applyAngle(quarter, 0)}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
          </div>
          <button onClick={() => applyAngle(quarter + 1, fine)} className={iconBtn} title="Xoay phải 90°">
            <Icon d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </button>
        </div>

        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <button onClick={() => zoomCentre(view.zoom / 1.25)} className={iconBtn} title="Thu nhỏ">
            <Icon d="M20 12H4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Phóng to khung nhìn</span>
              <span>{Math.round(view.zoom * 100)}%</span>
            </div>
            <input
              type="range" min="100" max={MAX_ZOOM * 100} step="5" value={Math.round(view.zoom * 100)}
              onChange={e => zoomCentre(parseInt(e.target.value, 10) / 100)}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          <button onClick={() => zoomCentre(view.zoom * 1.25)} className={iconBtn} title="Phóng to">
            <Icon d="M12 4v16m8-8H4" />
          </button>
          <button onClick={() => setView({ zoom: 1, panX: 0, panY: 0 })} className={`${chip(false)} h-9`} title="Vừa khung">Vừa khung</button>
        </div>

        <p className="hidden md:block max-w-3xl mx-auto text-center text-[10px] text-gray-500 leading-relaxed">
          Kéo góc/cạnh để đổi kích thước · kéo trong khung để di chuyển · kéo ngoài khung để vẽ khung mới · Shift: bật/tắt khoá tỷ lệ · Alt: từ tâm · cuộn chuột: zoom · giữ Space + kéo: dịch ảnh · Enter: Xong · Esc: Hủy
        </p>
      </div>
    </div>,
    document.body
  );
};

export default ManualCropper;
