
import React from 'react';
import { PhotoSettings, SkinToneType } from '../types';
import { t } from '../services/i18n';
import { getConfig } from '../services/configService';

interface EditorFilterTabProps {
  settings: PhotoSettings;
  onClientBeautyChange: (key: keyof PhotoSettings['beauty'], value: any) => void;
}

const EditorFilterTab: React.FC<EditorFilterTabProps> = ({ settings, onClientBeautyChange }) => {
  const config = getConfig();
  const SkinToneOptions = [
    { id: SkinToneType.NATURAL, label: 'Gốc', color: '#e5cba6' },
    { id: SkinToneType.FAIR, label: 'Trắng', color: '#fcebe3' },
    { id: SkinToneType.ROSY, label: 'Hồng', color: '#ffdee8' },
    { id: SkinToneType.TAN, label: 'Ngăm', color: '#cd9b75' },
  ];

  const QuickAdjust = ({ label, id, value, min, max }: any) => (
    <div className="bg-white dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center mb-1 px-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${value > 0 ? 'bg-orange-500 text-white' : value < 0 ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'}`}>
                {value > 0 ? `+${value}` : value}
            </span>
        </div>
        <input 
            type="range" min={min} max={max} step="5" 
            value={value} 
            onChange={(e) => onClientBeautyChange(id, Number(e.target.value))} 
            className="w-full" 
        />
        <div className="flex justify-between mt-0.5">
            <button onClick={() => onClientBeautyChange(id, 0)} className="text-[7px] font-black text-brand-600 uppercase hover:underline ml-1">Reset</button>
        </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 2 Sliders in one row */}
      <div className="grid grid-cols-1 gap-2">
         <QuickAdjust label="Độ sáng" id="lighting" value={settings.beauty.lighting} min="-50" max="50" />
         <QuickAdjust label="Tương phản" id="contrast" value={settings.beauty.contrast} min="-50" max="50" />
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Tông màu da</label>
        <div className="grid grid-cols-4 gap-2 mb-3 px-1">
          {SkinToneOptions.map(tone => (
            <button 
              key={tone.id} 
              onClick={() => { onClientBeautyChange('skinToneType', tone.id); onClientBeautyChange('skinToneIntensity', 30); }} 
              className={`flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all ${
                settings.beauty.skinToneType === tone.id 
                  ? 'bg-brand-50 dark:bg-brand-900/30 ring-2 ring-brand-500' 
                  : 'bg-white dark:bg-slate-800'
              }`}
            >
              <div className="w-5 h-5 rounded-full border shadow-inner" style={{ backgroundColor: tone.color }}></div>
              <span className={`text-[8px] font-black uppercase ${settings.beauty.skinToneType === tone.id ? 'text-brand-700' : 'text-gray-400'}`}>
                {tone.label}
              </span>
            </button>
          ))}
        </div>
        
        {settings.beauty.skinToneIntensity > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 animate-fadeIn">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase ml-1">Cường độ tông màu</span>
                    <span className="text-[9px] font-black text-brand-600 mr-1">{settings.beauty.skinToneIntensity}%</span>
                 </div>
                 <input 
                  type="range" min="0" max="100" step="10" 
                  value={settings.beauty.skinToneIntensity} 
                  onChange={(e) => onClientBeautyChange('skinToneIntensity', Number(e.target.value))} 
                  className="w-full" 
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default EditorFilterTab;
