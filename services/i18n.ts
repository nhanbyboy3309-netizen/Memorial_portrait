
import { AppConfig } from "../types";

type Language = 'vi' | 'en';

const translations: Record<Language, Record<string, string>> = {
  vi: {
    // General
    "app.name": "Phục Chế Ảnh",
    "btn.save": "Lưu Thay Đổi",
    "btn.cancel": "Hủy",
    "btn.delete": "Xóa",
    "btn.add": "Thêm mới",
    "btn.back": "Quay lại",
    "btn.close": "Đóng",
    "btn.exit": "Thoát",
    "btn.login": "Đăng nhập",
    "btn.home": "Trang chủ",
    "btn.start": "Bắt đầu",
    "btn.retry": "Thử lại",
    "status.ready": "Hệ thống sẵn sàng",
    "status.syncing": "Đang đồng bộ...",
    "status.saving": "Đang lưu...",
    
    // Start Screen
    "start.welcome": "Chào mừng tới",
    "start.subtitle": "PHỤC CHẾ ẢNH CŨ",
    "start.step1": "1. Kích thước",
    "start.step2": "2. Phông nền",
    "start.step3": "3. Số lượng",
    "start.regulations": "Thông tin dịch vụ",
    "start.important": "Lưu ý",
    "start.important_text": "Ảnh gốc nên chụp thẳng góc, đủ sáng, không bị lóa đèn để có kết quả tốt nhất.",
    "start.standard": "Khổ",
    "start.bg_white": "Trắng",
    "start.bg_blue": "Xanh",
    "start.bg_gray": "Xám",
    "photo.type.20x30": "Ảnh Phục Chế 20x30cm",
    "photo.type.3x4": "Ảnh Thẻ 3x4 cm",
    "photo.type.4x6": "Ảnh Thẻ 4x6 cm",
    
    // Capture (Now Upload)
    "capture.device.select": "",
    "capture.status.valid": "Hợp lệ",
    "capture.status.adjusting": "Căn chỉnh...",
    "capture.label.processing": "Đang quét...",
    "capture.label.valid": "Tốt",
    "capture.msg.no_face": "Không thấy khuôn mặt",
    "capture.msg.move_in": "Di chuyển ảnh vào khung",
    "capture.msg.valid": "Giữ yên...",
    "capture.tooltip.auto_on": "Tự động chụp: BẬT",
    "capture.tooltip.auto_off": "Tự động chụp: TẮT",
    "capture.msg.upload_prompt": "Tải ảnh cũ lên để phục chế",
    "capture.btn.upload": "Tải ảnh lên",
    "capture.overlay.20x30": "KHỔ 20x30 (A4)",
    "capture.overlay.3x4": "KHỔ 3x4",
    "capture.overlay.4x6": "KHỔ 4x6",
    "capture.overlay.5x5": "KHỔ 5x5 (VISA)",
    "capture.margin": "IN A4",
    "capture.device.mobile": "Dùng điện thoại",
    "mobile.title": "Mobile",

    // Editor
    "editor.header": "Xử lý ảnh",
    "editor.tab.bg": "1. Nền",
    "editor.tab.clothing": "2. Áo",
    "editor.tab.makeup": "3. Makeup",
    "editor.tab.filter": "4. Bộ lọc",
    "editor.btn.apply": "Áp dụng",
    "editor.btn.retake": "Chọn ảnh khác",
    "editor.btn.finish": "Hoàn tất & In",
    "editor.label.original": "Ảnh Gốc",
    "editor.label.result": "Kết quả",
    "editor.loading": "Đang phục chế...",
    "editor.gender.male": "Nam",
    "editor.gender.female": "Nữ",
    "editor.clothing.none": "Giữ nguyên",
    "editor.makeup.definition": "Định hình & Chi tiết",
    "editor.makeup.eyebrow": "Vẽ chân mày",
    "editor.makeup.eyelash": "Làm dày lông mi",
    "editor.makeup.contour": "Tạo khối khuôn mặt",
    "editor.makeup.blemish": "Làm sạch mụn/vết ố",
    "editor.makeup.smooth": "Làm mịn da",
    "editor.makeup.lipstick": "Màu Môi",
    "editor.makeup.blush": "Má Hồng",
    "editor.makeup.hair": "Màu Tóc",
    "editor.filter.lighting": "Độ sáng",
    "editor.filter.contrast": "Tương phản",
    "editor.filter.skintone": "Tông màu da",
    "editor.filter.intensity": "Cường độ màu da",
    "editor.history.download": "Tải phiên bản này",

    // Info Tab
    "editor.info.title": "Thông tin",
    "editor.info.desc": "Thêm văn bản (Tên, Năm sinh, Năm mất...).",

    // Restoration
    "editor.restoration.title": "Phục hồi ảnh",
    "editor.restoration.desc": "Khôi phục ảnh mờ, nhiễu và vỡ nét. Tối ưu cho ảnh cũ.",
    "editor.restoration.intensity": "Mức độ phục hồi",
    "editor.restoration.colorize": "Tô màu (Ảnh đen trắng)",
    "editor.restoration.sharpen": "Tăng nét (Sharpen)",

    // Print
    "print.header": "Xem trước bản in",
    "print.main_actions": "Thao tác chính",
    "print.btn.download": "Tải File In",
    "print.btn.print": "IN NGAY",
    "print.btn.saving": "LƯU...",
    "print.btn.processing": "XỬ LÝ...",
    "print.note.title": "Lưu ý:",
    "print.note.text": "Chọn khổ giấy \"A4\" khi in.",
    "print.qr.title": "Mã QR Tải Ảnh",
    "print.msg.generating": "Đang tạo file A4...",
    "print.msg.saving_cloud": "Đang lưu Cloud...",
    "print.footer.default": "Khổ 20x30 - PHOTO RESTORATION",
    
    // Gallery
    "gallery.title": "Kho ảnh đã làm",
    "gallery.refresh": "Làm mới danh sách",
    "gallery.empty": "Chưa có ảnh nào được lưu.",
    "gallery.loading": "Đang tải dữ liệu...",
    "gallery.reprint": "In lại ảnh này",
    
    // Admin Sidebar
    "admin.header": "RESTORATION Admin",
    "admin.tab.system": "Hệ thống",
    "admin.tab.system.desc": "Branding, Cấu hình",
    "admin.tab.ai_beauty": "AI & Beauty",
    "admin.tab.ai_beauty.desc": "Trang phục, Makeup",
    "admin.tab.security": "Bảo mật",
    "admin.tab.security.desc": "Mật khẩu quản trị",
    
    // Admin Sub Tabs
    "admin.sub.general": "Chung",
    "admin.sub.design": "Giao diện",
    "admin.sub.custom": "Quảng cáo",
    "admin.sub.rules": "Quy định",
    "admin.sub.testing": "Kiểm tra",
    "admin.sub.clothing": "Trang phục",
    "admin.sub.makeup": "Làm đẹp & Tóc",

    // Admin General
    "admin.general.sync": "Dữ liệu Cloud",
    "admin.general.branding": "Thương hiệu",
    "admin.general.logo": "Logo",
    "admin.general.remove_logo": "Gỡ Logo",
    "admin.general.shop_name": "Tên ứng dụng",
    "admin.general.footer": "Footer bản in",
    "admin.general.language": "Ngôn ngữ",
    
    // Admin Design
    "admin.design.colors": "Màu sắc chủ đạo",
    "admin.design.theme": "Chế độ giao diện (Theme)",
    "theme.light": "Sáng (Light)",
    "theme.dark": "Tối (Dark)",
    "theme.system": "Theo cài đặt thiết bị",

    // Admin Security
    "admin.security.password": "BẢO MẬT QUẢN TRỊ",
    "admin.security.new_pass": "MẬT KHẨU MỚI",
    "admin.security.warning": "Cảnh báo",
    "admin.security.warning_text": "Mật khẩu này dùng để truy cập vào bảng quản trị.",
  },
  en: {
    // General
    "app.name": "Photo Restoration",
    "btn.save": "Save Changes",
    "btn.cancel": "Cancel",
    "btn.delete": "Delete",
    "btn.add": "Add New",
    "btn.back": "Back",
    "btn.close": "Close",
    "btn.exit": "Exit",
    "btn.login": "Login",
    "btn.home": "Home",
    "btn.start": "Start",
    "btn.retry": "Retry",
    "status.ready": "Ready",
    "status.syncing": "Syncing...",
    "status.saving": "Saving...",
    
    // Start Screen
    "start.welcome": "Welcome to",
    "start.subtitle": "PHOTO RESTORATION",
    "start.step1": "1. Size",
    "start.step2": "2. Background",
    "start.step3": "3. Quantity",
    "start.regulations": "Info",
    "start.important": "Important",
    "start.important_text": "Ensure the original photo is evenly lit and flat.",
    "start.standard": "Size",
    "start.bg_white": "White",
    "start.bg_blue": "Blue",
    "start.bg_gray": "Gray",
    "photo.type.20x30": "Restoration 20x30cm",
    "photo.type.3x4": "ID Photo 3x4 cm",
    "photo.type.4x6": "ID Photo 4x6 cm",
    
    // Capture (Now Upload)
    "capture.device.select": "",
    "capture.status.valid": "Good",
    "capture.status.adjusting": "Adjusting...",
    "capture.label.processing": "Scanning...",
    "capture.label.valid": "Valid",
    "capture.msg.no_face": "No face detected",
    "capture.msg.move_in": "Move closer",
    "capture.msg.valid": "Hold still...",
    "capture.tooltip.auto_on": "Auto: ON",
    "capture.tooltip.auto_off": "Auto: OFF",
    "capture.msg.upload_prompt": "Upload old photo",
    "capture.btn.upload": "Upload Photo",
    "capture.overlay.20x30": "20x30 (A4)",
    "capture.overlay.3x4": "3x4",
    "capture.overlay.4x6": "4x6",
    "capture.overlay.5x5": "5x5 (VISA)",
    "capture.margin": "A4 PRINT",
    "capture.device.mobile": "Use Mobile",
    "mobile.title": "Mobile",

    // Editor
    "editor.header": "Restoration Editor",
    "editor.tab.bg": "1. BG",
    "editor.tab.clothing": "2. Suit",
    "editor.tab.makeup": "3. Beauty",
    "editor.tab.filter": "4. Filter",
    "editor.btn.apply": "Apply",
    "editor.btn.retake": "New Photo",
    "editor.btn.finish": "Finish & Print",
    "editor.label.original": "Original",
    "editor.label.result": "Result",
    "editor.loading": "Restoring...",
    "editor.gender.male": "Male",
    "editor.gender.female": "Female",
    "editor.clothing.none": "Original",
    "editor.makeup.definition": "Definition",
    "editor.makeup.eyebrow": "Eyebrows",
    "editor.makeup.eyelash": "Eyelashes",
    "editor.makeup.contour": "Contour",
    "editor.makeup.blemish": "Blemishes/Stains",
    "editor.makeup.smooth": "Smooth Skin",
    "editor.makeup.lipstick": "Lips",
    "editor.makeup.blush": "Blush",
    "editor.makeup.hair": "Hair",
    "editor.filter.lighting": "Brightness",
    "editor.filter.contrast": "Contrast",
    "editor.filter.skintone": "Skin Tone",
    "editor.filter.intensity": "Intensity",
    "editor.history.download": "Download this version",

    // Info Tab
    "editor.info.title": "Details",
    "editor.info.desc": "Add text (Name, Dates...).",

    // Restoration
    "editor.restoration.title": "Restoration",
    "editor.restoration.desc": "Restore old, blurry, or damaged photos.",
    "editor.restoration.intensity": "Strength",
    "editor.restoration.colorize": "Colorize",
    "editor.restoration.sharpen": "Sharpen",

    // Print
    "print.header": "Print Preview",
    "print.main_actions": "Main Actions",
    "print.btn.download": "Download",
    "print.btn.print": "PRINT",
    "print.btn.saving": "SAVING...",
    "print.btn.processing": "WAIT...",
    "print.note.title": "Note:",
    "print.note.text": "Select \"A4\" paper.",
    "print.qr.title": "QR Download",
    "print.msg.generating": "Generating A4...",
    "print.msg.saving_cloud": "Cloud Sync...",
    "print.footer.default": "PHOTO RESTORATION",

    // Gallery
    "gallery.title": "Restored Photos",
    "gallery.refresh": "Refresh",
    "gallery.empty": "No photos yet.",
    "gallery.loading": "Loading...",
    "gallery.reprint": "Reprint",

    // Admin Sidebar
    "admin.header": "RESTORATION",
    "admin.tab.system": "System",
    "admin.tab.system.desc": "Branding & Config",
    "admin.tab.ai_beauty": "AI Beauty",
    "admin.tab.ai_beauty.desc": "Clothes & Makeup",
    "admin.tab.security": "Security",
    "admin.tab.security.desc": "Admin Access",

    // Admin Sub Tabs
    "admin.sub.general": "General",
    "admin.sub.design": "UI",
    "admin.sub.custom": "Ads",
    "admin.sub.rules": "Rules",
    "admin.sub.testing": "Test",
    "admin.sub.clothing": "Clothing",
    "admin.sub.makeup": "Beauty",

    // Admin General
    "admin.general.sync": "Cloud Data",
    "admin.general.branding": "Branding",
    "admin.general.logo": "Logo",
    "admin.general.remove_logo": "Remove",
    "admin.general.shop_name": "App Name",
    "admin.general.footer": "Footer",
    "admin.general.language": "Language",

    // Admin Design
    "admin.design.colors": "Theme Colors",
    "admin.design.theme": "Mode",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.system": "Auto",

    // Admin Security
    "admin.security.password": "ADMIN SECURITY",
    "admin.security.new_pass": "NEW PASSWORD",
    "admin.security.warning": "Warning",
    "admin.security.warning_text": "Access password for Admin panel.",
  }
};

export const t = (key: string, config: AppConfig): string => {
  const lang = config.language || 'vi';
  return translations[lang][key] || key;
};
