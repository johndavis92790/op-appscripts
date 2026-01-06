/**
 * ObservePoint Grid API Importer
 * 
 * Imports large saved reports from ObservePoint using the Grid API.
 * Handles datasets with hundreds of thousands of rows efficiently.
 * 
 * Setup:
 * 1. Run initializeConfig() to create Config sheet
 * 2. Add your ObservePoint API key to Config sheet
 * 3. Add the Saved Report ID you want to import
 * 4. Use menu: ObservePoint > Import Saved Report
 */

const GRID_CONFIG_SHEET_NAME = 'GridImporter_Config';
const GRID_DATA_SHEET_NAME = 'Imported_Data';
const GRID_PROGRESS_SHEET_NAME = 'GridImporter_Progress';

const GRID_API_BASE = 'https://api.observepoint.com/v3/reports/grid';
const ROWS_PER_PAGE = 10000;
const MAX_SHEET_ROWS = 10000000;

// Global progress tracking
var IMPORT_PROGRESS = {
  status: 'Not started',
  details: '',
  percent: 0,
  complete: false
};

function gridImporter_initConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName(GRID_CONFIG_SHEET_NAME);
  
  if (!configSheet) {
    configSheet = ss.insertSheet(GRID_CONFIG_SHEET_NAME);
  }
  
  configSheet.clear();
  
  const headers = [
    ['Setting', 'Value', 'Description'],
    ['OP_API_KEY', '', 'Your ObservePoint API key from https://app.observepoint.com/my-profile'],
    ['SAVED_REPORT_ID', '', 'The ID of the saved report to import (e.g., 16008)'],
    ['BATCH_SIZE', '50000', 'Number of rows to write at once (adjust if hitting memory limits)'],
    ['MAX_PAGES', '', 'Maximum pages to fetch (leave empty for all pages)']
  ];
  
  configSheet.getRange(1, 1, headers.length, 3).setValues(headers);
  configSheet.getRange('A1:C1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  configSheet.setColumnWidth(1, 200);
  configSheet.setColumnWidth(2, 200);
  configSheet.setColumnWidth(3, 400);
  configSheet.setFrozenRows(1);
  
  createLogSheet();
  
  SpreadsheetApp.getUi().alert(
    'Configuration Initialized',
    'Config sheet created. Please add:\n\n' +
    '1. Your ObservePoint API key\n' +
    '2. The Saved Report ID to import\n\n' +
    'Then use ObservePoint menu > Import Saved Report',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function createLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  
  if (!logSheet) {
    logSheet = ss.insertSheet(LOG_SHEET_NAME);
    logSheet.getRange('A1:D1').setValues([['Timestamp', 'Level', 'Action', 'Message']]);
    logSheet.getRange('A1:D1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    logSheet.setFrozenRows(1);
  }
}

function getConfigValue(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(GRID_CONFIG_SHEET_NAME);
  
  if (!configSheet) {
    throw new Error('Config sheet not found. Run initializeConfig() first.');
  }
  
  const data = configSheet.getRange('A2:B10').getValues();
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      return data[i][1];
    }
  }
  
  return null;
}

function log(level, action, message) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    
    if (!logSheet) {
      createLogSheet();
      logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    }
    
    const timestamp = new Date();
    logSheet.appendRow([timestamp, level, action, message]);
    
    console.log(`[${level}] ${action}: ${message}`);
  } catch (e) {
    console.error('Failed to write log:', e);
  }
}

function gridImporter_importReport() {
  const startTime = new Date();
  
  try {
    // Reset progress
    updateImportProgress('Starting import...', '', 0, false);
    
    // Check if config exists, if not show dialog
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName(GRID_CONFIG_SHEET_NAME);
    
    let apiKey, reportId, batchSize, maxPages;
    
    try {
      apiKey = getConfigValue('OP_API_KEY');
      reportId = getConfigValue('SAVED_REPORT_ID');
      batchSize = parseInt(getConfigValue('BATCH_SIZE')) || 50000;
      maxPages = getConfigValue('MAX_PAGES') ? parseInt(getConfigValue('MAX_PAGES')) : null;
    } catch (e) {
      // Config doesn't exist or is incomplete
      apiKey = null;
      reportId = null;
    }
    
    if (!apiKey || !reportId) {
      // Show interactive config dialog
      showGridImporterConfigDialog();
      return;
    }
    
    log('INFO', 'import_start', `Starting import of saved report ${reportId}`);
    updateImportProgress('Fetching report configuration...', 'Connecting to ObservePoint API', 5, false);
    
    const reportData = getQueryDefinition(apiKey, reportId);
    log('INFO', 'query_fetched', `Retrieved query definition for report: ${reportData.name || reportId}`);
    updateImportProgress('Configuration retrieved', `Report: ${reportData.name || reportId}`, 10, false);
    
    // Create unique sheet name based on report name and timestamp
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss');
    const sheetName = (reportData.name || 'Report_' + reportId).substring(0, 50) + '_' + timestamp;
    
    const totalRows = fetchAllData(apiKey, reportData.gridEntityType, reportData.queryDefinition, batchSize, maxPages, sheetName);
    
    const duration = ((new Date() - startTime) / 1000).toFixed(2);
    log('INFO', 'import_complete', `Import completed successfully. ${totalRows} rows imported in ${duration} seconds.`);
    updateImportProgress('Import complete!', `${totalRows.toLocaleString()} rows imported in ${duration}s`, 100, true);
    
    // Show success dialog
    showGridImporterProgressDialog(reportData.name, totalRows, duration, sheetName);
    
  } catch (error) {
    log('ERROR', 'import_failed', error.toString());
    updateImportProgress('Import failed', error.toString(), 0, true);
    SpreadsheetApp.getUi().alert(
      'Import Failed',
      'Error: ' + error.toString() + '\n\nCheck the Import_Log sheet for details.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    throw error;
  }
}

function getQueryDefinition(apiKey, reportId) {
  const url = `${GRID_API_BASE}/saved/${reportId}`;
  
  const options = {
    method: 'get',
    headers: {
      'Authorization': `api_key ${apiKey}`,
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  
  if (response.getResponseCode() >= 300) {
    throw new Error(`Failed to fetch saved report ${reportId}: ${response.getContentText()}`);
  }
  
  const savedReport = JSON.parse(response.getContentText());
  
  if (!savedReport.queryDefinition) {
    throw new Error(`No query definition found in saved report ${reportId}`);
  }
  
  // Extract gridEntityType from the saved report
  // The API returns it at the top level, not in queryDefinition
  const gridEntityType = savedReport.gridEntityType || savedReport.queryDefinition.gridEntityType;
  
  if (!gridEntityType) {
    throw new Error(`No gridEntityType found in saved report ${reportId}. Response: ${JSON.stringify(savedReport)}`);
  }
  
  // Return both the query definition and the entity type
  return {
    queryDefinition: savedReport.queryDefinition,
    gridEntityType: gridEntityType,
    name: savedReport.name
  };
}

function fetchAllData(apiKey, gridEntityType, queryDefinition, batchSize, maxPages, sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Always create a new sheet with unique name
  const dataSheet = ss.insertSheet(sheetName);
  
  let currentPage = 0;
  let totalRows = 0;
  let allRows = [];
  let columnHeaders = null;
  let currentSheetRow = 2; // Track current row in sheet (1 is header)
  
  while (true) {
    if (maxPages && currentPage >= maxPages) {
      log('INFO', 'max_pages_reached', `Stopped at page ${currentPage} (max pages limit)`);
      break;
    }
    
    log('INFO', 'fetch_page', `Fetching page ${currentPage + 1}...`);
    updateImportProgress(`Fetching page ${currentPage + 1}`, `${totalRows.toLocaleString()} rows imported so far`, 10 + (currentPage * 2), false);
    
    const pageData = fetchGridPage(apiKey, gridEntityType, queryDefinition, currentPage);
    
    if (!pageData || !pageData.rows || pageData.rows.length === 0) {
      log('INFO', 'no_more_data', `No more data at page ${currentPage + 1}`);
      break;
    }
    
    if (currentPage === 0) {
      // Extract column headers from metadata
      if (pageData.metadata && pageData.metadata.headers) {
        columnHeaders = pageData.metadata.headers.map(function(h) {
          return h.column.columnId;
        });
      } else if (queryDefinition.columns) {
        columnHeaders = queryDefinition.columns.map(function(c) {
          return c.columnId;
        });
      } else {
        throw new Error('No column headers found in API response');
      }
      
      log('INFO', 'columns_found', `Found ${columnHeaders.length} columns: ${columnHeaders.join(', ')}`);
    }
    
    // Rows are already in array format, just use them directly
    const rowsData = pageData.rows || [];
    allRows = allRows.concat(rowsData);
    totalRows += rowsData.length;
    
    log('INFO', 'page_fetched', `Page ${currentPage + 1}: ${rowsData.length} rows (total: ${totalRows})`);
    
    if (allRows.length >= batchSize) {
      updateImportProgress(`Writing to sheet...`, `${totalRows.toLocaleString()} rows fetched, writing batch`, 10 + (currentPage * 2), false);
      currentSheetRow = writeToSheet(dataSheet, columnHeaders, allRows, currentPage === 0, currentSheetRow);
      allRows = [];
    }
    
    if (pageData.rows.length < ROWS_PER_PAGE) {
      log('INFO', 'last_page', `Last page reached (${pageData.rows.length} rows < ${ROWS_PER_PAGE})`);
      break;
    }
    
    currentPage++;
    
    if (totalRows >= MAX_SHEET_ROWS) {
      log('WARN', 'max_rows_reached', `Reached Google Sheets maximum row limit (${MAX_SHEET_ROWS})`);
      break;
    }
  }
  
  if (allRows.length > 0) {
    writeToSheet(dataSheet, columnHeaders, allRows, currentPage === 0 && totalRows === allRows.length, currentSheetRow);
  }
  
  return totalRows;
}

function fetchGridPage(apiKey, gridEntityType, queryDefinition, page) {
  const url = `${GRID_API_BASE}/${gridEntityType}`;
  
  const payload = JSON.parse(JSON.stringify(queryDefinition));
  payload.page = page;
  payload.size = ROWS_PER_PAGE;
  
  const options = {
    method: 'post',
    headers: {
      'Authorization': `api_key ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  
  if (response.getResponseCode() >= 300) {
    throw new Error(`Failed to fetch grid data (page ${page}): ${response.getContentText()}`);
  }
  
  return JSON.parse(response.getContentText());
}

// No longer needed - columns come from metadata.headers

// No longer needed - rows are already arrays

function writeToSheet(sheet, headers, rows, isFirstBatch, currentRow) {
  if (!rows || rows.length === 0) {
    return currentRow;
  }
  
  let startRow = currentRow;
  
  if (isFirstBatch) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    startRow = 2;
  }
  
  const numCols = headers.length;
  sheet.getRange(startRow, 1, rows.length, numCols).setValues(rows);
  
  log('INFO', 'batch_written', `Wrote ${rows.length} rows to sheet (starting at row ${startRow})`);
  
  return startRow + rows.length; // Return next available row
}

function gridImporter_clearData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ss.getSheetByName(GRID_DATA_SHEET_NAME);
  
  if (dataSheet) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Clear Data Sheet',
      'Are you sure you want to clear all imported data?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      dataSheet.clear();
      log('INFO', 'data_cleared', 'Data sheet cleared by user');
      ui.alert('Data sheet cleared successfully.');
    }
  } else {
    SpreadsheetApp.getUi().alert('No data sheet found to clear.');
  }
}

function gridImporter_showLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('Execution_Log');
  
  if (logSheet) {
    ss.setActiveSheet(logSheet);
  } else {
    SpreadsheetApp.getUi().alert('No import log found.');
  }
}
