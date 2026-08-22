import React from 'react';
import { BackgroundType, AppConfig, PhotoSettings } from '../types';
import { t } from '../services/i18n';

interface EditorBackgroundTabProps {
  config: AppConfig;
  settings: PhotoSettings;
  onBgChange: (bg: BackgroundType, hex?: string) => void;
}

const EditorBackgroundTab: React.FC<EditorBackgroundTabProps> = ({ config, settings, onBgChange }) => {
  return (
    <div className="grid grid-cols-2 gap-3 animate-fadeIn pb-6">
       {(config.backgroundConfig || []).map(bg => {
         // Determine if this background is currently selected
         // We check type, and for CUSTOM/Gradient types, we check the specific color value (hex or gradient string)
         const isSelected = settings.background === bg.type && (
            bg.type !== BackgroundType.CUSTOM || 
            settings.customBackgroundColor === (bg.isGradient ? bg.gradientValue : bg.hexColor)
         );

         return (
             <button 
               key={bg.id} 
               onClick={() => onBgChange(
                   bg.type === BackgroundType.CUSTOM ? BackgroundType.CUSTOM : bg.type, 
                   bg.isGradient ? bg.gradientValue : bg.hexColor
               )} 
               className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${
                 isSelected
                 ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md' 
                 : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-200'
               }`}
             >
               <div 
                  className="w-10 h-10 rounded-xl border-2 border-white dark:border-gray-600 shadow-sm" 
                  style={{ background: bg.isGradient ? bg.gradientValue : bg.hexColor }}
               ></div>
               <span className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? 'text-brand-700 dark:text-brand-400' : 'text-gray-700 dark:text-gray-400'}`}>
                 {bg.label}
               </span>
             </button>
         );
       })}
       
       <button 
         onClick={() => onBgChange(BackgroundType.ORIGINAL)} 
         className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${
           settings.background === BackgroundType.ORIGINAL 
           ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md' 
           : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-200'
         }`}
       >
         <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl shadow-inner">📷</div>
         <span className={`text-[11px] font-black uppercase tracking-tight ${settings.background === BackgroundType.ORIGINAL ? 'text-brand-700 dark:text-brand-400' : 'text-gray-700 dark:text-gray-400'}`}>
           {t('editor.label.original', config)}
         </span>
       </button>
    </div>
  );
};

export default EditorBackgroundTab;