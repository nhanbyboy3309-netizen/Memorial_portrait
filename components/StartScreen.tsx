
import React, { useState, useMemo } from 'react';
import { AppConfig, BackgroundType, PhotoSize } from '../types';
import StartSelection from './StartSelection';
import StartRegulations from './StartRegulations';
import { t } from '../services/i18n';

interface StartScreenProps {
  onStart: (config: { size: PhotoSize; background: BackgroundType; quantity: number }) => void;
  onHome: () => void;
  config: AppConfig;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onHome, config }) => {
  const [selectedSize, setSelectedSize] = useState<PhotoSize>(PhotoSize.SIZE_20X30);
  const [selectedBg, setSelectedBg] = useState<BackgroundType>(BackgroundType.BLUE);
  const [quantity, setQuantity] = useState<number>(1);

  const photoTypes = useMemo(() => [
    {
      id: PhotoSize.SIZE_20X30,
      label: "Phục chế 20x30",
      dimensions: '20x30 cm (A4)',
      defaultBg: BackgroundType.BLUE,
      icon: (
        <img 
          src={config.logoUrl || "https://img.icons8.com/fluency/240/camera.png"} 
          alt="Logo" 
          className="w-6 h-6 object-contain"
          referrerPolicy="no-referrer"
        />
      )
    }
  ], [config]);

  const handleStart = () => {
    onStart({ size: selectedSize, background: selectedBg, quantity: quantity });
  };

  return (
    <div className="min-h-[100dvh] h-auto bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-2 md:p-6 py-16 md:py-8 overflow-y-auto">
      <div className="absolute top-2 left-2 md:top-4 md:left-4 flex gap-3 z-20">
        <button onClick={onHome} className="px-3 py-2 md:px-4 md:py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-white dark:hover:bg-gray-700 hover:text-brand-600 dark:hover:text-brand-400 transition flex items-center gap-2 shadow-sm text-sm">
          <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l-7 7m-7 7h18"></path></svg>
          <span className="hidden sm:inline">{t('btn.home', config)}</span>
        </button>
      </div>

      <div className="max-w-6xl w-full bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col md:flex-row ring-1 ring-gray-100 dark:ring-gray-800 mt-8 md:mt-0 mb-safe">
        <StartSelection 
            config={config}
            selectedSize={selectedSize}
            selectedBg={selectedBg}
            quantity={quantity}
            photoTypes={photoTypes}
            onBgSelect={setSelectedBg}
            onQuantityChange={setQuantity}
            onStart={handleStart}
            onSizeSelect={setSelectedSize}
        />
        <StartRegulations 
            config={config}
            selectedSize={selectedSize}
            photoTypes={photoTypes}
        />
      </div>
    </div>
  );
};

export default StartScreen;
