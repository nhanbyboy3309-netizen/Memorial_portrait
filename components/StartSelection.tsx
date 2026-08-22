
import React from 'react';
import { PhotoSize, BackgroundType, AppConfig } from '../types';
import { t } from '../services/i18n';

interface StartSelectionProps {
  config: AppConfig;
  selectedSize: PhotoSize;
  selectedBg: BackgroundType;
  quantity: number;
  photoTypes: any[];
  onBgSelect: (bg: BackgroundType) => void;
  onQuantityChange: (q: number) => void;
  onStart: () => void;
  onSizeSelect: (size: PhotoSize) => void;
}

const StartSelection: React.FC<StartSelectionProps> = ({
  config, selectedSize, selectedBg, photoTypes, onBgSelect, onStart, onSizeSelect
}) => {
  return (
    <div className="w-full md:w-7/12 p-8 md:p-12 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
      <div className="mb-6 md:mb-8">
         <div className="flex items-center gap-3 mb-3 md:mb-4">
            <div className="h-10 w-10 md:h-14 md:w-14 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
              <img 
                src={config.logoUrl || "https://img.icons8.com/fluency/240/camera.png"} 
                alt="Logo" 
                className="w-full h-full object-contain p-1"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{config.shopName}</h1>
         </div>
        <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-[1.1] mb-3 md:mb-4 uppercase">
          Phục hồi ảnh thờ &<br/>Kỷ niệm AI
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-lg leading-relaxed font-medium">
            Hệ thống AI chuyên biệt giúp phục hồi ảnh cũ, làm nét, tô màu và tách nền tự động dành riêng cho ảnh thờ và ảnh kỷ niệm.
        </p>
      </div>

      <div className="space-y-8 md:space-y-10">
        {/* Size Selection */}
        <div>
          <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-4">CHỌN LOẠI PHỤC HỒI</label>
          <div className="grid grid-cols-1 gap-4">
            {photoTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => onSizeSelect(type.id)}
                className={`group relative flex items-center p-4 md:p-5 rounded-3xl border-2 transition-all duration-300 active:scale-[0.98] ${
                  selectedSize === type.id 
                    ? 'border-brand-600 bg-white dark:bg-slate-800 shadow-xl shadow-brand-600/10 z-10' 
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-gray-900/50 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                <div className={`p-3 rounded-2xl mr-4 transition-colors duration-300 ${selectedSize === type.id ? 'bg-brand-50 dark:bg-brand-900/30' : 'bg-white dark:bg-gray-800 shadow-sm'}`}>
                  {type.icon}
                </div>
                <div className="text-left flex-1">
                  <div className={`font-black text-base md:text-lg uppercase tracking-tight ${selectedSize === type.id ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200'}`}>{type.label}</div>
                  <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{type.dimensions}</div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${selectedSize === type.id ? 'border-brand-600 bg-brand-600 text-white scale-110 shadow-lg shadow-brand-600/20' : 'border-slate-200 dark:border-slate-700 text-transparent'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Background Selection */}
        <div>
          <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-4">CHỌN PHÔNG NỀN MẶC ĐỊNH</label>
          <div className="grid grid-cols-1 sm:flex gap-4">
            {[
              { type: BackgroundType.BLUE, label: 'Nền Xanh', hex: '#2792ff' },
              { type: BackgroundType.WHITE, label: 'Nền Trắng', hex: '#ffffff' },
              { type: BackgroundType.GRAY, label: 'Nền Xám', hex: '#d1d5db' }
            ].map(bg => (
              <button
                key={bg.type}
                onClick={() => onBgSelect(bg.type)}
                className={`flex-1 p-4 md:p-6 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-300 active:scale-95 relative overflow-hidden ${
                  selectedBg === bg.type 
                    ? 'border-brand-600 bg-white dark:bg-slate-800 shadow-xl shadow-brand-600/20 scale-[1.05] z-10' 
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-gray-900/50 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                {selectedBg === bg.type && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center shadow-sm animate-in zoom-in duration-300">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                )}
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-4 border-white dark:border-slate-700 shadow-inner shrink-0 transition-transform duration-500 group-hover:scale-110" style={{ backgroundColor: bg.hex }}></div>
                <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] ${selectedBg === bg.type ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>{bg.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold italic flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
            Bạn có thể thay đổi màu nền khác hoặc tải lên nền riêng trong bước chỉnh sửa.
          </p>
        </div>
      </div>

      <button onClick={onStart} className="w-full mt-6 md:mt-10 py-5 md:py-6 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white rounded-[2rem] font-black text-xl md:text-2xl shadow-[0_25px_50px_-12px_rgba(37,99,235,0.5)] transition-all duration-500 flex items-center justify-center gap-4 active:scale-95 group relative overflow-hidden">
        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
        <span className="relative z-10 tracking-[0.1em]">BẮT ĐẦU NGAY</span>
        <svg className="w-6 h-6 md:w-8 md:h-8 relative z-10 group-hover:translate-x-2 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
      </button>
      
      <p className="text-center mt-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Powered by Photo Moments AI</p>
    </div>
  );
};

export default StartSelection;
