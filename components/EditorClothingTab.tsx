
import React, { useState } from 'react';
import { AppConfig, PhotoSettings } from '../types';
import { t } from '../services/i18n';

interface EditorClothingTabProps {
  config: AppConfig;
  settings: PhotoSettings;
  onClothingClick: (prompt: string) => void;
}

const EditorClothingTab: React.FC<EditorClothingTabProps> = ({ config, settings, onClothingClick }) => {
  const [genderTab, setGenderTab] = useState<'male' | 'female'>('male');
  const activeOptions = (config.clothingOptions || []).filter(item => item.gender === genderTab);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <button 
          onClick={() => setGenderTab('male')} 
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${genderTab === 'male' ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-brand-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
        >
          {t('editor.gender.male', config)}
        </button>
        <button 
          onClick={() => setGenderTab('female')} 
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${genderTab === 'female' ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-brand-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
        >
          {t('editor.gender.female', config)}
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
        <button 
          onClick={() => onClothingClick('')} 
          className={`p-2.5 border-2 rounded-xl text-center transition-all ${!settings.clothingPrompt ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-sm' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-100'}`}
        >
           <div className="text-xl mb-1">👕</div>
           <div className="text-[10px] font-bold text-slate-700 dark:text-gray-300">{t('editor.clothing.none', config)}</div>
        </button>
        
        {activeOptions.map((item) => (
          <button 
            key={item.id} 
            onClick={() => onClothingClick(item.prompt)} 
            className={`p-2.5 border-2 rounded-xl text-center transition-all ${settings.clothingPrompt === item.prompt ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-sm' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-100'}`}
          >
            <div className="text-xl mb-1">{item.icon}</div>
            <div className="text-[10px] font-bold text-slate-700 dark:text-gray-300 truncate px-1">{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EditorClothingTab;
