/**
 * Logging System
 * 
 * Shared logging utility that writes to a Log sheet.
 * Provides consistent logging across all tools.
 */

var Logger = (function() {
  
  var Logger = {};
  var LOG_SHEET_NAME = 'Execution_Log';
  
  Logger.log = function(level, action, message) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
      
      if (!logSheet) {
        logSheet = ss.insertSheet(LOG_SHEET_NAME);
        logSheet.getRange('A1:D1').setValues([['Timestamp', 'Level', 'Action', 'Message']]);
        logSheet.getRange('A1:D1')
          .setFontWeight('bold')
          .setBackground('#4285f4')
          .setFontColor('#ffffff');
        logSheet.setFrozenRows(1);
      }
      
      var timestamp = new Date();
      logSheet.appendRow([timestamp, level, action, message]);
      
      console.log('[' + level + '] ' + action + ': ' + message);
      
    } catch (e) {
      console.error('Failed to write log: ' + e.toString());
    }
  };
  
  Logger.info = function(action, message) {
    this.log('INFO', action, message);
  };
  
  Logger.warn = function(action, message) {
    this.log('WARN', action, message);
  };
  
  Logger.error = function(action, message) {
    this.log('ERROR', action, message);
  };
  
  Logger.clearLog = function() {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
      
      if (logSheet) {
        logSheet.clear();
        logSheet.getRange('A1:D1').setValues([['Timestamp', 'Level', 'Action', 'Message']]);
        logSheet.getRange('A1:D1')
          .setFontWeight('bold')
          .setBackground('#4285f4')
          .setFontColor('#ffffff');
        logSheet.setFrozenRows(1);
        
        this.log('INFO', 'log_cleared', 'Log cleared by user');
      }
    } catch (e) {
      console.error('Failed to clear log: ' + e.toString());
    }
  };
  
  return Logger;
})();
