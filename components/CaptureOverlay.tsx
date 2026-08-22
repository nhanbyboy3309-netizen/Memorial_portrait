import React from 'react';
import { PhotoSize, AppConfig } from '../types';
import { t } from '../services/i18n';

interface CaptureOverlayProps {
  selectedSize: PhotoSize;
  validationStatus: string;
  aiLimitReached: boolean;
  topMarginPercent: number;
  marginText: string;
  getOverlayColor: () => string;
  config?: AppConfig;
}

const CaptureOverlay: React.FC<CaptureOverlayProps> = ({
  selectedSize, validationStatus, aiLimitReached, getOverlayColor, config = { language: 'vi' } as AppConfig
}) => {
  const overlayColor = getOverlayColor();

  return (
    <div className="relative z-10 w-full h-full">
      {(validationStatus === 'searching' || validationStatus === 'analyzing') && !aiLimitReached && (
        <div className="absolute top-0 left-0 w-full h-1 bg-white/80 shadow-[0_0_15px_rgba(255,255,255,1)] animate-[scan_1.5s_ease-in-out_infinite]" />
      )}

      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-90 pointer-events-none transition-colors duration-300">
         <defs>
           <mask id="docMask">
             <rect x="0" y="0" width="100" height="100" fill="white" />
             {/* Rectangular hole for document scanning */}
             <rect x="15" y="15" width="70" height="70" fill="black" rx="2" ry="2" />
           </mask>
         </defs>

         <rect x="0" y="0" width="100" height="100" fill="rgba(0,0,0,0.6)" mask="url(#docMask)" />

         {/* Corner Markers */}
         <path d="M15 25 V15 H25" stroke={overlayColor} strokeWidth="1" fill="none" />
         <path d="M75 25 V15 H85" stroke={overlayColor} strokeWidth="1" fill="none" transform="translate(85, 0) scale(-1, 1) translate(-85, 0)" />
         <path d="M15 75 V85 H25" stroke={overlayColor} strokeWidth="1" fill="none" />
         <path d="M75 75 V85 H85" stroke={overlayColor} strokeWidth="1" fill="none" transform="translate(85, 0) scale(-1, 1) translate(-85, 0)" />

         {/* Center Crosshair */}
         <line x1="50" y1="48" x2="50" y2="52" stroke="white" strokeWidth="0.5" />
         <line x1="48" y1="50" x2="52" y2="50" stroke="white" strokeWidth="0.5" />
         
         {/* Guides */}
         <rect x="15" y="15" width="70" height="70" fill="none" stroke={overlayColor} strokeWidth="0.2" strokeDasharray="2,2" rx="2" />

         <text x="50" y="12" fill="white" fontSize="3" textAnchor="middle" fontWeight="bold" style={{textShadow: '0 1px 2px black'}}>
           ĐẶT ẢNH CŨ VÀO KHUNG
         </text>
         
         <text x="50" y="90" fill="white" fontSize="2.5" textAnchor="middle" fontWeight="bold" style={{textShadow: '0 1px 2px black'}}>
           KHỔ 20x30 (A4)
         </text>
      </svg>
    </div>
  );
};

export default CaptureOverlay;