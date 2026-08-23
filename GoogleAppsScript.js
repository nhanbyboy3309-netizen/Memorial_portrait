
/**
 * ID PHOTO BOOTH PRO - BACKEND ENGINE
 * Dành cho Google Apps Script
 */

// Optional: ID thư mục Google Drive để lưu ảnh (để trống = lưu vào My Drive gốc)
var DRIVE_FOLDER_ID = "";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Đợi tối đa 10 giây
  
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var result = { success: false };

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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
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
// Sheet chỉ giới hạn 50.000 ký tự/ô — ảnh base64 (nhất là ảnh 20x30 độ phân giải cao) rất dễ
// vượt giới hạn này, gây lỗi "Unexpected error ... getValues on object Range" khi đọc lại.
function uploadDataUrlToDrive(dataUrl, fileName) {
  var splitBase64 = dataUrl.split(',');
  var dataPart = splitBase64.length > 1 ? splitBase64[1] : splitBase64[0];
  var bytes = Utilities.base64Decode(dataPart);
  var blob = Utilities.newBlob(bytes, 'image/png', fileName || 'photo.png');

  var folder;
  if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID.trim() !== '') {
    try {
      folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
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
    // File đã bị xoá trước đó hoặc không có quyền — bỏ qua.
  }
}

function savePhoto(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
  // Nếu client gửi sẵn 1 URL (đã upload trước đó), giữ nguyên.
  var storedUrl = data.dataUrl;
  if (typeof storedUrl === 'string' && storedUrl.indexOf('data:') === 0) {
    var uploadResult = uploadDataUrlToDrive(storedUrl, id + '.png');
    storedUrl = uploadResult.url;
  }

  sheet.appendRow([
    id,
    data.timestamp || new Date().getTime(),
    storedUrl,
    JSON.stringify(data.settings)
  ]);

  return { success: true, id: id };
}

function getPhoto(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Photos');
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      return {
        success: true,
        photo: {
          id: rows[i][0],
          timestamp: rows[i][1],
          dataUrl: rows[i][2],
          settings: JSON.parse(rows[i][3])
        }
      };
    }
  }
  return { success: false, error: 'Not found' };
}

function listPhotos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Photos');
  var rows = sheet.getDataRange().getValues();
  var photos = [];
  
  // Trả về tối đa 50 ảnh gần nhất
  var start = Math.max(1, rows.length - 50);
  for (var i = rows.length - 1; i >= start; i--) {
    photos.push({
      id: rows[i][0],
      timestamp: rows[i][1],
      dataUrl: rows[i][2],
      settings: JSON.parse(rows[i][3])
    });
  }
  return { success: true, photos: photos };
}

function deletePhoto(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Photos');
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false };
}

function saveConfig(config) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  sheet.clear();
  sheet.appendRow(['Key', 'Value']);
  sheet.appendRow(['app_settings', JSON.stringify(config)]);
  return { success: true };
}

function getConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == 'app_settings') {
      return { success: true, config: JSON.parse(rows[i][1]) };
    }
  }
  return { success: false };
}
