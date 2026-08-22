
import React from 'react';

export interface HistoryItem {
  url: string;
  timestamp: number;
  label: string;
}

interface EditHistorySidebarProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem, index: number) => void;
  currentIndex: number;
}

const EditHistorySidebar: React.FC<EditHistorySidebarProps> = ({ history, onSelect, currentIndex }) => {
  const handleDownload = (e: React.MouseEvent, url: string, index: number) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = `ID-Photo-Version-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="hidden lg:flex w-36 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col shrink-0 overflow-hidden z-20 shadow-[-5px_0_25px_rgba(0,0,0,0.02)]">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <span className="text-xs">🎞️</span> LỊCH SỬ
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <div className="text-3xl mb-4">📸</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-center px-4 leading-relaxed">Chưa có<br/>phiên bản mới</div>
          </div>
        ) : (
          history.map((item, idx) => (
            <div key={item.timestamp} className="flex flex-col items-center gap-2.5 animate-fadeInUp" style={{ animationDelay: `${idx * 0.1}s` }}>
               <div className="relative w-full group">
                  <button
                    onClick={() => onSelect(item, idx)}
                    className={`w-full aspect-[2/3] relative rounded-2xl overflow-hidden border-2 transition-all duration-500 active:scale-95 shadow-sm hover:shadow-xl ${
                      currentIndex === idx 
                        ? 'border-brand-500 ring-4 ring-brand-500/10 scale-105' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-brand-300'
                    }`}
                  >
                    <img src={item.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={`Version ${idx + 1}`} />
                    <div className={`absolute inset-0 bg-brand-600/10 transition-opacity duration-300 ${currentIndex === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                  </button>

                  {/* Enhanced Quick Download Button */}
                  <button 
                    onClick={(e) => handleDownload(e, item.url, idx)}
                    className="absolute -top-3 -right-3 w-9 h-9 bg-brand-600 text-white rounded-full shadow-2xl flex items-center justify-center transform scale-0 group-hover:scale-100 transition-all duration-300 z-30 hover:bg-brand-700 hover:scale-110 active:scale-90 border-2 border-white dark:border-slate-800"
                    title="Tải ngay phiên bản này"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  </button>

                  <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 py-1 px-2.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm z-10 transition-colors ${
                    currentIndex === idx ? 'bg-brand-600 text-white' : 'bg-slate-800/80 text-white backdrop-blur-sm group-hover:bg-slate-900'
                  }`}>
                    V.{idx + 1}
                  </div>
               </div>
               
               <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default EditHistorySidebar;
