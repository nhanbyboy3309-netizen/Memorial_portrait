
import React, { useRef } from 'react';
import { PhotoSize, AppConfig } from '../types';
import { t } from '../services/i18n';
import MobileCameraLink from './MobileCameraLink';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  selectedSize: PhotoSize;
  onSizeChange: (size: PhotoSize) => void;
  onHome?: () => void;
  config?: AppConfig;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, selectedSize, onSizeChange, onHome, config = {} as AppConfig }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMobileLink, setShowMobileLink] = React.useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) onCapture(event.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMobilePhoto = (dataUrl: string) => {
      setShowMobileLink(false);
      onCapture(dataUrl);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gray-50 dark:bg-gray-900 relative select-none overflow-hidden touch-none py-safe items-center justify-center p-6">

      {onHome && (
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20">
          <button onClick={onHome} className="px-3 py-2 md:px-4 md:py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-white dark:hover:bg-gray-700 hover:text-brand-600 dark:hover:text-brand-400 transition flex items-center gap-2 shadow-sm text-sm">
            <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l-7 7m-7 7h18"></path></svg>
            <span className="hidden sm:inline">{t('btn.home', config)}</span>
          </button>
        </div>
      )}

      {showMobileLink && (
        <MobileCameraLink 
            config={config as AppConfig}
            selectedSize={selectedSize}
            onPhotoReceived={handleMobilePhoto}
            onCancel={() => setShowMobileLink(false)}
        />
      )}

      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 text-center space-y-8 animate-fadeIn">
         <div>
            <div className="w-24 h-24 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm overflow-hidden">
                {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain p-3" referrerPolicy="no-referrer" />
                ) : (
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                )}
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('capture.msg.upload_prompt', config)}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Chụp ảnh từ máy tính đã bị tắt. Vui lòng tải ảnh lên.</p>
         </div>

         <div className="space-y-4">
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-brand-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
             >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                {t('capture.btn.upload', config)}
             </button>
             
             <button 
                onClick={() => setShowMobileLink(true)}
                className="w-full py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                {t('capture.device.mobile', config)}
             </button>
         </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
      
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeIn { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }`}</style>
    </div>
  );
};

export default CameraCapture;
