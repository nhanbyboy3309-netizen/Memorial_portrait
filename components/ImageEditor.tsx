
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BackgroundType, PhotoSettings, PhotoSize, AppConfig, SkinToneType } from '../types';
import { processIDPhoto } from '../services/geminiService';
import { t } from '../services/i18n';

// Sub-components
import EditorClothingTab from './EditorClothingTab';
import EditorMakeupTab from './EditorMakeupTab';
import EditorFilterTab from './EditorFilterTab';
import EditorRestorationTab from './EditorRestorationTab';
import EditorInfoTab from './EditorInfoTab';
import EditorBackgroundTab from './EditorBackgroundTab';
import ManualCropper from './ManualCropper'; 
import EditHistorySidebar, { HistoryItem } from './EditHistorySidebar';

interface ImageEditorProps {
  originalImage: string;
  settings: PhotoSettings;
  onUpdateSettings: (newSettings: PhotoSettings) => void;
  onProcessedImage: (img: string) => void;
  onNext: () => void;
  onRetake: () => void;
  config: AppConfig;
}

type EditorTab = 'crop' | 'background' | 'beauty' | 'clothing' | 'makeup' | 'restoration' | 'info';

const ImageEditor: React.FC<ImageEditorProps> = ({ 
  originalImage, 
  settings, 
  onUpdateSettings, 
  onProcessedImage,
  onNext,
  onRetake,
  config
}) => {
  const [baseImage, setBaseImage] = useState<string>(originalImage);
  const [processedUrl, setProcessedUrl] = useState<string>(originalImage);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('background');
  const [loadingAction, setLoadingAction] = useState<string>('');
  const [isCropping, setIsCropping] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Edit History State
  const [editHistory, setEditHistory] = useState<HistoryItem[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);

  const getAiSettingsHash = useCallback((s: PhotoSettings) => {
    const beauty = s.beauty;
    return JSON.stringify({
       background: s.background,
       customBg: s.customBackgroundColor,
       cloth: s.clothingPrompt,
       customPrompt: s.customAiPrompt, // Added custom prompt to hash
       blemish: beauty.blemishIntensity,
       smooth: beauty.smoothSkin,
       restore: beauty.restorationIntensity,
       colorize: beauty.colorizeIntensity,
       sharpen: beauty.sharpenIntensity,
       gender: beauty.restorationGender,
       age: beauty.restorationAge,
       makeup: [beauty.lipstickColor, beauty.lipstickIntensity, beauty.blushColor, beauty.blushIntensity, beauty.eyebrowIntensity, beauty.eyelashIntensity, beauty.contourIntensity]
    });
  }, []);

  const getRawStateHash = useCallback(() => {
     return JSON.stringify({
       background: settings.background, 
       customBg: settings.customBackgroundColor,
       cloth: undefined,
       customPrompt: undefined,
       blemish: 0,
       smooth: 0,
       restore: 0,
       colorize: 0,
       sharpen: 0,
       gender: undefined,
       age: undefined
     });
  }, [settings.background, settings.customBackgroundColor]);

  const [appliedHash, setAppliedHash] = useState<string>(getRawStateHash());

  const hasPendingAiChanges = useMemo(() => {
    const currentHash = getAiSettingsHash(settings);
    return currentHash !== appliedHash;
  }, [settings, appliedHash, getAiSettingsHash]);

  const handleApplyAiChanges = useCallback(async () => {
    const currentHash = getAiSettingsHash(settings);
    setIsProcessing(true);
    setLoadingAction(t('editor.loading', config));
    
    try {
      const result = await processIDPhoto(
          baseImage, 
          settings.background, 
          settings.clothingPrompt, 
          settings.beauty, 
          settings.size,
          settings.customBackgroundColor,
          settings.customAiPrompt
      );
      setProcessedUrl(result);
      setAppliedHash(currentHash);

      // Update history
      const newHistoryItem = { url: result, timestamp: Date.now(), label: 'Chỉnh sửa AI' };
      setEditHistory(prev => [...prev, newHistoryItem]);
      setCurrentHistoryIndex(editHistory.length);

    } catch (err: any) {
      console.error(err);
      const isPermissionDenied = err.message === "PERMISSION_DENIED" || (err.message && err.message.includes("403"));
      
      if (isPermissionDenied) {
        const message = "Lỗi quyền truy cập AI (403). Có thể API Key của bạn không hợp lệ, chưa bật thanh toán, hoặc không có quyền sử dụng model này. Bạn có muốn chọn lại API Key khác?";
        if (confirm(message)) {
          if ((window as any).aistudio?.openSelectKey) {
            await (window as any).aistudio.openSelectKey();
            alert("Đã cập nhật Key. Vui lòng nhấn 'Áp dụng AI' lần nữa.");
          } else {
            alert("Vui lòng kiểm tra lại API Key trong phần Cài đặt của AI Studio.");
          }
        }
      } else if (err.message === "MODEL_NOT_FOUND" || (err.message && err.message.includes("404"))) {
        alert("Lỗi: Không tìm thấy model AI. Vui lòng chọn lại API Key hợp lệ.");
        if ((window as any).aistudio?.openSelectKey) {
          await (window as any).aistudio.openSelectKey();
        }
      } else {
        alert("Lỗi xử lý ảnh: " + (err.message || "Không xác định"));
      }
    } finally {
      setIsProcessing(false);
      setLoadingAction('');
    }
  }, [settings, baseImage, getAiSettingsHash, config, editHistory]); 

  const handleSelectHistory = (item: HistoryItem, index: number) => {
    setProcessedUrl(item.url);
    setCurrentHistoryIndex(index);
  };

  const handleClothingClick = (prompt: string) => onUpdateSettings({ ...settings, clothingPrompt: prompt });
  const handleAiBeautyChange = (key: keyof typeof settings.beauty, value: any) => onUpdateSettings({ ...settings, beauty: { ...settings.beauty, [key]: value } });
  const handleClientBeautyChange = (key: keyof typeof settings.beauty, value: any) => onUpdateSettings({ ...settings, beauty: { ...settings.beauty, [key]: value } });
  const handleBgChange = (bgType: BackgroundType, hex?: string) => onUpdateSettings({ ...settings, background: bgType, customBackgroundColor: hex });

  const imageFilters = useMemo(() => {
    const { lighting, contrast, skinToneIntensity, skinToneType } = settings.beauty;
    const brightnessVal = 100 + (lighting * 1.5); 
    const contrastVal = 100 + (contrast * 1.5);
    let sepia = 0, hue = 0, saturate = 100;
    if (skinToneIntensity > 0) {
        if (skinToneType === SkinToneType.TAN) { sepia = skinToneIntensity * 0.3; saturate = 100 - (skinToneIntensity * 0.1); }
        else if (skinToneType === SkinToneType.ROSY) { sepia = skinToneIntensity * 0.15; hue = -10; saturate = 100 + (skinToneIntensity * 0.1); }
        else if (skinToneType === SkinToneType.FAIR) { saturate = 100 - (skinToneIntensity * 0.1); }
    }
    return `brightness(${brightnessVal}%) contrast(${contrastVal}%) saturate(${saturate}%) sepia(${sepia}%) hue-rotate(${hue}deg)`;
  }, [settings.beauty]);

  const handleFinish = () => {
    const finishExport = (imgSrc: string) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imgSrc;
        img.onload = () => {
            canvas.width = img.width; canvas.height = img.height;
            if (ctx) { ctx.filter = imageFilters; ctx.drawImage(img, 0, 0, canvas.width, canvas.height); onProcessedImage(canvas.toDataURL('image/png', 1.0)); onNext(); }
        };
    };
    if (hasPendingAiChanges) {
        if (confirm("Có thay đổi AI chưa áp dụng. Bạn có muốn áp dụng ngay?")) {
            handleApplyAiChanges().then(() => finishExport(processedUrl));
        } else { finishExport(processedUrl); }
    } else { finishExport(processedUrl); }
  };

  const startCrop = () => setIsCropping(true);
  const handleCropConfirm = (croppedImg: string) => {
    setBaseImage(croppedImg); 
    setProcessedUrl(croppedImg);
    setAppliedHash(''); 
    setIsCropping(false);
    setEditHistory([]);
    setCurrentHistoryIndex(-1);
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans"
       onMouseUp={() => { isDraggingRef.current = false; }}
       onTouchEnd={() => { isDraggingRef.current = false; }}
    >
      {isCropping && (
        <ManualCropper 
            imageSrc={processedUrl}
            photoSize={settings.size}
            onCancel={() => setIsCropping(false)}
            onConfirm={handleCropConfirm}
        />
      )}

      {/* Sidebar Controls */}
      <div className="w-full md:w-[400px] bg-white dark:bg-slate-900 shadow-[20px_0_50px_rgba(0,0,0,0.05)] z-20 flex flex-col h-[55dvh] md:h-full border-t md:border-t-0 md:border-r border-slate-200 dark:border-slate-800 shrink-0 order-2 md:order-1">
        
        {/* Header - Compact (Desktop Only) */}
        <div className="hidden md:flex px-6 py-5 border-b border-slate-100 dark:border-slate-800 justify-between items-center shrink-0">
          <div className="flex flex-col">
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Biên tập ảnh</h2>
              <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">ID Engine v2.5.2</span>
          </div>
          <button onClick={onRetake} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 border border-slate-200 dark:border-slate-700">
            Quay lại
          </button>
        </div>

        {/* Improved Tabs Navigation - Compact */}
        <div className="px-2 md:px-4 py-2 md:py-3 shrink-0 border-b border-slate-50 dark:border-slate-800 overflow-x-auto scrollbar-hide">
          <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl gap-1 min-w-max">
            {[
              {id: 'crop', label: 'Cắt', icon: '✂️'},
              {id: 'background', label: 'Nền', icon: '🖼️'},
              {id: 'restoration', label: 'Cũ', icon: '🕰️'},
              {id: 'clothing', label: 'Áo', icon: '👔'},
              {id: 'makeup', label: 'Makeup', icon: '✨'},
              {id: 'beauty', label: 'Filter', icon: '🎨'},
              {id: 'info', label: 'Info', icon: '📝'}
            ].map((tab) => {
               const isActive = activeTab === tab.id;
               return (
                  <button 
                    key={tab.id} 
                    onClick={() => tab.id === 'crop' ? startCrop() : setActiveTab(tab.id as any)} 
                    className={`flex flex-col items-center justify-center min-w-[50px] md:min-w-[55px] py-1.5 md:py-2 rounded-xl transition-all duration-500 relative ${
                       isActive && tab.id !== 'crop'
                       ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.15)] scale-110 z-10' 
                       : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <span className="text-base md:text-lg mb-0.5">{tab.icon}</span>
                    <span className="text-[7px] md:text-[8px] font-black uppercase tracking-tighter">
                       {tab.label}
                    </span>
                  </button>
               );
            })}
          </div>
        </div>

        {/* Tab Content Area - Controlled Height */}
        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-900 scrollbar-hide animate-fadeIn">
          {activeTab === 'background' && <EditorBackgroundTab config={config} settings={settings} onBgChange={handleBgChange} />}
          {activeTab === 'restoration' && (
            <EditorRestorationTab 
                config={config} 
                settings={settings} 
                onAiBeautyChange={handleAiBeautyChange} 
                onUpdateSettings={onUpdateSettings} 
            />
          )}
          {activeTab === 'clothing' && <EditorClothingTab config={config} settings={settings} onClothingClick={handleClothingClick} />}
          {activeTab === 'makeup' && <EditorMakeupTab config={config} settings={settings} onAiBeautyChange={handleAiBeautyChange} />}
          {activeTab === 'beauty' && <EditorFilterTab settings={settings} onClientBeautyChange={handleClientBeautyChange} />}
          {activeTab === 'info' && <EditorInfoTab config={config} settings={settings} onUpdateSettings={onUpdateSettings} />}
        </div>

        {/* Actions Area - Fixed at bottom */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl space-y-3 shrink-0 pb-safe">
          <div className="flex gap-2">
            {hasPendingAiChanges ? (
                <button 
                    onClick={handleApplyAiChanges} 
                    disabled={isProcessing} 
                    className="flex-1 py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-300"
                >
                {isProcessing ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : "Áp dụng AI"} 
                </button>
            ) : (
                <div className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-green-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200/50">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                Đã đồng bộ
                </div>
            )}
            
            <button 
                onClick={handleFinish} 
                disabled={isProcessing} 
                className="flex-1 py-4 bg-slate-900 dark:bg-brand-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all duration-300 flex items-center justify-center gap-1"
            >
                Hoàn tất
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Preview Workspace */}
      <div className="flex-1 bg-slate-200 dark:bg-slate-950 relative flex items-center justify-center p-4 md:p-8 h-[45dvh] md:h-full shrink-0 order-1 md:order-2">
        {/* Mobile Retake Button */}
        <button onClick={onRetake} className="md:hidden absolute top-4 left-4 z-30 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-600 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">
          Chụp lại
        </button>
        {isProcessing && (
          <div className="absolute inset-0 z-40 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl flex flex-col items-center border border-white/10 max-w-[240px] text-center">
              <div className="w-10 h-10 border-4 border-brand-200 dark:border-brand-900 border-t-brand-600 dark:border-t-brand-400 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-widest">{loadingAction}</p>
            </div>
          </div>
        )}
        
        {/* Comparison Image Container */}
        <div ref={imageContainerRef} className="relative shadow-2xl rounded-2xl md:rounded-[2rem] border-[4px] md:border-[10px] border-white dark:border-slate-800 bg-white dark:bg-slate-800 overflow-hidden max-h-full max-w-full cursor-col-resize touch-none group"
             style={{ aspectRatio: '2/3', height: '100%', maxHeight: '100%' }}
             onMouseDown={() => { isDraggingRef.current = true; }}
             onTouchStart={() => { isDraggingRef.current = true; }}
             onMouseMove={(e) => {
               if (isDraggingRef.current && imageContainerRef.current) {
                  const rect = imageContainerRef.current.getBoundingClientRect();
                  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                  setSliderPosition((x / rect.width) * 100);
               }
             }}
             onTouchMove={(e) => {
               if (isDraggingRef.current && imageContainerRef.current) {
                  const rect = imageContainerRef.current.getBoundingClientRect();
                  const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
                  setSliderPosition((x / rect.width) * 100);
               }
             }}
        >
          <img src={baseImage} className="absolute inset-0 w-full h-full object-contain pointer-events-none" alt="Original" />
          <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
             <img src={processedUrl} className="absolute inset-0 w-full h-full object-contain" style={{ filter: imageFilters }} alt="Processed" />
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-white z-30 shadow-[0_0_10px_rgba(0,0,0,0.3)]" style={{ left: `${sliderPosition}%` }}>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-brand-600 transition-transform group-hover:scale-110">
              <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
            </div>
          </div>
        </div>
      </div>

      {/* History Sidebar */}
      <EditHistorySidebar 
        history={editHistory}
        onSelect={handleSelectHistory}
        currentIndex={currentHistoryIndex}
      />
    </div>
  );
};

export default ImageEditor;
