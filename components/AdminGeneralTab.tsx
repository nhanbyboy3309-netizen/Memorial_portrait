
import React, { useRef, useState } from 'react';
import { AppConfig } from '../types';
import { InputGroup, iconInputClass } from './AdminShared';
import { t } from '../services/i18n';
import { testGoogleScriptConnection } from '../services/databaseService';

interface AdminGeneralTabProps {
  form: AppConfig;
  onChange: (field: keyof AppConfig, value: any) => void;
}

const AdminGeneralTab: React.FC<AdminGeneralTabProps> = ({ form, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTestConnection = async () => {
    if (!form.googleScriptUrl || !form.googleScriptUrl.trim()) {
      setTestResult({
        success: false,
        error: "Chưa nhập URL Google Apps Script. Ứng dụng hiện đang sử dụng bộ nhớ máy chủ (Server Storage) để lưu ảnh và tạo mã QR."
      });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGoogleScriptConnection(form.googleScriptUrl.trim());
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        error: "Lỗi kết nối: " + (e.message || String(e))
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyScriptGuide = () => {
    const scriptHint = `// Mở file GoogleAppsScript.js trong thư mục gốc của dự án để sao chép toàn bộ mã nguồn backend Google Sheet/Drive.`;
    navigator.clipboard.writeText(scriptHint).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { alert("Ảnh quá lớn!"); return; }
      const reader = new FileReader();
      reader.onloadend = () => onChange('logoUrl', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-gray-900 dark:text-white">
      {/* Cloud Sync Section */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between pb-2 mb-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-xl">☁️</span> {t('admin.general.sync', form)}
          </h3>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Server Fallback: Sẵn sàng
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          Google Apps Script dùng để đồng bộ ảnh và danh sách ảnh vào Google Drive & Google Sheet. 
          Nếu chưa cấu hình hoặc URL gặp sự cố, hệ thống <strong>tự động lưu tạm trên máy chủ</strong> để mã QR tải ảnh của khách hàng luôn hoạt động bình thường.
        </p>

        <div className="space-y-3">
          <InputGroup label="GOOGLE APPS SCRIPT URL" icon="🔗">
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                value={form.googleScriptUrl || ''} 
                onChange={e => {
                  onChange('googleScriptUrl', e.target.value);
                  setTestResult(null);
                }} 
                className={`${iconInputClass} flex-1 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono text-xs`} 
                placeholder="https://script.google.com/macros/s/.../exec"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {isTesting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Kiểm tra kết nối</span>
                  </>
                )}
              </button>
            </div>
          </InputGroup>

          {/* Test connection result badge */}
          {testResult && (
            <div className={`p-4 rounded-xl text-xs border transition-all ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300'
            }`}>
              <div className="font-bold flex items-center gap-2 mb-1">
                <span>{testResult.success ? '✅' : '⚠️'}</span>
                <span>{testResult.success ? 'Google Apps Script hoạt động tốt' : 'Thông báo trạng thái kết nối Cloud'}</span>
              </div>
              <p className="mt-1 leading-relaxed">
                {testResult.success ? (testResult.message || 'Kết nối thành công! Ảnh sẽ được lưu đồng thời lên Google Sheet/Drive.') : testResult.error}
              </p>
              {!testResult.success && (
                <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-700 dark:text-amber-400">
                  💡 <strong>An tâm:</strong> Máy chủ nội bộ đang tự động lưu trữ ảnh và tạo mã QR tải ảnh. Khách hàng vẫn có thể quét QR và nhận ảnh bình thường.
                </div>
              )}
            </div>
          )}

          {/* Setup Guide Accordion */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showGuide ? '▼ Ẩn hướng dẫn cài đặt Google Apps Script' : '▶ Xem hướng dẫn triển khai Google Apps Script (1 phút)'}</span>
            </button>

            {showGuide && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-2 text-gray-700 dark:text-gray-300">
                <p className="font-bold text-gray-900 dark:text-white">Các bước thiết lập Google Apps Script:</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Tạo một file <strong>Google Sheet</strong> mới trên Google Drive của bạn.</li>
                  <li>Vào menu: <strong>Tiện ích mở rộng (Extensions) &gt; Apps Script</strong>.</li>
                  <li>Mở file <code>GoogleAppsScript.js</code> trong mã nguồn dự án này, copy toàn bộ nội dung và dán thay thế vào editor Google.</li>
                  <li>Nhấn nút <strong>Triển khai (Deploy) &gt; Tùy chọn triển khai mới (New deployment)</strong>.</li>
                  <li>Chọn loại <strong>Ứng dụng web (Web app)</strong>:
                    <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                      <li>Thực thi dưới dạng: <strong>Tôi (Me)</strong></li>
                      <li>Ai có quyền truy cập: <strong>Bất kỳ ai (Anyone)</strong> (Rất quan trọng!)</li>
                    </ul>
                  </li>
                  <li>Nhấn <strong>Triển khai</strong>, cấp quyền truy cập, rồi copy URL Web App (đuôi <code>/exec</code>) dán vào ô bên trên.</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Language Section */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">
           {t('admin.general.language', form)}
        </h3>
        <div className="flex gap-4">
           {[
             { id: 'vi', label: 'Tiếng Việt', sub: 'Vietnamese', flag: '🇻🇳' },
             { id: 'en', label: 'English', sub: 'Tiếng Anh', flag: '🇺🇸' }
           ].map(lang => (
             <button 
                key={lang.id}
                onClick={() => onChange('language', lang.id)}
                className={`flex-1 p-5 rounded-2xl border-2 flex items-center gap-4 transition-all duration-200 ${
                  form.language === lang.id 
                    ? 'border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/20 scale-[1.02]' 
                    : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-brand-300'
                }`}
             >
               <span className="text-3xl">{lang.flag}</span>
               <div className="text-left">
                  <div className="font-black text-sm uppercase tracking-tight">{lang.label}</div>
                  <div className={`text-[10px] font-bold opacity-70 ${form.language === lang.id ? 'text-white' : ''}`}>{lang.sub}</div>
               </div>
               {form.language === lang.id && (
                 <div className="ml-auto bg-white/20 p-1 rounded-full">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                 </div>
               )}
             </button>
           ))}
        </div>
      </div>

      {/* Branding Section */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">
          {t('admin.general.branding', form)}
        </h3>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0 text-center">
            <div 
              className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-3xl flex items-center justify-center bg-gray-50 dark:bg-gray-800 overflow-hidden relative group cursor-pointer hover:border-brand-500 transition-colors" 
              onClick={() => fileInputRef.current?.click()}
            >
              {form.logoUrl ? (
                <img src={form.logoUrl} className="w-full h-full object-contain p-2" alt="Logo preview" />
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">🖼️</span>
                  <span className="text-[10px] text-gray-400 font-black uppercase">{t('admin.general.logo', form)}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-brand-600/0 group-hover:bg-brand-600/10 transition-colors" />
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" />
            {form.logoUrl && (
              <button 
                onClick={() => onChange('logoUrl', '')} 
                className="text-[10px] font-black text-red-500 mt-2 uppercase hover:underline"
              >
                {t('admin.general.remove_logo', form)}
              </button>
            )}
          </div>
          <div className="flex-1 space-y-5">
            <InputGroup label={t('admin.general.shop_name', form)} icon="🏷️">
              <input 
                type="text" 
                value={form.shopName} 
                onChange={e => onChange('shopName', e.target.value)} 
                className={`${iconInputClass} bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold`} 
              />
            </InputGroup>
            <InputGroup label="Tiêu đề màn hình chờ (Welcome Title)" icon="📝">
              <input 
                type="text" 
                value={form.welcomeTitle || ''} 
                onChange={e => onChange('welcomeTitle', e.target.value)} 
                className={`${iconInputClass} bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold`} 
              />
            </InputGroup>
            <InputGroup label="Phụ đề màn hình chờ (Welcome Subtitle)" icon="📄">
              <input 
                type="text" 
                value={form.welcomeSubtitle || ''} 
                onChange={e => onChange('welcomeSubtitle', e.target.value)} 
                className={`${iconInputClass} bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold`} 
              />
            </InputGroup>
            <InputGroup label={t('admin.general.footer', form)} icon="📜">
              <input
                type="text"
                value={form.printFooterText}
                onChange={e => onChange('printFooterText', e.target.value)}
                className={`${iconInputClass} bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold`}
              />
            </InputGroup>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-white">Hiển thị logo + mã ảnh + QR trên ảnh in</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Khổ 20x30: dải thông tin cửa hàng, mã ảnh và mã QR ở góc dưới ảnh in.</p>
          </div>
          <button
            type="button"
            onClick={() => onChange('showPrintQrFooter', !(form.showPrintQrFooter !== false))}
            className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
              form.showPrintQrFooter !== false ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            aria-pressed={form.showPrintQrFooter !== false}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                form.showPrintQrFooter !== false ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {form.showPrintQrFooter !== false && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">Nền trong suốt (đè trực tiếp lên ảnh)</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Bỏ dải nền trắng phía sau logo/mã ảnh/QR, hiển thị đè thẳng lên ảnh in.</p>
            </div>
            <button
              type="button"
              onClick={() => onChange('printQrFooterTransparent', !form.printQrFooterTransparent)}
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
                form.printQrFooterTransparent ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-pressed={!!form.printQrFooterTransparent}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                  form.printQrFooterTransparent ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-white">Chiều cao dải nền thông tin (cm)</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Áp dụng khi có bật "Hiển thị thông tin" (tên, chức vụ...) trên ảnh 20x30 — dải nền trắng phía dưới hiển thị nội dung đó.</p>
          </div>
          <input
            type="number"
            min={2}
            max={15}
            step={0.5}
            value={form.infoBandHeightCm ?? 4}
            onChange={e => onChange('infoBandHeightCm', Number(e.target.value))}
            className="w-20 shrink-0 text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold rounded-lg py-1.5 px-2"
          />
        </div>
      </div>
    </div>
  );
};

export default AdminGeneralTab;
