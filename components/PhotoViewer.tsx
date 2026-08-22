
import React, { useEffect, useState } from 'react';
import { getPhotoById } from '../services/databaseService';
import { SavedPhoto, PhotoSize, AppConfig, BackgroundType } from '../types';

interface PhotoViewerProps {
  photoId: string;
  config?: AppConfig; 
}

const PhotoViewer: React.FC<PhotoViewerProps> = ({ photoId, config }) => {
  const [photo, setPhoto] = useState<SavedPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const getCurrentUrl = () => {
    return window.location.href;
  };

  useEffect(() => {
    const fetchPhoto = async () => {
      setLoading(true);
      try {
        const data = await getPhotoById(photoId);
        if (data) setPhoto(data);
        else setError('Không tìm thấy ảnh hoặc liên kết đã hết hạn.');
      } catch (e) {
        setError('Lỗi kết nối máy chủ.');
      } finally {
        setLoading(false);
      }
    };
    fetchPhoto();
  }, [photoId]);

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSingle = () => {
    if (!photo) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = photo.dataUrl;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
            downloadImage(canvas.toDataURL('image/png'), `Photo-${photo.id}.png`);
        }
    };
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image`));
        img.src = src;
    });
  };

  const handleDownloadSheet = async () => {
    if (!photo) return;
    setIsGenerating(true);
    
    try {
        const DPI = 300;
        const MM_TO_PX = DPI / 25.4;
        
        // 1. A4 Paper Size (210x297mm)
        const SHEET_WIDTH_MM = 210;
        const SHEET_HEIGHT_MM = 297;
        
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(SHEET_WIDTH_MM * MM_TO_PX);
        canvas.height = Math.ceil(SHEET_HEIGHT_MM * MM_TO_PX);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas init failed");

        // Fill White Background for A4
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const qrContent = getCurrentUrl();
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrContent)}&ecc=H`;

        const [mainPhotoImg, logoImg, qrImg] = await Promise.all([
            loadImage(photo.dataUrl),
            config?.logoUrl ? loadImage(config.logoUrl).catch(() => null) : Promise.resolve(null),
            loadImage(qrApiUrl).catch(() => null)
        ]);

        const size = photo.settings.size;

        if (size === PhotoSize.SIZE_20X30) {
            // --- 20x30 MODE (FULL A4 CENTERED) ---
            
            // Photo dimensions: 200x300mm
            const PHOTO_WIDTH_MM = 200;
            const PHOTO_HEIGHT_MM = 300;
            const photoW = PHOTO_WIDTH_MM * MM_TO_PX;
            const photoH = PHOTO_HEIGHT_MM * MM_TO_PX;
            
            // Center photo on A4 Canvas
            const photoX = (canvas.width - photoW) / 2;
            const photoY = (canvas.height - photoH) / 2;
            
            ctx.save();
            const bgCol = photo.settings.background === BackgroundType.ORIGINAL ? null : (config?.backgroundConfig?.find((b: any) => b.type === photo.settings.background)?.hexColor || '#ffffff');
            if (bgCol) { 
                ctx.fillStyle = bgCol; 
                ctx.fillRect(photoX, photoY, photoW, photoH); 
            }
            ctx.drawImage(mainPhotoImg, photoX, photoY, photoW, photoH);
            ctx.restore();

            // FOOTER LOGIC (Overlay on A4/Photo bottom)
            const hasCustomInfo = photo.settings.info?.enabled && photo.settings.info?.text?.trim().length > 0;
            const footerHeightMM = hasCustomInfo ? 30 : 20;
            const footerHeightPx = footerHeightMM * MM_TO_PX;
            const footerY = canvas.height - footerHeightPx;

            // Footer Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, footerY, canvas.width, footerHeightPx);

            // Top Border
            ctx.beginPath(); ctx.moveTo(0, footerY); ctx.lineTo(canvas.width, footerY);
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();

            const paddingMM = 5;
            const paddingPx = paddingMM * MM_TO_PX;
            
            // --- LOGO & SHOP NAME (Left) ---
            let leftContentRightX = paddingPx;
            
            if (logoImg) {
                const logoHeightMM = hasCustomInfo ? 15 : 10;
                const logoH = logoHeightMM * MM_TO_PX;
                const logoW = logoImg.width * (logoH / logoImg.height);
                
                const shopNameSize = footerHeightPx * 0.10; 
                ctx.font = `bold ${shopNameSize}px sans-serif`;
                const shopNameW = ctx.measureText(config?.shopName || "").width;
                
                const maxWidth = Math.max(logoW, shopNameW);
                const gap = 2 * MM_TO_PX;
                const totalGroupH = logoH + gap + shopNameSize;
                const groupStartY = footerY + (footerHeightPx - totalGroupH) / 2;
                const groupCenterX = paddingPx + maxWidth / 2;
                
                ctx.drawImage(logoImg, groupCenterX - logoW / 2, groupStartY, logoW, logoH);
                
                ctx.fillStyle = photo.settings.info?.color || '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(config?.shopName || "", groupCenterX, groupStartY + logoH + gap);
                
                leftContentRightX += maxWidth + paddingPx;
            } else {
                ctx.fillStyle = photo.settings.info?.color || '#000000';
                const fontSize = hasCustomInfo ? 8 * MM_TO_PX : 6 * MM_TO_PX;
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(config?.shopName || "", paddingPx, footerY + footerHeightPx / 2);
                leftContentRightX += ctx.measureText(config?.shopName || "").width + paddingPx;
            }

            // --- QR (Right) ---
            const qrSizeMM = hasCustomInfo ? 18 : 12; 
            const qrSize = qrSizeMM * MM_TO_PX; 
            const qrX = canvas.width - qrSize - paddingPx;
            const qrY = footerY + (footerHeightPx - qrSize) / 2;
            
            if (qrImg) {
                ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
            }

            // --- CENTER CONTENT ---
            const contentStartX = leftContentRightX;
            const contentEndX = qrX - paddingPx;
            const contentWidth = contentEndX - contentStartX;
            const centerY = footerY + footerHeightPx / 2;

            ctx.fillStyle = photo.settings.info?.color || '#000000';
            
            if (hasCustomInfo) {
                const fontSizePt = photo.settings.info.fontSize || 20;
                const fontSizePx = fontSizePt * 1.33 * (DPI / 96); 
                ctx.font = `bold ${fontSizePx}px sans-serif`;
                ctx.textBaseline = 'middle';
                const text = photo.settings.info.text;
                const alignment = photo.settings.info.alignment || 'center';
                const lines = text.split('\n');
                const lineHeight = fontSizePx * 1.2;
                const totalTextHeight = lines.length * lineHeight;
                let currentTextY = centerY - (totalTextHeight / 2) + (lineHeight/2);

                lines.forEach(line => {
                    let textX = contentStartX;
                    if (alignment === 'center') {
                        ctx.textAlign = 'center';
                        textX = contentStartX + contentWidth / 2;
                    } else if (alignment === 'right') {
                        ctx.textAlign = 'right';
                        textX = contentEndX;
                    } else {
                        ctx.textAlign = 'left';
                    }
                    ctx.fillText(line, textX, currentTextY, contentWidth);
                    currentTextY += lineHeight;
                });
            }
        } else {
             // Fallback for legacy sizes if needed, generally unreachable now
        }

        downloadImage(canvas.toDataURL('image/png', 1.0), `Photo-${photo.id}-PrintSheet.png`);
    } catch (e) {
        alert("Lỗi tạo file in.");
    } finally {
        setIsGenerating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-950 p-6">
        <div className="w-16 h-16 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin mb-6"></div>
        <p className="text-gray-500 dark:text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Đang tải ảnh của bạn...</p>
    </div>
  );

  if (error || !photo) return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase">Lỗi truy cập</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto text-sm">{error}</p>
        <a href="/" className="px-8 py-3 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-500/30 active:scale-95 transition-all">Về trang chủ</a>
    </div>
  );

  return (
    <div className="min-h-screen h-auto bg-gray-50 dark:bg-gray-950 flex flex-col font-sans overflow-x-hidden">
       
       {/* Sticky Header */}
       <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-3 md:px-6 md:py-4 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
             <div className="flex items-center gap-3">
                {config?.logoUrl ? (
                   <img src={config.logoUrl} alt="Logo" className="h-6 md:h-8 w-auto object-contain" />
                ) : (
                   <div className="w-6 h-6 md:w-8 md:h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-black text-[10px] md:text-sm">
                     {config?.shopName?.charAt(0) || 'P'}
                   </div>
                )}
                <span className="font-black text-xs md:text-sm text-gray-900 dark:text-white uppercase tracking-tight truncate max-w-[150px]">{config?.shopName || 'ID Photo Booth'}</span>
             </div>
             <div className="text-[8px] md:text-[10px] font-black text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded-full uppercase tracking-widest border border-brand-100 dark:border-brand-800">Kết quả</div>
          </div>
       </header>

       {/* Scrollable Content */}
       <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start pb-20">
          
          {/* Left: Photo Preview */}
          <div className="lg:col-span-7 space-y-4 md:space-y-6">
             <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-4 md:p-10 shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col items-center group overflow-hidden">
                <div className="relative inline-block max-w-full">
                   <div className="absolute -inset-2 bg-brand-500/10 rounded-2xl blur-xl"></div>
                   <div className="relative shadow-2xl rounded-lg overflow-hidden border-[4px] border-white dark:border-gray-800 bg-white">
                       <img 
                         src={photo.dataUrl} 
                         className="max-h-[40vh] md:max-h-[60vh] w-auto object-contain" 
                         alt="ID Photo Result" 
                       />
                   </div>
                </div>
                
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                   <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Size: {photo.settings.size}
                   </div>
                   <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      {new Date(photo.timestamp).toLocaleDateString('vi-VN')}
                   </div>
                </div>
             </div>

             {/* Help Note */}
             <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex gap-3">
                <div className="text-xl">💡</div>
                <p className="text-[11px] md:text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                   Tải "Ảnh Đơn" để lưu điện thoại và "File In" để mang ra tiệm in chuyên nghiệp (Chất lượng cao).
                </p>
             </div>
          </div>

          {/* Right: Actions */}
          <div className="lg:col-span-5 space-y-4 md:space-y-6">
             <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-xl border border-gray-100 dark:border-gray-800 space-y-4">
                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Tải ảnh xuống</h2>
                
                <button 
                  onClick={handleDownloadSingle}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 hover:bg-brand-500 dark:hover:bg-brand-600 rounded-2xl transition-all flex items-center gap-4 group/btn active:scale-95 border border-gray-100 dark:border-gray-700"
                >
                   <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm transition-transform">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                   </div>
                   <div className="text-left">
                      <div className="font-black text-xs text-gray-900 dark:text-white group-hover/btn:text-white uppercase tracking-tight">Ảnh Thẻ Đơn (Chỉ ảnh)</div>
                      <div className="text-[9px] text-gray-400 dark:text-gray-500 group-hover/btn:text-white/70 font-bold uppercase">PNG HQ</div>
                   </div>
                </button>

                <button 
                  onClick={handleDownloadSheet}
                  disabled={isGenerating}
                  className="w-full p-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl transition-all flex items-center gap-4 active:scale-95 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                >
                   <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                      {isGenerating ? (
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                      )}
                   </div>
                   <div className="text-left">
                      <div className="font-black text-xs uppercase tracking-tight">File In (Full A4/20x30)</div>
                      <div className="text-[9px] text-white/70 font-bold uppercase">300 DPI - Chất lượng cao</div>
                   </div>
                </button>
             </div>

             {/* QR Share Card */}
             <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col items-center">
                <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Quét mã để chia sẻ</span>
                <div className="relative p-3 bg-white rounded-2xl border border-gray-100 shadow-inner">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getCurrentUrl())}&color=000000&bgcolor=FFFFFF&margin=0&ecc=H`} 
                      className="w-24 h-24 md:w-32 md:h-32"
                      alt="Share QR"
                    />
                </div>
                <div className="mt-4 text-[9px] font-bold text-gray-400 text-center leading-relaxed">
                   Sử dụng mã này để xem lại ảnh <br/> trên bất kỳ thiết bị nào.
                </div>
             </div>
          </div>
       </main>
       
       <footer className="mt-auto py-6 px-4 border-t border-gray-200 dark:border-gray-800 flex flex-col items-center gap-2 bg-white dark:bg-gray-900 pb-safe">
         <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">© {new Date().getFullYear()} {config?.shopName || 'ID Photo Booth'}</p>
       </footer>
    </div>
  );
};

export default PhotoViewer;
