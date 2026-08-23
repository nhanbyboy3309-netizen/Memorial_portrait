
// Fix: Added missing photo size definitions to support various ID photo formats used in the app
export enum PhotoSize {
  SIZE_20X30 = '20x30', // 20cm x 30cm (Approx A4)
  SIZE_3X4 = '3x4',
  SIZE_4X6 = '4x6',
  SIZE_5X5 = '5x5'
}

export enum BackgroundType {
  WHITE = 'white',
  BLUE = 'blue',
  GRAY = 'gray', 
  CUSTOM = 'custom',
  ORIGINAL = 'original'
}

export enum AppStep {
  CAPTURE = 'capture',
  EDIT = 'edit',
  PRINT = 'print'
}

export enum SkinToneType {
  NATURAL = 'natural', 
  FAIR = 'fair',       
  ROSY = 'rosy',       
  TAN = 'tan'          
}

export interface BeautySettings {
  smoothSkin: number;        
  blemishIntensity: number;  
  restorationIntensity: number; 
  colorizeIntensity: number;    
  sharpenIntensity: number;     
  skinToneType: SkinToneType;
  skinToneIntensity: number; 
  lighting: number;          
  contrast: number;          
  lipstickColor: string;     
  lipstickIntensity: number; 
  blushColor: string;        
  blushIntensity: number;    
  eyebrowIntensity: number;  
  eyelashIntensity: number;  
  contourIntensity: number;  
  hairVolume: number;        
  hairStyle?: 'original' | 'short' | 'long'; 
  hairColor?: string;        
  makeupStyle: 'natural' | 'grooming';
  
  // New Restoration Demographics
  restorationGender?: 'male' | 'female';
  restorationAge?: 'baby' | 'child' | 'young' | 'middle' | 'old';
}

export interface InfoSettings {
  enabled: boolean;
  text: string;
  alignment: 'left' | 'center' | 'right';
  fontSize: number;
  color: string;
}

export interface PhotoSettings {
  size: PhotoSize;
  background: BackgroundType;
  customBackgroundColor?: string; // Hex color if background is CUSTOM
  clothingPrompt?: string;
  customAiPrompt?: string; // New field for user custom instructions
  beauty: BeautySettings;
  info: InfoSettings; 
  printQuantity: number;
  phoneNumber?: string; 
}

export interface SavedPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
  settings: PhotoSettings;
}

export interface ClothingItem {
  id: string;
  label: string;
  gender: 'male' | 'female';
  icon: string; 
  prompt: string;
  color: string; 
}

export interface LipstickOption {
  id: string;
  label: string;
  hex: string;
}

export interface BlushOption {
  id: string;
  label: string;
  hex: string;
}

export interface HairColorOption {
  id: string;
  label: string; 
  hex: string;   
}

export interface BackgroundConfigItem {
  type: BackgroundType;
  id: string; 
  label: string;
  hexColor: string; 
  isGradient?: boolean;
  gradientValue?: string; // CSS gradient string
}

export interface AppConfig {
  shopName: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  contactPhone: string;
  contactZalo: string;
  printFooterText: string;
  themeColorHex: string; 
  themeMode: 'light' | 'dark' | 'system'; 
  language: 'vi' | 'en'; 
  clothingOptions: ClothingItem[];
  
  lipstickOptions: LipstickOption[];
  blushOptions: BlushOption[];
  hairColorOptions: HairColorOption[]; 
  backgroundConfig: BackgroundConfigItem[];
  photoRules: Record<string, string[]>; 

  adminPassword?: string; 
  logoUrl?: string; 
  
  googleScriptUrl?: string;

  customContentHtml?: string;
  customContentBgColor?: string;
  customContentTextColor?: string;
  customContentSize?: 'sm' | 'md' | 'lg';
  customContentImageUrl?: string; 
  customContentLinkUrl?: string;  
}
