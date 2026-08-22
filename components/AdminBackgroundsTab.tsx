import React, { useState } from 'react';
import { AppConfig, BackgroundConfigItem, BackgroundType } from '../types';
import { InputGroup, baseInputClass } from './AdminShared';

interface AdminBackgroundsTabProps {
  form: AppConfig;
  setForm: React.Dispatch<React.SetStateAction<AppConfig>>;
}

const AdminBackgroundsTab: React.FC<AdminBackgroundsTabProps> = ({ form, setForm }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BackgroundConfigItem | null>(null);
  const [tempItem, setTempItem] = useState<BackgroundConfigItem>({
    id: '', type: BackgroundType.CUSTOM, label: '', hexColor: '#ffffff', isGradient: false, gradientValue: ''
  });

  const backgrounds = form.backgroundConfig || [];

  const openAdd = () => {
    setEditingItem(null);
    setTempItem({ id: `bg_${Date.now()}`, type: BackgroundType.CUSTOM, label: '', hexColor: '#ffffff', isGradient: false, gradientValue: '' });
    setShowModal(true);
  };

  const openEdit = (item: BackgroundConfigItem) => {
    setEditingItem(item);
    setTempItem({ ...item });
    setShowModal(true);
  };

  const saveItem = () => {
    let newList = [...backgrounds];
    if (editingItem) {
      newList = newList.map(item => item.id === editingItem.id ? tempItem : item);
    } else {
      newList.push(tempItem);
    }
    setForm(prev => ({ ...prev, backgroundConfig: newList }));
    setShowModal(false);
  };

  const deleteItem = (id: string) => {
    if (confirm('Xóa phông nền này?')) {
      setForm(prev => ({
        ...prev,
        backgroundConfig: (prev.backgroundConfig || []).filter(item => item.id !== id)
      }));
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Cấu hình phông nền</h2>
        <button 
            onClick={openAdd} 
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-500/30 transition-all active:scale-95"
        >
            + Thêm phông nền
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {backgrounds.map(item => (
          <div key={item.id} className="group p-5 border-2 border-gray-50 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-800/50 flex flex-col items-center gap-4 hover:border-brand-400 transition-all duration-300 shadow-sm">
            <div 
              className="w-20 h-20 rounded-2xl border-4 border-white dark:border-gray-700 shadow-lg" 
              style={{ background: item.isGradient ? item.gradientValue : item.hexColor }}
            ></div>
            <div className="text-center">
                <div className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{item.label}</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">{item.isGradient ? 'Gradient' : item.hexColor}</div>
            </div>
            <div className="flex gap-2 w-full pt-2 border-t border-gray-50 dark:border-gray-800 mt-2">
                <button onClick={() => openEdit(item)} className="flex-1 py-2 text-xs font-black text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-xl transition-colors uppercase tracking-widest">Sửa</button>
                <button onClick={() => deleteItem(item.id)} className="flex-1 py-2 text-xs font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors uppercase tracking-widest">Xóa</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-xl animate-fadeIn">
           <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 w-full max-w-md shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10">
              <h3 className="text-xl font-black mb-8 text-gray-900 dark:text-white uppercase tracking-tight text-center">
                  {editingItem ? 'Cập nhật' : 'Thêm'} phông nền
              </h3>
              
              <div className="space-y-6">
                 <InputGroup label="Tên nhãn phông nền" icon="🏷️">
                    <input 
                      type="text" 
                      className={`${baseInputClass} bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white font-bold pl-12`} 
                      value={tempItem.label} 
                      onChange={e => setTempItem({...tempItem, label: e.target.value})} 
                      placeholder="VD: Xanh Công An" 
                    />
                 </InputGroup>

                 <div className="flex gap-4">
                    <button 
                      onClick={() => setTempItem({...tempItem, isGradient: false})}
                      className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${!tempItem.isGradient ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 text-gray-400'}`}
                    >
                      Màu Đơn
                    </button>
                    <button 
                      onClick={() => setTempItem({...tempItem, isGradient: true})}
                      className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${tempItem.isGradient ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 text-gray-400'}`}
                    >
                      Gradient
                    </button>
                 </div>

                 {tempItem.isGradient ? (
                    <InputGroup label="CSS Gradient Value" icon="🌈">
                       <textarea 
                          className={`${baseInputClass} bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white font-bold pl-12 h-24 p-4 text-xs`}
                          value={tempItem.gradientValue}
                          onChange={e => setTempItem({...tempItem, gradientValue: e.target.value})}
                          placeholder="linear-gradient(135deg, #2792FF 0%, #1e40af 100%)"
                       />
                    </InputGroup>
                 ) : (
                    <div className="flex items-center gap-6">
                       <div className="flex-1">
                          <InputGroup label="Hex Code" icon="#️⃣">
                             <input 
                                type="text" 
                                className={`${baseInputClass} bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white font-bold pl-12`} 
                                value={tempItem.hexColor} 
                                onChange={e => setTempItem({...tempItem, hexColor: e.target.value})} 
                                placeholder="#2792FF" 
                             />
                          </InputGroup>
                       </div>
                       <input 
                          type="color" 
                          className="w-16 h-16 p-1 rounded-2xl bg-white shadow-md cursor-pointer border-2 border-gray-100" 
                          value={tempItem.hexColor} 
                          onChange={e => setTempItem({...tempItem, hexColor: e.target.value})} 
                       />
                    </div>
                 )}
                 
                 <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Xem trước</div>
                    <div 
                      className="w-full h-20 rounded-xl border-2 border-white shadow-inner mx-auto" 
                      style={{ background: tempItem.isGradient ? tempItem.gradientValue : tempItem.hexColor }}
                    ></div>
                 </div>
              </div>
              
              <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
                 <button onClick={() => setShowModal(false)} className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Hủy</button>
                 <button onClick={saveItem} className="px-10 py-4 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-2xl shadow-xl shadow-brand-500/30 uppercase tracking-widest transition-all active:scale-95">Lưu cài đặt</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminBackgroundsTab;