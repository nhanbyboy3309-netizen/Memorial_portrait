
/**
 * ID PHOTO BOOTH PRO - BACKEND ENGINE
 * Dành cho Google Apps Script
 */

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

function savePhoto(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Photos');
  var id = data.id || ('IMG_' + new Date().getTime());
  
  // Xóa ảnh cũ nếu trùng ID (để tránh rác khi chụp lại trên mobile)
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }

  sheet.appendRow([
    id,
    data.timestamp || new Date().getTime(),
    data.dataUrl,
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
