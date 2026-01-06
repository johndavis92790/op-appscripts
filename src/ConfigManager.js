/**
 * Configuration Manager
 * 
 * Shared utilities for managing configuration sheets.
 * Provides consistent config handling across all tools.
 */

var ConfigManager = (function() {
  
  var ConfigManager = {};
  var DEFAULT_CONFIG_SHEET = 'Config';
  
  ConfigManager.createConfigSheet = function(sheetName, configItems) {
    sheetName = sheetName || DEFAULT_CONFIG_SHEET;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName(sheetName);
    
    if (!configSheet) {
      configSheet = ss.insertSheet(sheetName);
    }
    
    configSheet.clear();
    
    var headers = [['Setting', 'Value', 'Description']];
    var rows = headers.concat(configItems);
    
    configSheet.getRange(1, 1, rows.length, 3).setValues(rows);
    configSheet.getRange('A1:C1')
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    
    configSheet.setColumnWidth(1, 200);
    configSheet.setColumnWidth(2, 200);
    configSheet.setColumnWidth(3, 400);
    configSheet.setFrozenRows(1);
    
    Logger.log('INFO', 'config_created', 'Config sheet created with ' + configItems.length + ' items');
    
    return configSheet;
  };
  
  ConfigManager.getValue = function(key, sheetName) {
    sheetName = sheetName || DEFAULT_CONFIG_SHEET;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName(sheetName);
    
    if (!configSheet) {
      throw new Error('Config sheet "' + sheetName + '" not found. Run initialization first.');
    }
    
    var data = configSheet.getRange('A2:B100').getValues();
    
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === key) {
        return data[i][1];
      }
    }
    
    return null;
  };
  
  ConfigManager.getValues = function(keys, sheetName) {
    sheetName = sheetName || DEFAULT_CONFIG_SHEET;
    
    var result = {};
    
    for (var i = 0; i < keys.length; i++) {
      result[keys[i]] = this.getValue(keys[i], sheetName);
    }
    
    return result;
  };
  
  ConfigManager.validateRequired = function(keys, sheetName) {
    sheetName = sheetName || DEFAULT_CONFIG_SHEET;
    
    var missing = [];
    
    for (var i = 0; i < keys.length; i++) {
      var value = this.getValue(keys[i], sheetName);
      if (!value || value === '') {
        missing.push(keys[i]);
      }
    }
    
    if (missing.length > 0) {
      throw new Error('Missing required configuration: ' + missing.join(', '));
    }
  };
  
  ConfigManager.setValue = function(key, value, sheetName) {
    sheetName = sheetName || DEFAULT_CONFIG_SHEET;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName(sheetName);
    
    if (!configSheet) {
      throw new Error('Config sheet "' + sheetName + '" not found.');
    }
    
    var data = configSheet.getRange('A2:B100').getValues();
    
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === key) {
        configSheet.getRange(i + 2, 2).setValue(value);
        Logger.log('INFO', 'config_updated', 'Updated ' + key + ' = ' + value);
        return;
      }
    }
    
    throw new Error('Config key "' + key + '" not found in sheet.');
  };
  
  return ConfigManager;
})();
