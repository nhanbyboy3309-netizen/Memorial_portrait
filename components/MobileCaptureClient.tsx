
import React, { useRef, useState } from 'react';
import { PhotoSize, AppConfig } from '../types';
import { savePhotoToCloud } from '../services/databaseService';

interface MobileCaptureClientProps {
  sessionId: string;
  config: AppConfig;
  initialSize?: PhotoSize;
}

const MobileCaptureClient: React.FC<MobileCaptureClientProps> = ({ sessionId, config, initialSize = PhotoSize.SIZE_20X30 }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) setCapturedImage(event.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!capturedImage || !sessionId) return;
    setIsUploading(true);
    try {
      const resultId = await savePhotoToCloud({
        id: sessionId,
        dataUrl: capturedImage,
        timestamp: Date.now(),
        settings: {
          size: initialSize,
          background: 'original' as any,
          beauty: {} as any,
          printQuantity: 1,
          info: {
            enabled: false,
            text: '',
            alignment: 'center',
            fontSize: 20,
            color: '#000000'
          }
        }
      }, config.googleScriptUrl);

      if (resultId) setIsCompleted(true);
      else alert('Đồng bộ thất bại. Vui lòng thử lại.');
    } catch (e) {
      alert('Lỗi kết nối Cloud. Kiểm tra lại đường truyền.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="h-[100dvh] bg-brand-600 flex flex-col items-center justify-center text-white p-8 text-center animate-fadeIn">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl">
          <svg className="w-10 h-10 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-2xl font-black mb-4 uppercase">Gửi thành công!</h2>
        <p className="opacity-90">ID phiên: <span className="font-mono bg-black/20 px-2 rounded">{sessionId}</span></p>
        <p className="mt-4 opacity-80 text-sm">Máy tính sẽ nhận ảnh trong vài giây.</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 space-y-6 animate-fadeIn">
        {capturedImage ? (
          <>
            <div className="rounded-2xl overflow-hidden bg-black">
              <img src={capturedImage} className="w-full max-h-80 object-contain" alt="Preview" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCapturedImage(null)} disabled={isUploading} className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl font-bold uppercase text-[10px] tracking-widest active:scale-95 transition-all">
                Chọn lại
              </button>
              <button onClick={handleUpload} disabled={isUploading} className="flex-[2] py-3.5 bg-brand-600 text-white rounded-xl font-black shadow-xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest active:scale-95 transition-all">
                {isUploading ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                {isUploading ? "Đang gửi..." : "Gửi ảnh này"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Tải ảnh lên</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Chọn ảnh từ thư viện hoặc chụp ảnh mới để gửi về máy tính.</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              Chọn ảnh / Chụp ảnh
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          </>
        )}
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeIn { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }`}</style>
    </div>
  );
};

export default MobileCaptureClient;
