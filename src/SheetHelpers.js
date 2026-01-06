/**
 * Sheet Helper Functions
 * 
 * Shared utilities for Google Sheets operations.
 * Handles common patterns like writing data, formatting, clearing sheets.
 */

var SheetHelpers = (function() {
  
  var SheetHelpers = {};
  
  SheetHelpers.getOrCreateSheet = function(sheetName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log('INFO', 'sheet_created', 'Created sheet: ' + sheetName);
    }
    
    return sheet;
  };
  
  SheetHelpers.clearSheet = function(sheet) {
    sheet.clear();
    Logger.log('INFO', 'sheet_cleared', 'Cleared sheet: ' + sheet.getName());
  };
  
  SheetHelpers.writeHeaders = function(sheet, headers) {
    if (!headers || headers.length === 0) return;
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    
    Logger.log('INFO', 'headers_written', 'Wrote ' + headers.length + ' headers to ' + sheet.getName());
  };
  
  SheetHelpers.writeData = function(sheet, data, startRow) {
    if (!data || data.length === 0) return;
    
    startRow = startRow || 2;
    var numCols = data[0].length;
    
    sheet.getRange(startRow, 1, data.length, numCols).setValues(data);
    
    Logger.log('INFO', 'data_written', 'Wrote ' + data.length + ' rows to ' + sheet.getName());
  };
  
  SheetHelpers.writeDataWithHeaders = function(sheet, headers, data) {
    this.clearSheet(sheet);
    this.writeHeaders(sheet, headers);
    
    if (data && data.length > 0) {
      this.writeData(sheet, data, 2);
    }
  };
  
  SheetHelpers.batchWriteData = function(sheet, headers, allData, batchSize) {
    batchSize = batchSize || 50000;
    
    this.clearSheet(sheet);
    this.writeHeaders(sheet, headers);
    
    var startRow = 2;
    
    for (var i = 0; i < allData.length; i += batchSize) {
      var batch = allData.slice(i, i + batchSize);
      this.writeData(sheet, batch, startRow);
      startRow += batch.length;
      
      Logger.log('INFO', 'batch_written', 'Batch ' + (Math.floor(i / batchSize) + 1) + ': ' + batch.length + ' rows');
    }
    
    Logger.log('INFO', 'batch_write_complete', 'Total rows written: ' + allData.length);
  };
  
  SheetHelpers.autoResizeColumns = function(sheet, numColumns) {
    for (var i = 1; i <= numColumns; i++) {
      sheet.autoResizeColumn(i);
    }
  };
  
  SheetHelpers.setColumnWidths = function(sheet, widths) {
    for (var i = 0; i < widths.length; i++) {
      sheet.setColumnWidth(i + 1, widths[i]);
    }
  };
  
  SheetHelpers.findColumnIndex = function(headers, columnName) {
    for (var i = 0; i < headers.length; i++) {
      if (headers[i] === columnName) {
        return i;
      }
    }
    return -1;
  };
  
  SheetHelpers.getUniqueValues = function(data, columnIndex) {
    var unique = {};
    
    for (var i = 0; i < data.length; i++) {
      var value = data[i][columnIndex];
      if (value) {
        unique[value] = true;
      }
    }
    
    return Object.keys(unique);
  };
  
  SheetHelpers.filterRows = function(data, columnIndex, filterValues) {
    var filterSet = {};
    for (var i = 0; i < filterValues.length; i++) {
      filterSet[filterValues[i]] = true;
    }
    
    return data.filter(function(row) {
      return filterSet[row[columnIndex]];
    });
  };
  
  SheetHelpers.sortByColumn = function(data, columnIndex, ascending) {
    ascending = ascending !== false;
    
    return data.sort(function(a, b) {
      var valA = a[columnIndex];
      var valB = b[columnIndex];
      
      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    });
  };
  
  SheetHelpers.joinData = function(leftData, rightData, leftKeyIndex, rightKeyIndex) {
    var rightMap = {};
    
    for (var i = 0; i < rightData.length; i++) {
      var key = rightData[i][rightKeyIndex];
      if (!rightMap[key]) {
        rightMap[key] = [];
      }
      rightMap[key].push(rightData[i]);
    }
    
    var result = [];
    
    for (var j = 0; j < leftData.length; j++) {
      var leftRow = leftData[j];
      var key = leftRow[leftKeyIndex];
      var rightRows = rightMap[key] || [];
      
      if (rightRows.length === 0) {
        result.push(leftRow);
      } else {
        for (var k = 0; k < rightRows.length; k++) {
          result.push(leftRow.concat(rightRows[k]));
        }
      }
    }
    
    return result;
  };
  
  return SheetHelpers;
})();
