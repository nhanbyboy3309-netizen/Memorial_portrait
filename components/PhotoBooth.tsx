
import React, { useState } from 'react';
import CameraCapture from './CameraCapture';
import ImageEditor from './ImageEditor';
import PrintPreview from './PrintPreview';
import { AppStep, BackgroundType, PhotoSettings, PhotoSize, SavedPhoto, AppConfig, SkinToneType } from '../types';

interface PhotoBoothProps {
  onSaveToGallery?: () => void;
  initialPhoto?: SavedPhoto | null;
  onHome: () => void;
  config: AppConfig;
}

const PhotoBooth: React.FC<PhotoBoothProps> = ({ onSaveToGallery, initialPhoto, onHome, config }) => {
  const [step, setStep] = useState<AppStep>(initialPhoto ? AppStep.PRINT : AppStep.CAPTURE);
  
  const [capturedImage, setCapturedImage] = useState<string>(initialPhoto ? initialPhoto.dataUrl : '');
  const [processedImage, setProcessedImage] = useState<string>(initialPhoto ? initialPhoto.dataUrl : '');
  
  const [settings, setSettings] = useState<PhotoSettings>(initialPhoto ? initialPhoto.settings : {
    size: PhotoSize.SIZE_20X30, 
    background: BackgroundType.BLUE,
    clothingPrompt: undefined,
    info: {
      enabled: false,
      text: '',
      alignment: 'center',
      fontSize: 20,
      color: '#000000'
    },
    beauty: {
      smoothSkin: 0,
      blemishIntensity: 0,
      restorationIntensity: 0, 
      colorizeIntensity: 0, 
      sharpenIntensity: 0, 
      hairVolume: 0,
      hairStyle: 'original',
      makeupStyle: 'natural',
      skinToneType: SkinToneType.NATURAL,
      skinToneIntensity: 0,
      lighting: 0,
      contrast: 0,
      lipstickColor: 'pink', 
      lipstickIntensity: 0,
      blushColor: 'pink_soft', 
      eyebrowIntensity: 0,
      eyelashIntensity: 0,
      contourIntensity: 0,
      blushIntensity: 0
    },
    printQuantity: 1, 
    phoneNumber: config.contactZalo 
  });

  const handleCapture = (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setStep(AppStep.EDIT);
  };

  const handleProcessedImage = (img: string) => {
    setProcessedImage(img);
  };

  const resetFlow = () => {
    setCapturedImage('');
    setProcessedImage('');
    setStep(AppStep.CAPTURE);
  };

  const handleRetake = () => {
    setCapturedImage('');
    setStep(AppStep.CAPTURE);
  };

  return (
    <div className="h-full w-full">
      {step === AppStep.CAPTURE && (
        <CameraCapture
          onCapture={handleCapture}
          selectedSize={settings.size}
          onSizeChange={(s) => setSettings({...settings, size: s})}
          onHome={onHome}
        />
      )}
      
      {step === AppStep.EDIT && (
        <ImageEditor 
          originalImage={capturedImage}
          settings={settings}
          onUpdateSettings={setSettings}
          onProcessedImage={handleProcessedImage}
          onNext={() => setStep(AppStep.PRINT)}
          onRetake={handleRetake}
          config={config}
        />
      )}
      
      {step === AppStep.PRINT && (
        <PrintPreview 
          processedImage={processedImage}
          size={settings.size}
          settings={settings}
          onBack={() => setStep(AppStep.EDIT)}
          onNew={resetFlow}
          onSaved={onSaveToGallery}
          onHome={onHome}
          config={config}
        />
      )}
    </div>
  );
};

export default PhotoBooth;
