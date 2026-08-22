
import React from 'react';
import { PhotoSettings, AppConfig } from '../types';
import { t } from '../services/i18n';

interface EditorRestorationTabProps {
  config: AppConfig;
  settings: PhotoSettings;
  onAiBeautyChange: (key: keyof PhotoSettings['beauty'], value: any) => void;
  onUpdateSettings?: (newSettings: PhotoSettings) => void;
}

const EditorRestorationTab: React.FC<EditorRestorationTabProps> = ({ config, settings, onAiBeautyChange, onUpdateSettings }) => {
  const ControlBox = ({ id, label, icon, colorClass }: any) => (
    <div className="bg-gray-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 transition-all hover:border-brand-300">
        <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                {icon} {label}
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${colorClass}`}>
                {(settings.beauty as any)[id]}%
            </span>
        </div>
        <input 
            type="range" min="0" max="100" step="10" 
            value={(settings.beauty as any)[id]} 
            onChange={(e) => onAiBeautyChange(id as any, Number(e.target.value))} 
            className="w-full" 
        />
    </div>
  );

  return (
    <div className="space-y-4 animate-fadeIn">
       {/* Compact Demographics Section */}
       <div className="grid grid-cols-2 gap-2 bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-2xl border border-orange-100 dark:border-orange-800/20">
           <div>
               <label className="block text-[8px] font-black text-orange-800 dark:text-orange-400 uppercase mb-1.5 ml-1">Giới tính</label>
               <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-orange-100 dark:border-slate-800">
                   {['male', 'female'].map((g) => (
                       <button
                           key={g}
                           onClick={() => onAiBeautyChange('restorationGender', g)}
                           className={`flex-1 py-1 rounded-md font-bold text-[9px] uppercase transition-all ${
                               settings.beauty.restorationGender === g
                               ? 'bg-brand-600 text-white shadow-sm'
                               : 'text-gray-400'
                           }`}
                       >
                           {g === 'male' ? 'Nam' : 'Nữ'}
                       </button>
                   ))}
               </div>
           </div>

           <div>
               <label className="block text-[8px] font-black text-orange-800 dark:text-orange-400 uppercase mb-1.5 ml-1">Độ tuổi</label>
               <select 
                  value={settings.beauty.restorationAge || ''}
                  onChange={(e) => onAiBeautyChange('restorationAge', e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-orange-100 dark:border-slate-800 text-[9px] font-bold rounded-lg py-1 px-1 outline-none appearance-none text-center"
               >
                  <option value="">Chọn...</option>
                  <option value="baby">Trẻ nhỏ</option>
                  <option value="young">Thanh niên</option>
                  <option value="middle">Trung niên</option>
                  <option value="old">Người già</option>
               </select>
           </div>
       </div>

       {/* Sliders Grid - No more long vertical list */}
       <div className="grid grid-cols-1 gap-2">
            <ControlBox id="restorationIntensity" label="Phục hồi" icon="✨" colorClass="bg-brand-600 text-white" />
            <div className="grid grid-cols-2 gap-2">
                <ControlBox id="colorizeIntensity" label="Tô màu" icon="🎨" colorClass="bg-purple-600 text-white" />
                <ControlBox id="sharpenIntensity" label="Làm nét" icon="🔪" colorClass="bg-teal-600 text-white" />
            </div>
       </div>

       {/* Custom AI Prompt Section */}
       {onUpdateSettings && (
           <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                   <span>🤖</span> Mô tả tùy chỉnh (AI Prompts)
               </label>
               <textarea 
                   className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 outline-none h-16 resize-none"
                   placeholder="VD: Làm tóc gọn gàng hơn, chỉnh cà vạt thẳng..."
                   value={settings.customAiPrompt || ''}
                   onChange={(e) => onUpdateSettings({ ...settings, customAiPrompt: e.target.value })}
               />
           </div>
       )}

       <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button 
             onClick={() => {
                 onAiBeautyChange('restorationIntensity', 30);
                 onAiBeautyChange('colorizeIntensity', 20);
                 onAiBeautyChange('sharpenIntensity', 20);
             }}
             className="flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-brand-600 text-white shadow-lg active:scale-95 transition-all"
          >
             Tự động (Full)
          </button>
          <button 
             onClick={() => {
                 onAiBeautyChange('restorationIntensity', 0);
                 onAiBeautyChange('colorizeIntensity', 0);
                 onAiBeautyChange('sharpenIntensity', 0);
             }}
             className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500"
          >
             Reset
          </button>
       </div>
    </div>
  );
};

export default EditorRestorationTab;
