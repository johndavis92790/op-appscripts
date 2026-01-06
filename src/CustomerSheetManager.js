/**
 * Customer Sheet Manager
 * 
 * Automates creation and management of customer sheets with the library pre-installed.
 * Tracks all customer sheets and manages version updates.
 */

const REGISTRY_SHEET_NAME = 'Customer_Sheet_Registry';
const LIBRARY_SCRIPT_ID = '1v4DTpf5lRrNk1g4V4P9k1QYpfRMTolkHXP5BENkD36gzt1dF8XjuFjcS';
const CURRENT_LIBRARY_VERSION = 1;

/**
 * Show dialog to create a new customer sheet
 */
function showCreateCustomerSheetDialog() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        ${getDialogStyles()}
        <style>
          .form-group {
            margin: 16px 0;
          }
          label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
          }
          input {
            width: 100%;
            padding: 10px;
            border: 1px solid #dadce0;
            border-radius: 4px;
            box-sizing: border-box;
          }
          .help-text {
            font-size: 12px;
            color: #5f6368;
            margin-top: 4px;
          }
          .required {
            color: #ea4335;
          }
        </style>
      </head>
      <body>
        <h2>📋 Create Customer Sheet</h2>
        
        <p>Create a new Google Sheet with the ObservePoint Toolbelt library pre-installed.</p>
        
        <form id="createForm">
          <div class="form-group">
            <label>Customer Name <span class="required">*</span></label>
            <input type="text" id="customerName" required placeholder="e.g., Acme Corp">
            <div class="help-text">Name of the customer or project</div>
          </div>
          
          <div class="form-group">
            <label>Notes (Optional)</label>
            <input type="text" id="notes" placeholder="Any additional notes">
          </div>
        </form>
        
        <div class="section">
          <p class="info-text"><strong>What will be created:</strong></p>
          <ul>
            <li>New Google Sheet with customer name</li>
            <li>Registered in your tracking system</li>
            <li>Link provided to open and configure</li>
          </ul>
          <p class="info-text"><strong>You'll need to:</strong></p>
          <ul>
            <li>Share the sheet manually (via Google Drive sharing)</li>
            <li>Follow setup instructions to add library and wrapper code</li>
          </ul>
        </div>
        
        <div class="button-container">
          <button class="btn-cancel" onclick="google.script.host.close()">Cancel</button>
          <button class="btn-primary" id="createBtn" onclick="createSheet()">Create Sheet</button>
        </div>
        
        <script>
          function createSheet() {
            const customerName = document.getElementById('customerName').value;
            const notes = document.getElementById('notes').value;
            
            if (!customerName) {
              alert('Customer name is required');
              return;
            }
            
            const btn = document.getElementById('createBtn');
            btn.disabled = true;
            btn.textContent = 'Creating...';
            
            google.script.run
              .withSuccessHandler(function() {
                google.script.host.close();
              })
              .withFailureHandler(function(error) {
                alert('Error creating sheet: ' + error);
                btn.disabled = false;
                btn.textContent = 'Create Sheet';
              })
              .createCustomerSheet(customerName, notes);
          }
        </script>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(550)
    .setHeight(550);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Create Customer Sheet');
}

/**
 * Create a new customer sheet
 */
function createCustomerSheet(customerName, notes) {
  try {
    Logger.info('create_customer_sheet_start', 'Creating sheet for: ' + customerName);
    
    // Create new spreadsheet
    const sheetTitle = customerName + ' - ObservePoint Tools';
    const newSpreadsheet = SpreadsheetApp.create(sheetTitle);
    const spreadsheetId = newSpreadsheet.getId();
    const spreadsheetUrl = newSpreadsheet.getUrl();
    
    Logger.info('sheet_created', 'Created sheet: ' + spreadsheetId);
    
    // Register the customer sheet
    registerCustomerSheet(customerName, spreadsheetId, spreadsheetUrl, notes);
    
    Logger.info('sheet_registered', 'Registered customer sheet');
    
    // Show success dialog with link
    showCustomerSheetCreatedDialog(customerName, spreadsheetUrl);
    
  } catch (error) {
    Logger.error('create_customer_sheet_failed', error.toString());
    throw error;
  }
}


/**
 * Register a customer sheet in the registry
 */
function registerCustomerSheet(customerName, spreadsheetId, spreadsheetUrl, notes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  
  if (!registrySheet) {
    registrySheet = ss.insertSheet(REGISTRY_SHEET_NAME);
    
    // Create headers
    const headers = [
      'Created Date',
      'Customer Name',
      'Spreadsheet ID',
      'Spreadsheet URL',
      'Library Version',
      'Last Updated',
      'Notes'
    ];
    
    registrySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    registrySheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    
    registrySheet.setFrozenRows(1);
    registrySheet.autoResizeColumns(1, headers.length);
  }
  
  // Add new entry
  const timestamp = new Date();
  const newRow = [
    timestamp,
    customerName,
    spreadsheetId,
    spreadsheetUrl,
    'Setup required - see dialog',
    timestamp,
    notes || ''
  ];
  
  registrySheet.appendRow(newRow);
  
  Logger.info('registry_updated', 'Added customer to registry');
}

/**
 * Show success dialog with link to new sheet
 */
function showCustomerSheetCreatedDialog(customerName, spreadsheetUrl) {
  
  // Generate wrapper code dynamically to stay in sync with Main.js
  const wrapperCode = generateCustomerWrapperCode();
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_blank">
        ${getDialogStyles()}
        <style>
          code {
            background: #f1f3f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
          }
          .copy-btn {
            background: #1a73e8;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            margin-top: 8px;
          }
          .copy-btn:hover {
            background: #1765cc;
          }
          .code-box {
            background: #f8f9fa;
            border: 1px solid #dadce0;
            border-radius: 4px;
            padding: 12px;
            max-height: 200px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            white-space: pre;
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <h2>✅ Sheet Created Successfully!</h2>
        
        <div class="section success-section">
          <p><strong>Customer:</strong> ${customerName}</p>
          <p><strong>Sheet URL:</strong> <a href="${spreadsheetUrl}">Open Sheet</a></p>
          <p class="info-text">💡 Share this sheet manually via Google Drive sharing settings</p>
        </div>
        
        <div class="section warning-section">
          <p><strong>⚠️ Complete Setup (2 minutes):</strong></p>
          
          <p><strong>Step 1:</strong> Open the new sheet (click link above)</p>
          
          <p><strong>Step 2:</strong> Extensions > Apps Script</p>
          
          <p><strong>Step 3:</strong> Click <strong>Libraries</strong> (+ icon on left)</p>
          
          <p><strong>Step 4:</strong> Paste Script ID and add library:</p>
          <p><code id="scriptId">${LIBRARY_SCRIPT_ID}</code> 
            <button class="copy-btn" onclick="copyScriptId()">Copy Script ID</button>
          </p>
          <p class="info-text">Click Look up, select version ${CURRENT_LIBRARY_VERSION}, set Identifier to: <code>ObservePointTools</code>, click Add</p>
          
          <p><strong>Step 5:</strong> Copy and paste this wrapper code:</p>
          <button class="copy-btn" onclick="copyWrapperCode()">Copy Wrapper Code</button>
          <div class="code-box" id="wrapperCode">${wrapperCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          
          <p><strong>Step 6:</strong> Paste into Apps Script editor (replace any existing code)</p>
          
          <p><strong>Step 7:</strong> Click <strong>Save</strong>, close Apps Script, <strong>refresh</strong> the sheet</p>
        </div>
        
        <div class="section">
          <p class="info-text">📋 Sheet registered in Customer_Sheet_Registry</p>
          <p class="info-text">🔧 Follow the steps above to complete setup</p>
        </div>
        
        <div class="button-container">
          <button class="btn-primary" onclick="window.open('${spreadsheetUrl}', '_blank')">Open Sheet</button>
          <button class="btn-secondary" onclick="google.script.host.close()">Close</button>
        </div>
        
        <script>
          function copyScriptId() {
            const scriptId = document.getElementById('scriptId').textContent;
            navigator.clipboard.writeText(scriptId).then(function() {
              alert('✅ Script ID copied to clipboard!');
            }, function() {
              alert('Could not copy. Please copy manually: ' + scriptId);
            });
          }
          
          function copyWrapperCode() {
            const code = \`${wrapperCode.replace(/`/g, '\\`')}\`;
            navigator.clipboard.writeText(code).then(function() {
              alert('✅ Wrapper code copied to clipboard!\\n\\nNow paste it into the Apps Script editor.');
            }, function() {
              alert('Could not copy. Please copy manually from the box above.');
            });
          }
        </script>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(700)
    .setHeight(750);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Customer Sheet Created');
}

/**
 * View all customer sheets in registry
 */
function viewCustomerSheetRegistry() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  
  if (!registrySheet) {
    SpreadsheetApp.getUi().alert('No customer sheets registered yet.');
    return;
  }
  
  ss.setActiveSheet(registrySheet);
}

/**
 * Check for customer sheets that need library updates
 */
function checkForOutdatedSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  
  if (!registrySheet) {
    SpreadsheetApp.getUi().alert('No customer sheets registered.');
    return;
  }
  
  const data = registrySheet.getDataRange().getValues();
  const headers = data[0];
  const versionCol = headers.indexOf('Library Version');
  
  let outdatedCount = 0;
  const outdatedSheets = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const version = row[versionCol];
    
    if (version < CURRENT_LIBRARY_VERSION) {
      outdatedCount++;
      outdatedSheets.push({
        name: row[1],
        url: row[3],
        currentVersion: version,
        latestVersion: CURRENT_LIBRARY_VERSION
      });
    }
  }
  
  if (outdatedCount === 0) {
    SpreadsheetApp.getUi().alert('All customer sheets are up to date!');
  } else {
    showOutdatedSheetsDialog(outdatedSheets);
  }
}

/**
 * Show dialog with outdated sheets
 */
function showOutdatedSheetsDialog(outdatedSheets) {
  const sheetsList = outdatedSheets.map(function(sheet) {
    return '<li><a href="' + sheet.url + '">' + sheet.name + '</a> (v' + sheet.currentVersion + ' → v' + sheet.latestVersion + ')</li>';
  }).join('');
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_blank">
        ${getDialogStyles()}
      </head>
      <body>
        <h2>⚠️ Outdated Customer Sheets</h2>
        
        <div class="section warning-section">
          <p><strong>${outdatedSheets.length} customer sheet(s) need updating:</strong></p>
          <ul>${sheetsList}</ul>
        </div>
        
        <div class="section">
          <p><strong>How to notify customers:</strong></p>
          <ol>
            <li>Contact each customer</li>
            <li>Ask them to update the library version:
              <ul>
                <li>Extensions > Apps Script</li>
                <li>Click ObservePointTools library</li>
                <li>Select version ${CURRENT_LIBRARY_VERSION}</li>
                <li>Save and refresh sheet</li>
              </ul>
            </li>
          </ol>
        </div>
        
        <div class="button-container">
          <button class="btn-primary" onclick="google.script.host.close()">Close</button>
        </div>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(600)
    .setHeight(500);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Outdated Sheets');
}
