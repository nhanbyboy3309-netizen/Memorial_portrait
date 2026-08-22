
import React from 'react';
import { PhotoSettings, AppConfig } from '../types';
import { t } from '../services/i18n';

interface EditorInfoTabProps {
  config: AppConfig;
  settings: PhotoSettings;
  onUpdateSettings: (newSettings: PhotoSettings) => void;
}

const EditorInfoTab: React.FC<EditorInfoTabProps> = ({ config, settings, onUpdateSettings }) => {
  const info = settings.info || {
      enabled: false,
      text: '',
      alignment: 'center',
      fontSize: 20,
      color: '#000000'
  };

  const handleChange = (key: keyof typeof info, value: any) => {
    onUpdateSettings({
      ...settings,
      info: {
        ...info,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-6">
       
       <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/30">
          <div className="flex items-start gap-3">
             <div className="text-2xl mt-1">📝</div>
             <div>
                <h3 className="text-sm font-black text-blue-800 dark:text-blue-200 uppercase tracking-tight mb-1">
                   {t('editor.info.title', config)}
                </h3>
                <p className="text-[10px] text-blue-700 dark:text-blue-300/80 leading-relaxed font-medium">
                   {t('editor.info.desc', config)}
                </p>
             </div>
          </div>
       </div>

       <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          
          <div className="flex justify-between items-center cursor-pointer" onClick={() => handleChange('enabled', !info.enabled)}>
             <label className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest cursor-pointer">
                Hiển thị thông tin
             </label>
             <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${info.enabled ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${info.enabled ? 'translate-x-6' : ''}`}></div>
             </div>
          </div>

          {info.enabled && (
             <div className="space-y-5 animate-fadeIn pt-4 border-t border-gray-100 dark:border-gray-700">
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Nội dung văn bản</label>
                   <textarea 
                      value={info.text}
                      onChange={(e) => handleChange('text', e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none min-h-[80px]"
                      rows={3}
                      placeholder="Nhập tên, chức vụ, đơn vị công tác..."
                   />
                </div>

                <div>
                   <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Căn chỉnh</label>
                   <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                      {[
                         { id: 'left', icon: 'M4 6h16M4 12h10M4 18h16' },
                         { id: 'center', icon: 'M4 6h16M7 12h10M4 18h16' },
                         { id: 'right', icon: 'M4 6h16M10 12h10M4 18h16' }
                      ].map((align) => (
                         <button
                            key={align.id}
                            onClick={() => handleChange('alignment', align.id)}
                            className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-all ${info.alignment === align.id ? 'bg-white dark:bg-gray-600 text-brand-600 shadow-sm' : 'text-gray-400'}`}
                         >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={align.icon}></path></svg>
                         </button>
                      ))}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Cỡ chữ: {info.fontSize}pt</label>
                        <input 
                            type="range" min="12" max="60" step="1" 
                            value={info.fontSize} 
                            onChange={(e) => handleChange('fontSize', Number(e.target.value))} 
                            className="w-full accent-brand-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Màu chữ</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="color" 
                                value={info.color} 
                                onChange={(e) => handleChange('color', e.target.value)}
                                className="w-8 h-8 rounded-full border-2 border-gray-200 cursor-pointer p-0 overflow-hidden"
                            />
                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{info.color}</span>
                        </div>
                    </div>
                </div>
             </div>
          )}
       </div>
    </div>
  );
};

export default EditorInfoTab;
