/**
 * ObservePoint Broken External Links Workflow
 * 
 * Webhook endpoints:
 * - Primary: ?stage=primary (triggered when main audit completes)
 * - Secondary: ?stage=secondary (triggered when external links audit completes)
 * 
 * Setup:
 * 1. Run initializeConfigSheet() to create Config and Setup sheets
 * 2. Fill in Config sheet values (API key, report IDs, audit ID)
 * 3. Follow steps in Setup_Instructions sheet
 * 4. Use "ObservePoint" menu > "Test Setup" to validate configuration
 * 5. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 6. Configure ObservePoint webhooks with ?stage=primary and ?stage=secondary
 */

const SHEET_NAMES = {
  CONFIG: 'Config',
  SETUP: 'Setup_Instructions',
  PRIMARY_REPORT: 'Primary_Report',
  UNIQUE_URLS: 'Unique_Link_URLs',
  BROKEN_REPORT: 'Broken_Links_Report',
  FINAL_REPORT: 'Final_Broken_Links',
  LOG: 'Execution_Log'
};

/**
 * Note: onOpen() and menu creation are handled in each sheet's wrapper code.
 * See SheetWrapper.gs for the template.
 */

function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  
  if (!configSheet) {
    throw new Error('Config sheet not found. Run initializeConfigSheet() first.');
  }
  
  const data = configSheet.getRange('A2:B10').getValues();
  const config = {};
  
  data.forEach(function(row) {
    const key = row[0];
    const value = row[1];
    if (key) {
      config[key] = value;
    }
  });
  
  if (!config.OP_API_KEY) {
    throw new Error('OP_API_KEY not set in Config sheet');
  }
  
  return {
    API_KEY: config.OP_API_KEY,
    PRIMARY_AUDIT_ID: config.PRIMARY_AUDIT_ID || '',
    PRIMARY_REPORT_ID: config.PRIMARY_REPORT_ID || '',
    BROKEN_REPORT_ID: config.BROKEN_REPORT_ID || '',
    SECONDARY_AUDIT_ID: config.SECONDARY_AUDIT_ID || '',
    WEBHOOK_BASE_URL: config.WEBHOOK_BASE_URL || '',
    BASE_URL: 'https://api.observepoint.com'
  };
}

/**
 * Main webhook handler - call this from your sheet's doPost() wrapper
 * Example: function doPost(e) { return BrokenLinksLib.doPostHandler(e); }
 */
function doPostHandler(e) {
  const stage = (e && e.parameter && e.parameter.stage || '').toLowerCase();
  
  if (!stage) {
    log('ERROR', 'webhook', 'Missing stage parameter');
    return ContentService.createTextOutput('Missing stage parameter').setMimeType(ContentService.MimeType.TEXT);
  }
  
  try {
    if (stage === 'primary') {
      handlePrimaryAuditComplete();
    } else if (stage === 'secondary') {
      handleSecondaryAuditComplete();
    } else {
      throw new Error('Unknown stage: ' + stage);
    }
    
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    Logger.log('Error: ' + err.message);
    log('ERROR', stage, err.message + '\n' + (err.stack || ''));
    return ContentService.createTextOutput('Error: ' + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function handlePrimaryAuditComplete() {
  processPrimaryReportData();
  
  const config = getConfig();
  const uniqueUrls = getUniqueUrlsFromSheet();
  const runId = updateAndRunSecondaryAudit(uniqueUrls, config);
  log('INFO', 'secondary_triggered', 'Started secondary audit run', runId);
}

function handleSecondaryAuditComplete() {
  const config = getConfig();
  log('INFO', 'secondary_start', 'Fetching broken links report ' + config.BROKEN_REPORT_ID);
  
  const brokenData = fetchGridReportDataWithRetry(config.BROKEN_REPORT_ID, config, 10, 30);
  
  if (!brokenData || brokenData.rows.length === 0) {
    log('WARN', 'secondary', 'No broken links found after 10 retries. This may be expected if there are no broken links.');
  }
  
  writeGridDataToSheet(SHEET_NAMES.BROKEN_REPORT, brokenData);
  log('INFO', 'broken_report', 'Wrote ' + brokenData.rows.length + ' broken links to sheet');
  
  const primaryData = readSheetAsGridData(SHEET_NAMES.PRIMARY_REPORT);
  const joinedData = joinReports(primaryData, brokenData);
  writeJoinedDataToSheet(SHEET_NAMES.FINAL_REPORT, joinedData);
  log('INFO', 'join_complete', 'Created final report with ' + joinedData.rows.length + ' rows');
}

function webhooks_manualRunPrimary() {
  handlePrimaryAuditComplete();
}

function processPrimaryReportData() {
  const config = getConfig();
  log('INFO', 'primary_start', 'Fetching primary report ' + config.PRIMARY_REPORT_ID);
  
  const reportData = fetchGridReportDataWithRetry(config.PRIMARY_REPORT_ID, config, 10, 30);
  
  if (!reportData || reportData.rows.length === 0) {
    log('ERROR', 'primary', 'No data available after 10 retries. Stopping process.');
    throw new Error('Primary report has no data after waiting');
  }
  
  writeGridDataToSheet(SHEET_NAMES.PRIMARY_REPORT, reportData);
  log('INFO', 'primary_report', 'Wrote ' + reportData.rows.length + ' rows to sheet');
  
  log('INFO', 'primary_headers', 'Headers: ' + reportData.headers.join(', '));
  
  const linkUrlColumnIndex = findColumnIndex(reportData.headers, 'LINK_URL');
  if (linkUrlColumnIndex === -1) {
    throw new Error('LINK_URL column not found in report. Available columns: ' + reportData.headers.join(', '));
  }
  
  const uniqueUrls = extractUniqueUrls(reportData.rows, linkUrlColumnIndex);
  writeUniqueUrlsToSheet(SHEET_NAMES.UNIQUE_URLS, uniqueUrls);
  log('INFO', 'unique_urls', 'Extracted ' + uniqueUrls.length + ' unique URLs');
  
  return uniqueUrls;
}

function getUniqueUrlsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.UNIQUE_URLS);
  
  if (!sheet) {
    throw new Error('Unique URLs sheet not found');
  }
  
  const data = sheet.getDataRange().getValues();
  const urls = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      urls.push(data[i][0]);
    }
  }
  
  return urls;
}

function webhooks_manualRunSecondary() {
  handleSecondaryAuditComplete();
}

function fetchGridReportDataWithRetry(reportId, config, maxRetries, waitSeconds) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    log('INFO', 'report_fetch', 'Attempt ' + attempt + ' of ' + maxRetries + ' to fetch report ' + reportId);
    
    const reportData = fetchGridReportData(reportId, config);
    
    if (reportData.rows.length > 0) {
      log('INFO', 'report_fetch', 'Successfully fetched ' + reportData.rows.length + ' rows on attempt ' + attempt);
      return reportData;
    }
    
    if (attempt < maxRetries) {
      log('INFO', 'report_wait', 'Report has 0 rows. Waiting ' + waitSeconds + ' seconds before retry ' + (attempt + 1) + '...');
      Utilities.sleep(waitSeconds * 1000);
    }
  }
  
  log('WARN', 'report_fetch', 'Report still has 0 rows after ' + maxRetries + ' attempts');
  return { headers: [], rows: [] };
}

function fetchGridReportData(reportId, config) {
  const savedReport = fetchSavedReport(reportId, config);
  const gridEntityType = savedReport.gridEntityType;
  const queryDef = savedReport.queryDefinition;
  
  queryDef.page = 0;
  queryDef.size = 1000;
  
  const url = config.BASE_URL + '/v3/reports/grid/' + gridEntityType;
  const options = {
    method: 'post',
    headers: {
      'Authorization': 'api_key ' + config.API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(queryDef),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  
  if (code >= 300) {
    throw new Error('Grid data fetch failed (' + code + '): ' + response.getContentText());
  }
  
  const result = JSON.parse(response.getContentText());
  
  const headers = result.metadata.headers.map(function(h) { 
    return h.column ? h.column.columnId : h.columnId; 
  });
  const rows = result.rows || [];
  
  let allRows = rows;
  const totalPages = result.metadata.pagination.totalPages;
  
  for (let page = 1; page < totalPages && page < 10; page++) {
    queryDef.page = page;
    const pageResponse = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: options.headers,
      payload: JSON.stringify(queryDef),
      muteHttpExceptions: true
    });
    
    if (pageResponse.getResponseCode() === 200) {
      const pageResult = JSON.parse(pageResponse.getContentText());
      allRows = allRows.concat(pageResult.rows || []);
    }
  }
  
  return { headers: headers, rows: allRows };
}

function fetchSavedReport(reportId, config) {
  const url = config.BASE_URL + '/v3/reports/grid/saved/' + reportId;
  const options = {
    method: 'get',
    headers: {
      'Authorization': 'api_key ' + config.API_KEY,
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  
  if (code >= 300) {
    throw new Error('Saved report fetch failed (' + code + '): ' + response.getContentText());
  }
  
  return JSON.parse(response.getContentText());
}

function updateAndRunSecondaryAudit(urls, config) {
  const auditId = config.SECONDARY_AUDIT_ID;
  
  const getUrl = config.BASE_URL + '/v2/web-audits/' + auditId;
  const getOptions = {
    method: 'get',
    headers: {
      'Authorization': 'api_key ' + config.API_KEY,
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  const getResponse = UrlFetchApp.fetch(getUrl, getOptions);
  if (getResponse.getResponseCode() >= 300) {
    throw new Error('Audit fetch failed: ' + getResponse.getContentText());
  }
  
  const audit = JSON.parse(getResponse.getContentText());
  audit.startingUrls = urls;
  audit.limit = urls.length;
  
  const updateUrl = config.BASE_URL + '/v2/web-audits/' + auditId;
  const updateOptions = {
    method: 'put',
    headers: {
      'Authorization': 'api_key ' + config.API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(audit),
    muteHttpExceptions: true
  };
  
  const updateResponse = UrlFetchApp.fetch(updateUrl, updateOptions);
  if (updateResponse.getResponseCode() >= 300) {
    throw new Error('Audit update failed: ' + updateResponse.getContentText());
  }
  
  const runUrl = config.BASE_URL + '/v2/web-audits/' + auditId + '/runs';
  const runOptions = {
    method: 'post',
    headers: {
      'Authorization': 'api_key ' + config.API_KEY,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  const runResponse = UrlFetchApp.fetch(runUrl, runOptions);
  if (runResponse.getResponseCode() >= 300) {
    throw new Error('Audit run failed: ' + runResponse.getContentText());
  }
  
  const runResult = JSON.parse(runResponse.getContentText());
  return runResult.id || runResult.runId || 'unknown';
}

function filterBrokenLinks(gridData) {
  let statusCodeIndex = findColumnIndex(gridData.headers, 'STATUS_CODE');
  if (statusCodeIndex === -1) {
    statusCodeIndex = findColumnIndex(gridData.headers, 'DESTINATION_FINAL_PAGE_STATUS_CODE');
  }
  if (statusCodeIndex === -1) {
    statusCodeIndex = findColumnIndex(gridData.headers, 'HTTP_STATUS_CODE');
  }
  if (statusCodeIndex === -1) {
    statusCodeIndex = findColumnIndex(gridData.headers, 'RESPONSE_CODE');
  }
  
  if (statusCodeIndex === -1) {
    return gridData.rows;
  }
  
  return gridData.rows.filter(function(row) {
    const status = parseInt(row[statusCodeIndex]);
    return status >= 400 && status !== 403 && status !== 429;
  });
}

function joinReports(primaryData, brokenData) {
  const primaryLinkUrlIndex = findColumnIndex(primaryData.headers, 'LINK_URL');
  const primarySourcePageIndex = findColumnIndex(primaryData.headers, 'FINAL_PAGE_URL');
  const primaryLinkTextIndex = findColumnIndex(primaryData.headers, 'LINK_TEXT');
  const primaryLinkHtmlIndex = findColumnIndex(primaryData.headers, 'LINK_OUTER_HTML');
  
  const secondaryInitialPageIndex = findColumnIndex(brokenData.headers, 'INITIAL_PAGE_URL');
  const secondaryFinalPageIndex = findColumnIndex(brokenData.headers, 'FINAL_PAGE_URL');
  const secondaryFinalStatusIndex = findColumnIndex(brokenData.headers, 'FINAL_PAGE_STATUS_CODE');
  
  const primaryMap = {};
  primaryData.rows.forEach(function(row) {
    const linkUrl = row[primaryLinkUrlIndex];
    if (linkUrl) {
      primaryMap[linkUrl] = row;
    }
  });
  
  const joinedHeaders = [
    'Source Page URL',
    'External Link URL',
    'External Link Text',
    'External Link HTML',
    'External Link Destination URL',
    'External Link Status Code'
  ];
  
  const joinedRows = [];
  
  brokenData.rows.forEach(function(brokenRow) {
    const initialPageUrl = brokenRow[secondaryInitialPageIndex];
    const primaryRow = primaryMap[initialPageUrl];
    
    if (primaryRow) {
      joinedRows.push([
        primarySourcePageIndex >= 0 ? primaryRow[primarySourcePageIndex] : '',
        primaryLinkUrlIndex >= 0 ? primaryRow[primaryLinkUrlIndex] : '',
        primaryLinkTextIndex >= 0 ? primaryRow[primaryLinkTextIndex] : '',
        primaryLinkHtmlIndex >= 0 ? primaryRow[primaryLinkHtmlIndex] : '',
        secondaryFinalPageIndex >= 0 ? brokenRow[secondaryFinalPageIndex] : '',
        secondaryFinalStatusIndex >= 0 ? brokenRow[secondaryFinalStatusIndex] : ''
      ]);
    }
  });
  
  return { headers: joinedHeaders, rows: joinedRows };
}

function findColumnIndex(headers, columnId) {
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] === columnId) {
      return i;
    }
  }
  return -1;
}

function extractUniqueUrls(rows, columnIndex) {
  const seen = {};
  const unique = [];
  
  rows.forEach(function(row) {
    const url = row[columnIndex];
    if (url && !seen[url]) {
      seen[url] = true;
      unique.push(url);
    }
  });
  
  return unique;
}

function writeGridDataToSheet(sheetName, gridData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    try {
      sheet = ss.insertSheet(sheetName);
    } catch (err) {
      sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        throw err;
      }
    }
  }
  
  sheet.clear();
  
  if (gridData.rows.length === 0) {
    sheet.getRange(1, 1, 1, gridData.headers.length).setValues([gridData.headers]);
    return;
  }
  
  const allData = [gridData.headers].concat(gridData.rows);
  sheet.getRange(1, 1, allData.length, gridData.headers.length).setValues(allData);
  sheet.getRange(1, 1, 1, gridData.headers.length).setFontWeight('bold');
}

function writeUniqueUrlsToSheet(sheetName, urls) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  
  const data = [['Link URL']].concat(urls.map(function(url) { return [url]; }));
  sheet.getRange(1, 1, data.length, 1).setValues(data);
  sheet.getRange(1, 1).setFontWeight('bold');
}

function writeJoinedDataToSheet(sheetName, joinedData) {
  writeGridDataToSheet(sheetName, joinedData);
}

function readSheetAsGridData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return { headers: [], rows: [] };
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) {
    return { headers: [], rows: [] };
  }
  
  return {
    headers: data[0],
    rows: data.slice(1)
  };
}

function log(level, action, message, runId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.LOG);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.LOG);
    sheet.getRange(1, 1, 1, 5).setValues([['Timestamp', 'Level', 'Action', 'Message', 'Run ID']]);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  
  sheet.appendRow([new Date(), level, action, message, runId || '']);
}

function webhooks_initConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  if (!configSheet) {
    configSheet = ss.insertSheet(SHEET_NAMES.CONFIG, 0);
  } else {
    configSheet.clear();
  }
  
  const configData = [
    ['Setting', 'Value'],
    ['OP_API_KEY', ''],
    ['PRIMARY_REPORT_ID', '16008'],
    ['BROKEN_REPORT_ID', '16009'],
    ['SECONDARY_AUDIT_ID', '2018768']
  ];
  
  configSheet.getRange(1, 1, configData.length, 2).setValues(configData);
  configSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  configSheet.getRange('A2:A5').setFontWeight('bold');
  configSheet.setColumnWidth(1, 200);
  configSheet.setColumnWidth(2, 300);
  
  configSheet.getRange('A7').setValue('Instructions:');
  configSheet.getRange('A7').setFontWeight('bold').setFontSize(12);
  configSheet.getRange('A8').setValue('1. Get your API key from https://app.observepoint.com/my-profile');
  configSheet.getRange('A9').setValue('2. Paste it in cell B2 above');
  configSheet.getRange('A10').setValue('3. Update Report IDs and Audit ID if different from defaults');
  configSheet.getRange('A11').setValue('4. See Setup_Instructions sheet for complete setup steps');
  
  let setupSheet = ss.getSheetByName(SHEET_NAMES.SETUP);
  if (!setupSheet) {
    setupSheet = ss.insertSheet(SHEET_NAMES.SETUP, 1);
  } else {
    setupSheet.clear();
  }
  
  const setupData = [
    ['ObservePoint Broken External Links - Setup Instructions'],
    [''],
    ['STEP 1: Configure This Spreadsheet'],
    ['1.1', 'Go to the Config sheet'],
    ['1.2', 'Get your ObservePoint API key from https://app.observepoint.com/my-profile'],
    ['1.3', 'Paste your API key in cell B2 of the Config sheet'],
    ['1.4', 'Verify the Report IDs and Audit ID match your ObservePoint setup (or update them)'],
    [''],
    ['STEP 2: Set Up ObservePoint Primary Audit'],
    ['2.1', 'Create or identify your primary audit that scans your website pages'],
    ['2.2', 'This audit should crawl your site and collect all links on each page'],
    ['2.3', 'Note: This audit does NOT need to test external links - just collect them'],
    [''],
    ['STEP 3: Create Primary Report (External Links Report)'],
    ['3.1', 'In ObservePoint, go to Reports > Grid Reports'],
    ['3.2', 'Create a new Links report'],
    ['3.3', 'Add filters to show only external links from your most recent audit run:'],
    ['', '- Filter: IS_MOST_RECENT_PAGE_SCAN = 1'],
    ['', '- Filter: IS_EXTERNAL = 1 (or similar - links pointing outside your domain)'],
    ['3.4', 'Include columns: LINK_URL, PAGE_URL, LINK_TEXT, ELEMENT_SELECTOR'],
    ['3.5', 'Save the report and note its Report ID (from the URL)'],
    ['3.6', 'Update PRIMARY_REPORT_ID in the Config sheet with this Report ID'],
    [''],
    ['STEP 4: Set Up ObservePoint Secondary Audit'],
    ['4.1', 'Create a new audit in ObservePoint specifically for testing external links'],
    ['4.2', 'Configure it as a simple URL list audit (not a crawler)'],
    ['4.3', 'Set initial URLs to a placeholder (e.g., https://example.com)'],
    ['4.4', 'The script will automatically update these URLs before each run'],
    ['4.5', 'Note the Audit ID (from the URL when viewing the audit)'],
    ['4.6', 'Update SECONDARY_AUDIT_ID in the Config sheet with this Audit ID'],
    [''],
    ['STEP 5: Create Broken Links Report'],
    ['5.1', 'In ObservePoint, create a new Pages report (or appropriate grid type)'],
    ['5.2', 'Add filters to show only broken external links:'],
    ['', '- Filter: STATUS_CODE >= 400'],
    ['', '- Filter: IS_MOST_RECENT_PAGE_SCAN = 1'],
    ['5.3', 'Include columns: LINK_URL, STATUS_CODE, ELEMENT_SELECTOR, PAGE_URL'],
    ['5.4', 'Save the report and note its Report ID'],
    ['5.5', 'Update BROKEN_REPORT_ID in the Config sheet with this Report ID'],
    [''],
    ['STEP 6: Deploy Apps Script as Web App'],
    ['6.1', 'In this spreadsheet, go to Extensions > Apps Script'],
    ['6.2', 'Click Deploy > New deployment'],
    ['6.3', 'Click the gear icon and select "Web app"'],
    ['6.4', 'Configure:'],
    ['', '- Description: ObservePoint Broken Links Webhook'],
    ['', '- Execute as: Me'],
    ['', '- Who has access: Anyone'],
    ['6.5', 'Click Deploy and authorize the script'],
    ['6.6', 'Copy the Web App URL (you will need this for webhooks)'],
    [''],
    ['STEP 7: Configure Primary Audit Webhook'],
    ['7.1', 'In ObservePoint, go to your primary audit settings'],
    ['7.2', 'Add a webhook with URL: YOUR_WEB_APP_URL?stage=primary'],
    ['7.3', 'Set trigger to: On audit completion'],
    ['7.4', 'Save the webhook configuration'],
    [''],
    ['STEP 8: Configure Secondary Audit Webhook'],
    ['8.1', 'In ObservePoint, go to your secondary audit settings'],
    ['8.2', 'Add a webhook with URL: YOUR_WEB_APP_URL?stage=secondary'],
    ['8.3', 'Set trigger to: On audit completion'],
    ['8.4', 'Save the webhook configuration'],
    [''],
    ['STEP 9: Test the Workflow'],
    ['9.1', 'Run your primary audit in ObservePoint'],
    ['9.2', 'When it completes, the webhook should trigger this script'],
    ['9.3', 'Check the Execution_Log sheet for progress'],
    ['9.4', 'Verify these sheets are created:'],
    ['', '- Primary_Report (all external links from your pages)'],
    ['', '- Unique_Link_URLs (deduplicated list)'],
    ['', '- Broken_Links_Report (filtered broken links)'],
    ['', '- Final_Broken_Links (joined report showing which pages have broken links)'],
    [''],
    ['TROUBLESHOOTING'],
    ['', 'Check Execution_Log sheet for error messages'],
    ['', 'Verify API key is correct in Config sheet'],
    ['', 'Ensure Report IDs and Audit ID match your ObservePoint setup'],
    ['', 'Check Apps Script execution logs: Extensions > Apps Script > Executions'],
    ['', 'Test webhooks manually by running handlePrimaryAuditComplete() from Apps Script'],
    [''],
    ['COPYING TO NEW CUSTOMER'],
    ['1', 'Make a copy of this entire spreadsheet'],
    ['2', 'Update the Config sheet with new customer values'],
    ['3', 'Create new reports and audits in ObservePoint for the new customer'],
    ['4', 'Deploy the Apps Script as a new Web App'],
    ['5', 'Configure webhooks in the new customer ObservePoint account']
  ];
  
  setupSheet.getRange(1, 1, setupData.length, 2).setValues(setupData);
  setupSheet.getRange(1, 1).setFontWeight('bold').setFontSize(14).setBackground('#4285f4').setFontColor('#ffffff');
  setupSheet.getRange('A3').setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
  setupSheet.getRange('A9').setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
  setupSheet.getRange('A13').setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
  setupSheet.getRange('A24').setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
  setupSheet.getRange('A34').setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
  setupSheet.getRange('A43').setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
  setupSheet.getRange('A51').setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
  setupSheet.getRange('A58').setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
  setupSheet.getRange('A65').setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
  setupSheet.getRange('A76').setFontWeight('bold').setFontSize(12).setBackground('#fce8e6');
  setupSheet.getRange('A83').setFontWeight('bold').setFontSize(12).setBackground('#e6f4ea');
  
  setupSheet.setColumnWidth(1, 80);
  setupSheet.setColumnWidth(2, 700);
  
  SpreadsheetApp.getUi().alert(
    'Setup Complete!',
    'Config and Setup_Instructions sheets have been created.\n\n' +
    'Next steps:\n' +
    '1. Go to the Config sheet and add your ObservePoint API key\n' +
    '2. Follow the steps in the Setup_Instructions sheet\n' +
    '3. Use "ObservePoint" menu > "Test Setup" to validate your configuration\n' +
    '4. Deploy this script as a Web App\n' +
    '5. Configure webhooks in ObservePoint',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function testSetup() {
  const ui = SpreadsheetApp.getUi();
  const results = [];
  let allPassed = true;
  
  try {
    results.push('🔍 Testing ObservePoint Configuration...\n');
    
    const config = getConfig();
    results.push('✓ Config sheet found and loaded');
    results.push('  - API Key: ' + (config.API_KEY ? '***' + config.API_KEY.slice(-8) : 'MISSING'));
    results.push('  - Primary Report ID: ' + (config.PRIMARY_REPORT_ID || 'MISSING'));
    results.push('  - Broken Report ID: ' + (config.BROKEN_REPORT_ID || 'MISSING'));
    results.push('  - Secondary Audit ID: ' + (config.SECONDARY_AUDIT_ID || 'MISSING'));
    results.push('');
    
    if (!config.API_KEY) {
      results.push('❌ API Key is missing in Config sheet');
      allPassed = false;
    }
    
    if (!config.PRIMARY_REPORT_ID) {
      results.push('❌ PRIMARY_REPORT_ID is missing in Config sheet');
      allPassed = false;
    }
    
    if (!config.BROKEN_REPORT_ID) {
      results.push('❌ BROKEN_REPORT_ID is missing in Config sheet');
      allPassed = false;
    }
    
    if (!config.SECONDARY_AUDIT_ID) {
      results.push('❌ SECONDARY_AUDIT_ID is missing in Config sheet');
      allPassed = false;
    }
    
    if (!allPassed) {
      results.push('\n⚠️ Please fill in all required values in the Config sheet before testing.');
      ui.alert('Configuration Incomplete', results.join('\n'), ui.ButtonSet.OK);
      return;
    }
    
    results.push('📊 Testing Primary Report (' + config.PRIMARY_REPORT_ID + ')...');
    try {
      const primaryReport = fetchSavedReport(config.PRIMARY_REPORT_ID, config);
      results.push('✓ Primary report found: "' + primaryReport.name + '"');
      results.push('  - Grid Type: ' + primaryReport.gridEntityType);
      results.push('  - Columns: ' + (primaryReport.queryDefinition.columns ? primaryReport.queryDefinition.columns.length : 0));
      
      const hasLinkUrlColumn = primaryReport.queryDefinition.columns.some(function(col) {
        return col.columnId === 'LINK_URL';
      });
      
      if (hasLinkUrlColumn) {
        results.push('  - ✓ LINK_URL column found');
      } else {
        results.push('  - ⚠️ LINK_URL column not found - report may not work correctly');
      }
      
      results.push('');
    } catch (err) {
      results.push('❌ Failed to fetch primary report: ' + err.message);
      results.push('');
      allPassed = false;
    }
    
    results.push('📊 Testing Broken Links Report (' + config.BROKEN_REPORT_ID + ')...');
    try {
      const brokenReport = fetchSavedReport(config.BROKEN_REPORT_ID, config);
      results.push('✓ Broken links report found: "' + brokenReport.name + '"');
      results.push('  - Grid Type: ' + brokenReport.gridEntityType);
      results.push('  - Columns: ' + (brokenReport.queryDefinition.columns ? brokenReport.queryDefinition.columns.length : 0));
      
      const hasStatusCode = brokenReport.queryDefinition.columns.some(function(col) {
        return col.columnId === 'STATUS_CODE' || 
               col.columnId === 'DESTINATION_FINAL_PAGE_STATUS_CODE' ||
               col.columnId === 'HTTP_STATUS_CODE' ||
               col.columnId === 'RESPONSE_CODE';
      });
      
      if (hasStatusCode) {
        const statusCol = brokenReport.queryDefinition.columns.find(function(col) {
          return col.columnId === 'STATUS_CODE' || 
                 col.columnId === 'DESTINATION_FINAL_PAGE_STATUS_CODE' ||
                 col.columnId === 'HTTP_STATUS_CODE' ||
                 col.columnId === 'RESPONSE_CODE';
        });
        results.push('  - ✓ Status code column found: ' + statusCol.columnId);
      } else {
        results.push('  - ⚠️ Status code column not found - report may not work correctly');
      }
      
      results.push('');
    } catch (err) {
      results.push('❌ Failed to fetch broken links report: ' + err.message);
      results.push('');
      allPassed = false;
    }
    
    results.push('🔧 Testing Secondary Audit (' + config.SECONDARY_AUDIT_ID + ')...');
    try {
      const auditUrl = config.BASE_URL + '/v2/web-audits/' + config.SECONDARY_AUDIT_ID;
      const auditOptions = {
        method: 'get',
        headers: {
          'Authorization': 'api_key ' + config.API_KEY,
          'Accept': 'application/json'
        },
        muteHttpExceptions: true
      };
      
      const auditResponse = UrlFetchApp.fetch(auditUrl, auditOptions);
      const auditCode = auditResponse.getResponseCode();
      
      if (auditCode >= 300) {
        results.push('❌ Failed to fetch audit (' + auditCode + '): ' + auditResponse.getContentText());
        allPassed = false;
      } else {
        const audit = JSON.parse(auditResponse.getContentText());
        results.push('✓ Secondary audit found: "' + audit.name + '"');
        results.push('  - Audit ID: ' + audit.id);
        results.push('  - Current URLs: ' + (audit.urls ? audit.urls.length : 0));
        results.push('  - Note: This audit will be updated with external links before each run');
      }
      
      results.push('');
    } catch (err) {
      results.push('❌ Failed to fetch secondary audit: ' + err.message);
      results.push('');
      allPassed = false;
    }
    
    if (allPassed) {
      results.push('✅ All tests passed!');
      results.push('\nYour ObservePoint configuration is correct.');
      results.push('\nNext steps:');
      results.push('1. Deploy this script as a Web App');
      results.push('2. Configure webhooks in ObservePoint');
      results.push('3. Run your primary audit to trigger the workflow');
      
      log('INFO', 'test_setup', 'All configuration tests passed');
    } else {
      results.push('⚠️ Some tests failed. Please review the errors above.');
      results.push('\nCheck:');
      results.push('- API key is correct');
      results.push('- Report IDs match your ObservePoint reports');
      results.push('- Audit ID matches your secondary audit');
      results.push('- You have access to these resources in ObservePoint');
      
      log('ERROR', 'test_setup', 'Configuration tests failed');
    }
    
  } catch (err) {
    results.push('❌ Test failed: ' + err.message);
    results.push('\nStack trace:');
    results.push(err.stack || 'No stack trace available');
    log('ERROR', 'test_setup', err.message);
    allPassed = false;
  }
  
  const resultText = results.join('\n');
  Logger.log(resultText);
  
  ui.alert(
    allPassed ? 'Setup Test Passed ✅' : 'Setup Test Failed ⚠️',
    resultText,
    ui.ButtonSet.OK
  );
}

function createSkeletonSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  const sheetsToCreate = [
    { name: SHEET_NAMES.CONFIG, headers: [['Setting', 'Value']], data: [
      ['OP_API_KEY', ''],
      ['PRIMARY_REPORT_ID', ''],
      ['BROKEN_REPORT_ID', ''],
      ['SECONDARY_AUDIT_ID', '']
    ]},
    { name: SHEET_NAMES.PRIMARY_REPORT, headers: [['This sheet will be populated when the primary audit completes']] },
    { name: SHEET_NAMES.UNIQUE_URLS, headers: [['Link URL']] },
    { name: SHEET_NAMES.BROKEN_REPORT, headers: [['This sheet will be populated when the secondary audit completes']] },
    { name: SHEET_NAMES.FINAL_REPORT, headers: [['Link URL', 'Status Code', 'HTML Element', 'Page URL', 'Link Text']] },
    { name: SHEET_NAMES.LOG, headers: [['Timestamp', 'Level', 'Action', 'Message', 'Run ID']] }
  ];
  
  let created = [];
  let skipped = [];
  
  sheetsToCreate.forEach(function(sheetDef) {
    let sheet = ss.getSheetByName(sheetDef.name);
    
    if (sheet) {
      skipped.push(sheetDef.name);
    } else {
      sheet = ss.insertSheet(sheetDef.name);
      
      if (sheetDef.headers) {
        sheet.getRange(1, 1, 1, sheetDef.headers[0].length).setValues(sheetDef.headers);
        sheet.getRange(1, 1, 1, sheetDef.headers[0].length).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
      }
      
      if (sheetDef.data) {
        sheet.getRange(2, 1, sheetDef.data.length, sheetDef.data[0].length).setValues(sheetDef.data);
        sheet.getRange('A2:A' + (sheetDef.data.length + 1)).setFontWeight('bold');
      }
      
      if (sheetDef.name === SHEET_NAMES.CONFIG) {
        sheet.setColumnWidth(1, 200);
        sheet.setColumnWidth(2, 400);
        
        sheet.getRange('A7').setValue('Instructions:');
        sheet.getRange('A7').setFontWeight('bold').setFontSize(12);
        sheet.getRange('A8').setValue('1. Get your API key from https://app.observepoint.com/my-profile');
        sheet.getRange('A9').setValue('2. Paste it in cell B2 above');
        sheet.getRange('A10').setValue('3. Fill in your Report IDs and Audit ID (B3-B5)');
        sheet.getRange('A11').setValue('4. Use "ObservePoint" menu > "Test Setup" to validate');
        sheet.getRange('A12').setValue('5. See Setup_Instructions sheet for complete setup (run "Initialize Config & Setup")');
      }
      
      created.push(sheetDef.name);
    }
  });
  
  let message = '';
  
  if (created.length > 0) {
    message += '✅ Created sheets:\n' + created.join('\n') + '\n\n';
  }
  
  if (skipped.length > 0) {
    message += '⏭️ Already exist (skipped):\n' + skipped.join('\n') + '\n\n';
  }
  
  message += 'Next steps:\n';
  message += '1. Fill in the Config sheet with your API key and IDs\n';
  message += '2. Run "Initialize Config & Setup" for detailed instructions\n';
  message += '3. Use "Test Setup" to validate your configuration';
  
  ui.alert('Skeleton Sheets Created', message, ui.ButtonSet.OK);
  
  ss.setActiveSheet(ss.getSheetByName(SHEET_NAMES.CONFIG));
}

function manualRunPrimary() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    'Run Primary Stage Manually',
    'This will:\n' +
    '1. Fetch primary report data (external links)\n' +
    '2. Extract unique link URLs\n' +
    '3. Update secondary audit with these URLs\n' +
    '4. Trigger secondary audit run\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  try {
    handlePrimaryAuditComplete();
    ui.alert(
      'Primary Stage Complete ✅',
      'Primary report processed successfully.\n\n' +
      'Check the Execution_Log sheet for details.\n\n' +
      'The secondary audit has been triggered.\n' +
      'When it completes, run "Manual: Run Secondary Stage" or wait for the webhook.',
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert(
      'Primary Stage Failed ❌',
      'Error: ' + err.message + '\n\n' +
      'Check the Execution_Log sheet for details.',
      ui.ButtonSet.OK
    );
    throw err;
  }
}

function manualRunSecondary() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    'Run Secondary Stage Manually',
    'This will:\n' +
    '1. Fetch broken links report data\n' +
    '2. Filter out 403/429 status codes\n' +
    '3. Join with primary report data\n' +
    '4. Create final broken links report\n\n' +
    'Make sure the secondary audit has completed first!\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  try {
    handleSecondaryAuditComplete();
    ui.alert(
      'Secondary Stage Complete ✅',
      'Final broken links report created successfully.\n\n' +
      'Check the Final_Broken_Links sheet for results.\n' +
      'See Execution_Log sheet for details.',
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert(
      'Secondary Stage Failed ❌',
      'Error: ' + err.message + '\n\n' +
      'Check the Execution_Log sheet for details.',
      ui.ButtonSet.OK
    );
    throw err;
  }
}
