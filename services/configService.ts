import { AppConfig, ClothingItem, BackgroundType, PhotoSize, HairColorOption, BlushOption, LipstickOption } from "../types";

const CONFIG_KEY = 'memorial_portrait_config_v2';

const DEFAULT_CLOTHING: ClothingItem[] = [
  { id: 'm_vest_black', label: 'Vest Đen', gender: 'male', color: 'border-gray-800', icon: '🕴️', prompt: 'wearing a formal black business suit with white shirt and tie' },
  { id: 'm_vest_navy', label: 'Vest Navy', gender: 'male', color: 'border-blue-900', icon: '🕴️', prompt: 'wearing a formal navy blue business suit with tie' },
  { id: 'm_shirt_white', label: 'Sơ mi Trắng', gender: 'male', color: 'border-gray-200', icon: '👔', prompt: 'wearing a clean white formal shirt' },
  { id: 'm_shirt_blue', label: 'Sơ mi Xanh', gender: 'male', color: 'border-blue-400', icon: '👔', prompt: 'wearing a light blue formal button-down office shirt' },
  { id: 'm_police', label: 'Sơ mi Công sở', gender: 'male', color: 'border-green-700', icon: '👮', prompt: 'wearing a formal beige or green professional uniform shirt' },
  { id: 'f_aodai_white', label: 'Áo Dài Trắng', gender: 'female', color: 'border-pink-200', icon: '👘', prompt: 'wearing a traditional white Vietnamese Ao Dai with high collar' },
  { id: 'f_aodai_color', label: 'Áo Dài Màu', gender: 'female', color: 'border-purple-300', icon: '👘', prompt: 'wearing an elegant colorful traditional Vietnamese Ao Dai' },
  { id: 'f_vest_black', label: 'Vest Đen', gender: 'female', color: 'border-gray-800', icon: '💼', prompt: 'wearing a formal black women business blazer and white shirt' },
  { id: 'f_shirt_office', label: 'Sơ mi Nữ', gender: 'female', color: 'border-blue-300', icon: '👚', prompt: 'wearing a professional blue office blouse' },
];

const DEFAULT_HAIR_COLORS: HairColorOption[] = [
    { id: 'original', label: 'Màu gốc', hex: 'transparent' },
    { id: 'black', label: 'Đen Tuyền', hex: '#09090b' },
    { id: 'brown_dark', label: 'Nâu Đen', hex: '#3f2e27' },
    { id: 'white', label: 'Bạc/Trắng', hex: '#f3f4f6' }, // Added for old people restoration
];

const DEFAULT_BLUSH: BlushOption[] = [
  { id: 'none', label: 'Không', hex: 'transparent' },
  { id: 'pink_soft', label: 'Hồng Nhạt', hex: '#fbcfe8' },
  { id: 'peach', label: 'Cam Đào', hex: '#fdba74' },
];

const DEFAULT_LIPSTICKS: LipstickOption[] = [
  { id: 'none', label: 'Không', hex: 'transparent' },
  { id: 'red', label: 'Đỏ', hex: '#ef4444' },
  { id: 'pink', label: 'Hồng', hex: '#ec4899' },
  { id: 'nude', label: 'Nude', hex: '#d6a692' },
];

export const DEFAULT_CONFIG: AppConfig = {
  shopName: "Photo Restoration",
  welcomeTitle: "Phục Chế Ảnh",
  welcomeSubtitle: "KHÔI PHỤC DI ẢNH & ẢNH CŨ",
  contactPhone: "0909000111",
  contactZalo: "0909000111",
  printFooterText: "Dịch vụ phục chế ảnh chuyên nghiệp",
  themeColorHex: "#475569", 
  themeMode: 'light', 
  language: 'vi', 
  clothingOptions: DEFAULT_CLOTHING,
  
  lipstickOptions: DEFAULT_LIPSTICKS,
  blushOptions: DEFAULT_BLUSH,
  hairColorOptions: DEFAULT_HAIR_COLORS,

  backgroundConfig: [
    { id: 'bg_blue', type: BackgroundType.BLUE, label: 'Nền Xanh', hexColor: '#2792ff' },
    { id: 'bg_white', type: BackgroundType.WHITE, label: 'Nền Trắng', hexColor: '#ffffff' },
    { id: 'bg_gray', type: BackgroundType.GRAY, label: 'Nền Xám', hexColor: '#d1d5db' },
  ],

  photoRules: {
    [PhotoSize.SIZE_3X4]: [
      'Kích thước chuẩn: 3x4 cm.',
      'Độ phân giải: 300 DPI.',
      'Phù hợp: Ảnh thẻ, Hồ sơ, CMND/CCCD.',
      'Tự động thay trang phục và phông nền.'
    ],
    [PhotoSize.SIZE_4X6]: [
      'Kích thước chuẩn: 4x6 cm.',
      'Độ phân giải: 300 DPI.',
      'Phù hợp: Hộ chiếu, Visa, Bằng lái xe.',
      'Tự động thay trang phục và phông nền.'
    ],
    [PhotoSize.SIZE_20X30]: [
      'Kích thước chuẩn: 20x30 cm (A4).',
      'Độ phân giải cao: 300 DPI.',
      'Phù hợp: Di ảnh, Ảnh thờ, Ảnh kỷ niệm.',
      'Tự động tách nền và làm nét ảnh cũ.'
    ]
  },

  adminPassword: "admin",
  logoUrl: "",
  googleScriptUrl: "https://script.google.com/macros/s/AKfycbzYupbe7DhcLUGPUUJ3VbkRkpMj1ioRyfn2LlPYwPt0t_VUao4Wl_XT8-vxbojU39Nl/exec",

  customContentHtml: "<div class='text-center'><p><b>HƯỚNG DẪN</b></p><p>Hệ thống chuyên dụng phục hồi ảnh cũ, ảnh mờ, ảnh ố vàng.</p></div>",
  customContentBgColor: "#f1f5f9",
  customContentTextColor: "#475569",
  customContentSize: 'md',

  showPrintQrFooter: true,
  printQrFooterTransparent: false
};

export const saveConfig = (config: AppConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  applyTheme(config.themeColorHex);
  applyThemeMode(config.themeMode); 
  updateFavicon(config.logoUrl);
};

export const getConfig = (): AppConfig => {
  const saved = localStorage.getItem(CONFIG_KEY);
  let config = { ...DEFAULT_CONFIG };

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      config = { 
        ...DEFAULT_CONFIG, 
        ...parsed,
        photoRules: {
            ...DEFAULT_CONFIG.photoRules,
            ...(parsed.photoRules || {})
        }
      };
    } catch (e) {}
  }

  return config;
};

const hexToRgb = (hex: string) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }
  return `${r} ${g} ${b}`;
};

export const applyTheme = (hexColor: string) => {
  if (!hexColor) return;
  const rgb = hexToRgb(hexColor);
  const root = document.documentElement;
  root.style.setProperty('--brand-50', rgb);
  root.style.setProperty('--brand-100', rgb);
  root.style.setProperty('--brand-200', rgb);
  root.style.setProperty('--brand-500', rgb);
  root.style.setProperty('--brand-600', rgb);
  root.style.setProperty('--brand-700', rgb);
};

export const applyThemeMode = (mode: 'light' | 'dark' | 'system') => {
  const root = document.documentElement;
  
  if (mode === 'dark') {
    root.classList.add('dark');
  } else if (mode === 'light') {
    root.classList.remove('dark');
  } else {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
};

export const updateFavicon = (logoUrl?: string) => {
  const link = document.getElementById('dynamic-favicon') as HTMLLinkElement;
  if (link) {
    link.href = logoUrl || "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🖼️</text></svg>";
  }
};