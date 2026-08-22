
import React from 'react';
import { AppConfig, PhotoSettings } from '../types';
import { t } from '../services/i18n';

interface EditorMakeupTabProps {
  config: AppConfig;
  settings: PhotoSettings;
  onAiBeautyChange: (key: keyof PhotoSettings['beauty'], value: any) => void;
}

const EditorMakeupTab: React.FC<EditorMakeupTabProps> = ({ config, settings, onAiBeautyChange }) => {
  const SliderTile = ({ id, label, icon }: any) => (
    <div className="bg-white dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase truncate">
            {icon} {label}
        </span>
        <span className="text-[9px] font-bold text-brand-600">{(settings.beauty as any)[id]}%</span>
      </div>
      <input 
        type="range" min="0" max="100" step="10" 
        value={(settings.beauty as any)[id]} 
        onChange={(e) => onAiBeautyChange(id as any, Number(e.target.value))} 
        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600" 
      />
    </div>
  );

  const ColorSelector = ({ label, options, colorKey, intensityKey, icon }: any) => (
    <div className="bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
          {icon} {label}
        </span>
        <span className="text-[9px] font-bold text-brand-600">{(settings.beauty as any)[intensityKey]}%</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {options.map((opt: any) => (
          <button 
            key={opt.id} 
            onClick={() => {
              onAiBeautyChange(colorKey, opt.id);
              if ((settings.beauty as any)[intensityKey] === 0) {
                onAiBeautyChange(intensityKey, 50);
              }
            }} 
            className={`group relative flex flex-col items-center gap-1 transition-all`}
          >
            <div 
              className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                (settings.beauty as any)[colorKey] === opt.id 
                ? 'border-brand-600 scale-110 shadow-md ring-2 ring-brand-500/20' 
                : 'border-white dark:border-slate-700 shadow-sm hover:scale-105'
              }`}
              style={{ backgroundColor: opt.hex === 'transparent' ? '#f1f5f9' : opt.hex }}
            >
              {opt.id === 'none' || opt.id === 'original' ? (
                <span className="text-[8px] font-black text-slate-400">✕</span>
              ) : (settings.beauty as any)[colorKey] === opt.id && (
                <svg className="w-3 h-3 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path>
                </svg>
              )}
            </div>
            <span className={`text-[7px] font-bold uppercase tracking-tighter ${(settings.beauty as any)[colorKey] === opt.id ? 'text-brand-600' : 'text-slate-400'}`}>
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      <input 
        type="range" min="0" max="100" step="10" 
        value={(settings.beauty as any)[intensityKey]} 
        onChange={(e) => onAiBeautyChange(intensityKey, Number(e.target.value))} 
        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600" 
      />
    </div>
  );

  return (
    <div className="space-y-3 animate-fadeIn pb-4">
      {/* Detail Sliders in 2 columns */}
      <div className="grid grid-cols-2 gap-2">
         <SliderTile id="eyebrowIntensity" label="Chân mày" icon="✒️" />
         <SliderTile id="eyelashIntensity" label="Lông mi" icon="👁️" />
         <SliderTile id="contourIntensity" label="Tạo khối" icon="🎭" />
         <SliderTile id="blemishIntensity" label="Mụn/Vết ố" icon="🧼" />
      </div>

      {/* Smooth Skin Row */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-inner">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Làm mịn da</span>
            <span className="text-[9px] font-bold text-brand-600">{settings.beauty.smoothSkin}%</span>
          </div>
          <input 
            type="range" min="0" max="100" step="20" 
            value={settings.beauty.smoothSkin} 
            onChange={(e) => onAiBeautyChange('smoothSkin', Number(e.target.value))} 
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600" 
          />
      </div>

      {/* Makeup Sections */}
      <div className="space-y-3">
        <ColorSelector 
          label="Màu môi" 
          icon="💄"
          options={config.lipstickOptions || []} 
          colorKey="lipstickColor" 
          intensityKey="lipstickIntensity" 
        />

        <ColorSelector 
          label="Màu má hồng" 
          icon="🌸"
          options={config.blushOptions || []} 
          colorKey="blushColor" 
          intensityKey="blushIntensity" 
        />

        <ColorSelector 
          label="Màu tóc" 
          icon="💇"
          options={config.hairColorOptions || []} 
          colorKey="hairColor" 
          intensityKey="hairVolume" 
        />
      </div>
    </div>
  );
};

export default EditorMakeupTab;
