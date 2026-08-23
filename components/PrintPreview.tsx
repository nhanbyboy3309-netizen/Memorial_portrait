
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PhotoSettings, PhotoSize, AppConfig, BackgroundType } from '../types';
import { savePhotoToCloud } from '../services/databaseService';
import { t } from '../services/i18n';

// Sub-components
import PrintSidebar from './PrintSidebar';
import PrintSheetView from './PrintSheetView';

interface PrintPreviewProps {
  processedImage: string;
  size: PhotoSize;
  settings: PhotoSettings;
  onBack: () => void;
  onNew: () => void;
  onSaved?: () => void;
  onHome: () => void;
  config: AppConfig;
}

const PrintPreview: React.FC<PrintPreviewProps> = ({ 
  processedImage, size, settings, onBack, onNew, onHome, config
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [realPhotoId, setRealPhotoId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [sheetImages, setSheetImages] = useState<string[]>([]);
  const [printImages, setPrintImages] = useState<string[]>([]); 

  const totalSheets = settings.printQuantity; 

  const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((res, rej) => { const img = new Image(); img.crossOrigin="anonymous"; img.onload=()=>res(img); img.onerror=rej; img.src=src; });

  const generateSheetCanvas = async (sheetIdx: number, photoImg: HTMLImageElement, logoImg: HTMLImageElement | null, qrImg: HTMLImageElement | null): Promise<string> => {
        const DPI = 300; 
        const MM_TO_PX = DPI / 25.4;
        
        // Setup A4 Canvas (210x297mm)
        const SHEET_WIDTH_MM = 210;
        const SHEET_HEIGHT_MM = 297;

        const canvas = document.createElement('canvas'); 
        canvas.width = Math.ceil(SHEET_WIDTH_MM * MM_TO_PX); 
        canvas.height = Math.ceil(SHEET_HEIGHT_MM * MM_TO_PX);
        
        const ctx = canvas.getContext('2d'); if (!ctx) throw new Error();
        
        // Fill White A4 Background
        ctx.fillStyle = '#ffffff'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Determine Layout based on Size
        if (size === PhotoSize.SIZE_20X30) {
            // === 20x30 LAYOUT (Single Photo) ===
            const PHOTO_WIDTH_MM = 200;
            const PHOTO_HEIGHT_MM = 300;
            
            const photoW = PHOTO_WIDTH_MM * MM_TO_PX;
            const photoH = PHOTO_HEIGHT_MM * MM_TO_PX;
            
            // Center photo on A4 Canvas
            const photoX = (canvas.width - photoW) / 2;
            const photoY = (canvas.height - photoH) / 2;
            
            ctx.save();
            // Handle Background Color override if needed
            const bgCol = settings.background === BackgroundType.ORIGINAL ? null : (config.backgroundConfig.find(b => b.type === settings.background)?.hexColor || '#ffffff');
            if (bgCol) { 
                ctx.fillStyle = bgCol; 
                ctx.fillRect(photoX, photoY, photoW, photoH); 
            }
            
            ctx.drawImage(photoImg, photoX, photoY, photoW, photoH);
            ctx.restore();
            
            // === FOOTER LOGIC (Overlay on Photo) ===
            const hasCustomInfo = settings.info?.enabled && settings.info?.text?.trim().length > 0;
            const footerHeightMM = hasCustomInfo ? 30 : 20; 
            const footerHeightPx = footerHeightMM * MM_TO_PX;
            
            // Footer aligns to bottom of paper, but we want to restrict width to photo width
            const footerY = canvas.height - footerHeightPx;

            // Draw Footer Background (White Overlay) RESTRICTED TO PHOTO WIDTH
            ctx.fillStyle = '#ffffff'; 
            ctx.fillRect(photoX, footerY, photoW, footerHeightPx);
            
            // Top Border of Footer
            ctx.beginPath(); ctx.moveTo(photoX, footerY); ctx.lineTo(photoX + photoW, footerY); 
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke();
            
            // Draw Footer Content (Logo, Text, QR)
            const paddingMM = 5;
            const paddingPx = paddingMM * MM_TO_PX;
            
            // Calculate content area bounds based on photo width
            const contentLeft = photoX + paddingPx;
            const contentRight = photoX + photoW - paddingPx;
            
            // --- LOGO & SHOP NAME (Left Stacked) ---
            let leftContentRightX = contentLeft;
            
            if (logoImg) {
                const logoHeightMM = hasCustomInfo ? 15 : 10;
                const logoH = logoHeightMM * MM_TO_PX;
                const logoW = logoImg.width * (logoH / logoImg.height);
                
                const shopNameSize = footerHeightPx * 0.10; 
                ctx.font = `bold ${shopNameSize}px sans-serif`;
                const shopNameW = ctx.measureText(config.shopName).width;
                
                const maxWidth = Math.max(logoW, shopNameW);
                const gap = 2 * MM_TO_PX; 
                const totalGroupH = logoH + gap + shopNameSize;
                const groupStartY = footerY + (footerHeightPx - totalGroupH) / 2;
                const groupCenterX = contentLeft + maxWidth / 2;
                
                ctx.drawImage(logoImg, groupCenterX - logoW / 2, groupStartY, logoW, logoH);
                
                ctx.fillStyle = settings.info?.color || '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(config.shopName, groupCenterX, groupStartY + logoH + gap);
                
                leftContentRightX += maxWidth + paddingPx;
            } else {
                ctx.fillStyle = settings.info?.color || '#000000';
                const fontSize = hasCustomInfo ? 8 * MM_TO_PX : 6 * MM_TO_PX;
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(config.shopName, contentLeft, footerY + footerHeightPx / 2);
                leftContentRightX += ctx.measureText(config.shopName).width + paddingPx;
            }

            // --- QR (Right) ---
            const qrSizeMM = hasCustomInfo ? 18 : 12; 
            const qrSize = qrSizeMM * MM_TO_PX; 
            const qrX = contentRight - qrSize;
            const qrY = footerY + (footerHeightPx - qrSize) / 2;
            
            if (qrImg) {
                ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
            }

            // --- CENTER CONTENT ---
            const contentStartX = leftContentRightX;
            const contentEndX = qrX - paddingPx;
            const contentWidth = contentEndX - contentStartX;
            const centerY = footerY + footerHeightPx / 2;

            ctx.fillStyle = settings.info?.color || '#000000';
            
            if (hasCustomInfo) {
                const fontSizePt = settings.info.fontSize || 20;
                const fontSizePx = fontSizePt * 1.33 * (DPI / 96); 
                ctx.font = `bold ${fontSizePx}px sans-serif`;
                ctx.textBaseline = 'middle';
                
                const text = settings.info.text;
                const alignment = settings.info.alignment || 'center';
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
            // === TILING LAYOUT (3x4, 4x6, 5x5) ===
            let itemW_mm = 0;
            let itemH_mm = 0;
            
            if (size === PhotoSize.SIZE_3X4) { itemW_mm = 30; itemH_mm = 40; }
            else if (size === PhotoSize.SIZE_4X6) { itemW_mm = 40; itemH_mm = 60; }
            else if (size === PhotoSize.SIZE_5X5) { itemW_mm = 50; itemH_mm = 50; }

            const itemW_px = itemW_mm * MM_TO_PX;
            const itemH_px = itemH_mm * MM_TO_PX;
            const gap_mm = 2; // 2mm gap
            const gap_px = gap_mm * MM_TO_PX;
            
            const margin_top_mm = 10;
            const margin_left_mm = 10;
            const margin_top_px = margin_top_mm * MM_TO_PX;
            const margin_left_px = margin_left_mm * MM_TO_PX;

            // Calculate grid
            const usableW = canvas.width - (margin_left_px * 2);
            const usableH = canvas.height - (margin_top_px * 2);
            
            const cols = Math.floor((usableW + gap_px) / (itemW_px + gap_px));
            const rows = Math.floor((usableH + gap_px) / (itemH_px + gap_px));

            const bgCol = settings.background === BackgroundType.ORIGINAL ? null : (config.backgroundConfig.find(b => b.type === settings.background)?.hexColor || '#ffffff');

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x = margin_left_px + c * (itemW_px + gap_px);
                    const y = margin_top_px + r * (itemH_px + gap_px);
                    
                    ctx.save();
                    // Draw cutting guides (light border)
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, itemW_px, itemH_px);

                    // Draw Background
                    if (bgCol) {
                        ctx.fillStyle = bgCol;
                        ctx.fillRect(x, y, itemW_px, itemH_px);
                    }
                    
                    // Draw Photo
                    ctx.drawImage(photoImg, x, y, itemW_px, itemH_px);
                    ctx.restore();
                }
            }

            // Draw Small Footer at bottom of A4
            const footerY = canvas.height - (15 * MM_TO_PX);
            ctx.fillStyle = '#000000';
            ctx.font = `12px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const dateStr = new Date().toLocaleString('vi-VN');
            ctx.fillText(`${config.shopName} - ${size} - ${dateStr}`, canvas.width / 2, canvas.height - 20);
        }
        
        return canvas.toDataURL('image/png');
  };

  useEffect(() => {
     // Generate the printable sheets as soon as the photo is ready, regardless of
     // whether the cloud save (below) has finished or even succeeded — this used
     // to be gated on qrUrl, which only gets set after a successful cloud save,
     // so a failed/slow cloud save left the whole print screen stuck on its
     // loading spinner forever with no image to print or download.
     (async () => {
         try {
             const [p, l, q] = await Promise.all([
                 loadImage(processedImage),
                 config.logoUrl ? loadImage(config.logoUrl).catch(() => null) : null,
                 qrUrl ? loadImage(qrUrl).catch(() => null) : null
             ]);

             // Generate Sheets
             const sheets = [];
             for (let i = 0; i < totalSheets; i++) sheets.push(await generateSheetCanvas(i, p, l, q));
             setSheetImages(sheets);
             setPrintImages(sheets);

         } catch {}
     })();
  }, [qrUrl, processedImage, totalSheets, config]);

  useEffect(() => {
    (async () => {
      setIsSaving(true);
      const uniqueId = `IMG_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const savedId = await savePhotoToCloud({ id: uniqueId, dataUrl: processedImage, timestamp: Date.now(), settings });
      if (savedId) {
          setRealPhotoId(savedId);
          const v = `${window.location.href.split('?')[0]}?photoId=${savedId}`;
          setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(v)}&ecc=H`);
      } else {
          setSaveError(true);
      }
      setIsSaving(false);
    })();
  }, []);

  const handleDownload = () => { sheetImages.forEach((d, i) => { const l = document.createElement('a'); l.href = d; l.download = `A4-Photo-Sheet-${i+1}.png`; l.click(); }); };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-gray-900 relative min-h-[100dvh]">
      {document.getElementById('print-mount') && createPortal(<div className="print-portal-root">{printImages.map((s, i) => <div key={i} className="sheet-page"><img src={s} alt="" /></div>)}</div>, document.getElementById('print-mount')!)}
      
      <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center z-20 shrink-0 sticky top-0">
        <h1 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">🖨️ {t('print.header', config)}</h1>
        <button onClick={onBack} className="px-3 py-1.5 md:px-4 md:py-2 text-sm font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg">{t('btn.back', config)}</button>
      </header>
      
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto flex flex-col md:flex-row p-4 md:p-8 gap-8 bg-slate-100 dark:bg-gray-900 pb-safe">
        
        {/* Preview Area (Shows FULL A4 images) */}
        <div className="w-full flex-1 flex flex-col items-center">
             <PrintSheetView sheetImages={sheetImages} isSaving={isSaving} config={config} />
        </div>
        
        {/* Controls Area (Stacked at bottom on mobile) */}
        <div className="w-full md:w-80 shrink-0">
            <PrintSidebar
                photoId={realPhotoId}
                isSaving={isSaving}
                saveError={saveError}
                sheetImages={sheetImages}
                qrUrl={qrUrl}
                settings={settings}
                config={config}
                onPrint={() => window.print()}
                onDownload={handleDownload}
                onHome={onHome}
            />
        </div>
      </div>
    </div>
  );
};

export default PrintPreview;
