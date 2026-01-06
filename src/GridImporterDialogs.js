/**
 * Interactive Dialogs for Grid API Importer
 * Provides user-friendly configuration and import experience
 */

function showGridImporterConfigDialog() {
  // Check if config already exists
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(GRID_CONFIG_SHEET_NAME);
  
  let existingApiKey = '';
  let existingReportId = '';
  let existingBatchSize = '50000';
  let existingMaxPages = '';
  
  if (configSheet) {
    try {
      const data = configSheet.getRange('A2:B10').getValues();
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === 'OP_API_KEY') existingApiKey = data[i][1] || '';
        if (data[i][0] === 'SAVED_REPORT_ID') existingReportId = data[i][1] || '';
        if (data[i][0] === 'BATCH_SIZE') existingBatchSize = data[i][1] || '50000';
        if (data[i][0] === 'MAX_PAGES') existingMaxPages = data[i][1] || '';
      }
    } catch (e) {
      // Config sheet exists but is empty
    }
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        ${DIALOG_STYLES}
        <style>
          .form-group {
            margin: 16px 0;
          }
          label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: #202124;
          }
          input, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #dadce0;
            border-radius: 4px;
            font-size: 14px;
            font-family: 'Google Sans', Arial, sans-serif;
            box-sizing: border-box;
          }
          input:focus, textarea:focus {
            outline: none;
            border-color: #1a73e8;
            box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
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
        <h2>📊 Grid API Importer Configuration</h2>
        
        <p>Configure the Grid API Importer to fetch data from any ObservePoint saved report.</p>
        
        <form id="configForm">
          <div class="form-group">
            <label>ObservePoint API Key <span class="required">*</span></label>
            <input type="text" id="apiKey" value="${existingApiKey}" required placeholder="Your API key from ObservePoint">
            <div class="help-text">Get your API key from <a href="https://app.observepoint.com/my-profile" target="_blank">ObservePoint Profile</a></div>
          </div>
          
          <div class="form-group">
            <label>Saved Report ID <span class="required">*</span></label>
            <input type="text" id="reportId" value="${existingReportId}" required placeholder="e.g., 12345">
            <div class="help-text">Find the report ID in the URL when viewing a saved report</div>
          </div>
          
          <div class="form-group">
            <label>Batch Size</label>
            <input type="number" id="batchSize" value="${existingBatchSize}" placeholder="50000">
            <div class="help-text">Number of rows to write at once (adjust if hitting memory limits)</div>
          </div>
          
          <div class="form-group">
            <label>Max Pages (Optional)</label>
            <input type="number" id="maxPages" value="${existingMaxPages}" placeholder="Leave empty for all pages">
            <div class="help-text">Limit number of pages to fetch (useful for testing)</div>
          </div>
        </form>
        
        <div class="button-container">
          <button class="btn-cancel" onclick="google.script.host.close()">Cancel</button>
          <button class="btn-primary" id="saveBtn" onclick="handleSave(this)">Save & Import</button>
        </div>
        
        <script>
          function handleSave(button) {
            const form = document.getElementById('configForm');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }
            
            const apiKey = document.getElementById('apiKey').value.trim();
            const reportId = document.getElementById('reportId').value.trim();
            const batchSize = document.getElementById('batchSize').value.trim() || '50000';
            const maxPages = document.getElementById('maxPages').value.trim();
            
            if (!apiKey || !reportId) {
              alert('Please fill in all required fields');
              return;
            }
            
            // Disable buttons
            const buttons = document.querySelectorAll('button');
            buttons.forEach(btn => btn.disabled = true);
            
            // Add spinner
            const originalText = button.innerHTML;
            button.innerHTML = originalText + '<span class="spinner"></span>';
            
            google.script.run
              .withSuccessHandler(function() {
                google.script.host.close();
                // Show a message that import is starting
                setTimeout(function() {
                  alert('Configuration saved! Import will start in a moment...');
                }, 100);
              })
              .withFailureHandler(function(error) {
                buttons.forEach(btn => btn.disabled = false);
                button.innerHTML = originalText;
                alert('Error saving config: ' + error.message);
              })
              .saveGridImporterConfigAndImport(apiKey, reportId, batchSize, maxPages);
          }
        </script>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(550)
    .setHeight(600);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Grid API Importer Setup');
}

function saveGridImporterConfigAndImport(apiKey, reportId, batchSize, maxPages) {
  // Save config
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName(GRID_CONFIG_SHEET_NAME);
  
  if (!configSheet) {
    configSheet = ss.insertSheet(GRID_CONFIG_SHEET_NAME);
  }
  
  configSheet.clear();
  
  const headers = [
    ['Setting', 'Value', 'Description'],
    ['OP_API_KEY', apiKey, 'Your ObservePoint API key'],
    ['SAVED_REPORT_ID', reportId, 'The ID of the saved report to import'],
    ['BATCH_SIZE', batchSize, 'Number of rows to write at once'],
    ['MAX_PAGES', maxPages, 'Maximum pages to fetch (leave empty for all pages)']
  ];
  
  configSheet.getRange(1, 1, headers.length, 3).setValues(headers);
  configSheet.getRange(1, 1, 1, 3)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');
  
  configSheet.setColumnWidth(1, 200);
  configSheet.setColumnWidth(2, 300);
  configSheet.setColumnWidth(3, 400);
  
  Logger.info('config_saved', 'Grid Importer configuration saved');
  
  // Trigger import in a separate execution context
  // This avoids dialog conflicts by running after this function completes
  ScriptApp.newTrigger('gridImporter_runImportAfterConfig')
    .timeBased()
    .after(1000) // Run 1 second after config is saved
    .create();
  
  return true;
}

/**
 * Run import after config is saved (triggered by time-based trigger)
 */
function gridImporter_runImportAfterConfig() {
  // Delete the trigger that called this
  const triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'gridImporter_runImportAfterConfig') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Run the import
  gridImporter_importReport();
}

function showGridImporterProgressDialog(reportName, totalRows, duration, sheetName) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        ${DIALOG_STYLES}
      </head>
      <body>
        <h2>Import Complete! ✅</h2>
        
        <div class="section success-section">
          <p><strong>Report:</strong> ${reportName}</p>
          <p><strong>Rows Imported:</strong> ${totalRows.toLocaleString()}</p>
          <p><strong>Time Taken:</strong> ${duration} seconds</p>
          <p><strong>Sheet Name:</strong> ${sheetName}</p>
        </div>
        
        <div class="section">
          <p class="info-text">Your data has been imported successfully. Check the new sheet for your data.</p>
        </div>
        
        <div class="button-container">
          <button class="btn-primary" onclick="google.script.host.close()">Done</button>
        </div>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(500)
    .setHeight(350);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Import Complete');
}
