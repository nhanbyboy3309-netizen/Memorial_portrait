/**
 * =========================================================================
 * ID PHOTO BOOTH PRO - GOOGLE APPS SCRIPT CLOUD BACKEND ENGINE
 * =========================================================================
 * HƯỚNG DẪN CÀI ĐẶT (SETUP GUIDE):
 * 
 * BƯỚC 1: Tạo một Google Sheet mới trên Google Drive (drive.google.com).
 * BƯỚC 2: Vào menu: Tiện ích mở rộng (Extensions) > Apps Script.
 * BƯỚC 3: Xóa hết code mặc định, dán toàn bộ nội dung file này vào editor.
 * BƯỚC 4: Nhấn nút "Triển khai" (Deploy) ở góc trên bên phải > "Tùy chọn triển khai mới" (New deployment).
 *         - Loại (Type): Web app (Ứng dụng web)
 *         - Mô tả (Description): ID Photo Booth v1
 *         - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *         - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone)  <-- CỰC KỲ QUAN TRỌNG!
 * BƯỚC 5: Nhấn "Triển khai" (Deploy), cấp quyền truy cập tài khoản Google khi được hỏi.
 * BƯỚC 6: Sao chép URL của Ứng dụng web (kết thúc bằng /exec) và dán vào phần
 *         "Cấu hình hệ thống > Google Apps Script URL" trong trang Quản trị (Admin).
 * =========================================================================
 */

// Tuỳ chọn 1: ID Google Sheet nếu dùng Apps Script độc lập (Standalone Script).
// Để trống nếu tạo Apps Script trực tiếp từ menu "Tiện ích mở rộng > Apps Script" của Google Sheet.
var SPREADSHEET_ID = "";

// Tuỳ chọn 2: ID thư mục Google Drive để lưu ảnh (để trống = lưu vào My Drive gốc).
var DRIVE_FOLDER_ID = "";

/**
 * Lấy đối tượng Spreadsheet an toàn (hỗ trợ cả Bound Script lẫn Standalone Script)
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("Không tìm thấy Google Sheet. Nếu bạn tạo Standalone Apps Script, vui lòng nhập SPREADSHEET_ID ở đầu file.");
  }
  return ss;
}

/**
 * Xử lý yêu cầu GET (kiểm tra trạng thái ping, đọc ảnh trực tiếp)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';

  if (action === 'ping') {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      status: "online",
      message: "ID Photo Booth Cloud Backend is ready!",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getPhoto' && e.parameter.id) {
    var photoResult = getPhoto(e.parameter.id);
    return ContentService.createTextOutput(JSON.stringify(photoResult))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getConfig') {
    var configResult = getConfig();
    return ContentService.createTextOutput(JSON.stringify(configResult))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    name: "ID Photo Booth API",
    status: "active"
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Xử lý yêu cầu POST (lưu ảnh, lấy ảnh, quản lý danh sách, cấu hình)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000); // Đợi tối đa 15 giây
  
  try {
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = JSON.parse(contents);
    var action = data.action;
    var result = { success: false, error: "Unknown action" };

    // Khởi tạo các Sheet nếu chưa có
    initSheets();

    if (action === 'savePhoto') {
      result = savePhoto(data);
    } else if (action === 'getPhoto') {
      result = getPhoto(data.id);
    } else if (action === 'listPhotos') {
      result = listPhotos();
    } else if (action === 'deletePhoto') {
      result = deletePhoto(data);
    } else if (action === 'saveConfig') {
      result = saveConfig(data.config);
    } else if (action === 'getConfig') {
      result = getConfig();
    } else if (action === 'ping') {
      result = { success: true, status: "online" };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function initSheets() {
  var ss = getSpreadsheet();
  
  // Sheet lưu ảnh
  if (!ss.getSheetByName('Photos')) {
    var photoSheet = ss.insertSheet('Photos');
    photoSheet.appendRow(['ID', 'Timestamp', 'DataUrl', 'Settings']);
    photoSheet.getRange("1:1").setFontWeight("bold").setBackground("#f3f3f3");
  }
  
  // Sheet lưu cấu hình
  if (!ss.getSheetByName('Config')) {
    var configSheet = ss.insertSheet('Config');
    configSheet.appendRow(['Key', 'Value']);
    configSheet.getRange("1:1").setFontWeight("bold").setBackground("#f3f3f3");
  }
}

// Upload ảnh base64 (data:image/...;base64,....) lên Google Drive và trả về link xem trực tiếp.
function uploadDataUrlToDrive(dataUrl, fileName) {
  var splitBase64 = dataUrl.split(',');
  var dataPart = splitBase64.length > 1 ? splitBase64[1] : splitBase64[0];
  var bytes = Utilities.base64Decode(dataPart);
  var blob = Utilities.newBlob(bytes, 'image/png', fileName || 'photo.png');

  var folder;
  if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID.trim() !== '') {
    try {
      folder = DriveApp.getFolderById(DRIVE_FOLDER_ID.trim());
    } catch (e) {
      folder = DriveApp.getRootFolder();
    }
  } else {
    folder = DriveApp.getRootFolder();
  }

  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w4000",
    fileId: file.getId()
  };
}

// Xoá file Drive cũ (nếu có) khi ghi đè cùng 1 ID, tránh rác Drive.
function deleteDriveFileIfLinked(storedValue) {
  if (!storedValue || typeof storedValue !== 'string') return;
  var match = storedValue.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!match) return;
  try {
    DriveApp.getFileById(match[1]).setTrashed(true);
  } catch (e) {
    // Bỏ qua nếu file đã xoá
  }
}

function savePhoto(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Photos');
  var id = data.id || ('IMG_' + new Date().getTime());

  // Xóa ảnh cũ nếu trùng ID (để tránh rác khi chụp lại trên mobile)
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      deleteDriveFileIfLinked(rows[i][2]);
      sheet.deleteRow(i + 1);
      break;
    }
  }

  // Nếu là ảnh base64 thô, upload lên Drive và chỉ lưu link vào Sheet.
  var storedUrl = data.dataUrl;
  if (typeof storedUrl === 'string' && storedUrl.indexOf('data:') === 0) {
    try {
      var uploadResult = uploadDataUrlToDrive(storedUrl, id + '.png');
      storedUrl = uploadResult.url;
    } catch (driveErr) {
      // Nếu Drive quota hết hoặc bị chặn, giữ URL để không mất ảnh
      Logger.log("Drive upload error: " + driveErr.toString());
    }
  }

  sheet.appendRow([
    id,
    data.timestamp || new Date().getTime(),
    storedUrl,
    JSON.stringify(data.settings || {})
  ]);

  return { success: true, id: id };
}

function getPhoto(id) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Photos');
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      var settings = {};
      try {
        settings = JSON.parse(rows[i][3] || '{}');
      } catch (e) {}
      
      return {
        success: true,
        photo: {
          id: rows[i][0],
          timestamp: rows[i][1],
          dataUrl: rows[i][2],
          settings: settings
        }
      };
    }
  }
  return { success: false, error: 'Not found' };
}

function listPhotos() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Photos');
  var rows = sheet.getDataRange().getValues();
  var photos = [];
  
  // Trả về tối đa 50 ảnh gần nhất
  var start = Math.max(1, rows.length - 50);
  for (var i = rows.length - 1; i >= start; i--) {
    var settings = {};
    try {
      settings = JSON.parse(rows[i][3] || '{}');
    } catch (e) {}

    photos.push({
      id: rows[i][0],
      timestamp: rows[i][1],
      dataUrl: rows[i][2],
      settings: settings
    });
  }
  return { success: true, photos: photos };
}

function deletePhoto(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Photos');
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      deleteDriveFileIfLinked(rows[i][2]);
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false };
}

function saveConfig(config) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  sheet.clear();
  sheet.appendRow(['Key', 'Value']);
  sheet.appendRow(['app_settings', JSON.stringify(config || {})]);
  return { success: true };
}

function getConfig() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == 'app_settings') {
      try {
        return { success: true, config: JSON.parse(rows[i][1]) };
      } catch (e) {}
    }
  }
  return { success: false };
}
