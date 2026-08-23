
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PhotoSize } from '../types';

interface ManualCropperProps {
  imageSrc: string;
  photoSize: PhotoSize;
  onCancel: () => void;
  onConfirm: (croppedImage: string) => void;
}

const RATIO_PRESETS = [
  { id: 'free', label: 'Tự do', value: null as number | null },
  { id: '1:1', label: '1:1', value: 1 },
  { id: '3:4', label: '3:4', value: 3 / 4 },
  { id: '2:3', label: '2:3 (20x30)', value: 2 / 3 },
];

const ManualCropper: React.FC<ManualCropperProps> = ({ imageSrc, photoSize, onCancel, onConfirm }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [ratioId, setRatioId] = useState('2:3');
  const [naturalRatio, setNaturalRatio] = useState(2 / 3);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Chosen ratio, or the photo's own ratio when "Tự do" (free) is picked
  const selectedPreset = RATIO_PRESETS.find(r => r.id === ratioId) || RATIO_PRESETS[3];
  const ASPECT_RATIO = selectedPreset.value ?? naturalRatio;

  const handleImageLoad = () => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      if (naturalWidth && naturalHeight) setNaturalRatio(naturalWidth / naturalHeight);
    }
  };

  const handleRatioChange = (id: string) => {
    setRatioId(id);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // --- MOUSE / TOUCH EVENTS FOR PANNING ---
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) handleStart(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const rotate90 = (direction: 'left' | 'right') => {
      setRotation(prev => prev + (direction === 'left' ? -90 : 90));
  };

  // --- CROP LOGIC (Matrix Transformation) ---
  const handleCrop = async () => {
    if (!imgRef.current || !containerRef.current) return;

    // 1. Setup High-Res Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use querySelector to find the crop box element within the container
    const cropBox = containerRef.current.querySelector('#crop-box');
    if (!cropBox) return;

    // Target Output Resolution (High Quality for Printing)
    // 20x30cm at 300dpi is approx 2300x3500px.
    // We use a standardized high res target, capping the long edge at 3000px
    // regardless of ratio so very wide/tall "Tự do" crops stay a sane canvas size.
    const LONG_EDGE = 3000;
    const targetWidth = ASPECT_RATIO >= 1 ? LONG_EDGE : Math.round(LONG_EDGE * ASPECT_RATIO);
    const targetHeight = ASPECT_RATIO >= 1 ? Math.round(LONG_EDGE / ASPECT_RATIO) : LONG_EDGE;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // 2. Calculate Scale Factor (Canvas Pixels per Screen Pixel)
    const cropRect = cropBox.getBoundingClientRect();
    const pixelRatio = targetWidth / cropRect.width;

    // 3. Clear Canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();

    // 4. Apply Transformations to Match Screen Visuals
    // Move origin to center of canvas (which corresponds to center of crop box)
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Apply User Transforms (Translate -> Rotate -> Scale)
    // IMPORTANT: Matches CSS transform order: translate() rotate() scale()
    // We scale the offset by pixelRatio to map screen movement to canvas pixels
    ctx.translate(offset.x * pixelRatio, offset.y * pixelRatio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // 5. Draw the Image
    // We rely on offsetWidth/Height (Layout size) because getBoundingClientRect is tainted by rotation
    const layoutWidth = imgRef.current.offsetWidth;
    const layoutHeight = imgRef.current.offsetHeight;

    // Draw centered relative to the transformed origin
    ctx.drawImage(
      imgRef.current,
      -layoutWidth * pixelRatio / 2,
      -layoutHeight * pixelRatio / 2,
      layoutWidth * pixelRatio,
      layoutHeight * pixelRatio
    );

    ctx.restore();

    onConfirm(canvas.toDataURL('image/png', 1.0));
  };

  // Prevent scrolling on body when cropper is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col h-[100dvh] w-screen touch-none">
      {/* Header */}
      <div className="shrink-0 h-16 bg-black/90 flex justify-between items-center px-4 z-50 border-b border-white/10">
        <button onClick={onCancel} className="text-white font-bold text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
          Hủy
        </button>
        <div className="flex flex-col items-center">
            <span className="text-white font-black uppercase text-sm tracking-widest">CẮT ẢNH</span>
            <span className="text-[10px] text-brand-400 font-bold">TỶ LỆ {selectedPreset.label.toUpperCase()}</span>
        </div>
        <button onClick={handleCrop} className="text-white font-bold text-sm px-6 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/30">
          Xong
        </button>
      </div>

      {/* Workspace */}
      <div 
        className="flex-1 relative overflow-hidden bg-gray-900 flex items-center justify-center p-4 w-full"
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleEnd}
      >
        {/* The Image (Transformed) */}
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Source"
          crossOrigin="anonymous"
          className="absolute max-w-none origin-center pointer-events-none select-none transition-transform duration-75 ease-linear"
          style={{
            // CSS Transform Order must match Canvas Logic order
            transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
            height: 'auto',
            maxHeight: '85%',
            maxWidth: '85%',
            imageRendering: 'auto'
          }}
          draggable={false}
          onLoad={handleImageLoad}
        />

        {/* The Crop Box (Overlay) */}
        <div 
          id="crop-box"
          className="relative z-10 pointer-events-none border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.85)]"
          style={{
            aspectRatio: `${ASPECT_RATIO}`,
            height: '80%', 
            maxHeight: '80%',
            maxWidth: '80%'
          }}
        >
           {/* Grid */}
           <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
              <div className="border-r border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-b border-white"></div>
              <div className="border-r border-white"></div>
              <div className="border-r border-white"></div>
              <div></div>
           </div>
           
           {/* Markers */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-brand-500 -mt-[2px] -ml-[2px]"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-brand-500 -mt-[2px] -mr-[2px]"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-brand-500 -mb-[2px] -ml-[2px]"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-brand-500 -mb-[2px] -mr-[2px]"></div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="shrink-0 bg-gray-900 px-6 py-4 pb-safe border-t border-white/10 z-50 space-y-5">

         {/* Aspect Ratio Selector */}
         <div className="max-w-md mx-auto flex gap-2 justify-center">
            {RATIO_PRESETS.map(preset => (
               <button
                  key={preset.id}
                  onClick={() => handleRatioChange(preset.id)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                     ratioId === preset.id
                     ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                     : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
               >
                  {preset.label}
               </button>
            ))}
         </div>

         {/* Rotation Controls */}
         <div className="max-w-md mx-auto space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
               <button onClick={() => rotate90('left')} className="flex items-center gap-1 hover:text-white p-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                  -90°
               </button>
               <span>Góc xoay: {Math.round(rotation)}°</span>
               <button onClick={() => rotate90('right')} className="flex items-center gap-1 hover:text-white p-2">
                  +90°
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"></path></svg>
               </button>
            </div>
            <input 
              type="range" 
              min="-45" 
              max="45" 
              step="1" 
              value={rotation % 90} // For fine tuning relative to 90 deg steps? No, keep absolute for simplicity or logic needs update.
              // Let's stick to absolute rotation for slider to avoid complexity with 90 jumps
              // Actually, better to separate fine tune slider (-45 to 45) from total rotation
              // But for simplicity, let's just make the slider control the WHOLE rotation if needed, 
              // OR better: Slider only does +/- 45 from current base.
              // Simplest UX: Slider sets absolute rotation, Buttons add 90.
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 px-1">
                <span>-45°</span>
                <span>0°</span>
                <span>+45°</span>
            </div>
         </div>

         {/* Zoom Controls */}
         <div className="max-w-md mx-auto space-y-2 border-t border-gray-800 pt-4">
            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
               <span>Thu nhỏ</span>
               <span>Zoom: {Math.round(zoom * 100)}%</span>
               <span>Phóng to</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="3" 
              step="0.01" 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))} 
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
         </div>

      </div>
    </div>,
    document.body
  );
};

export default ManualCropper;
