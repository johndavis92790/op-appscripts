/**
 * HTML Dialog Templates with clickable links
 * Modern, consistent styling for all dialogs
 */

function getDialogStyles() {
  return `
  <style>
    body {
      font-family: 'Google Sans', Arial, sans-serif;
      padding: 24px;
      line-height: 1.6;
      margin: 0;
      color: #202124;
    }
    h2 {
      color: #1a73e8;
      margin: 0 0 16px 0;
      font-size: 22px;
      font-weight: 400;
    }
    p {
      margin: 12px 0;
    }
    a {
      color: #1a73e8;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .section {
      margin: 20px 0;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #1a73e8;
    }
    .success-section {
      border-left-color: #34a853;
    }
    .warning-section {
      border-left-color: #fbbc04;
    }
    .error-section {
      border-left-color: #ea4335;
    }
    ul {
      margin: 8px 0;
      padding-left: 24px;
    }
    li {
      margin: 6px 0;
    }
    .button-container {
      margin-top: 24px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    button {
      padding: 10px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
      position: relative;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-primary {
      background: #1a73e8;
      color: white;
    }
    .btn-primary:hover:not(:disabled) {
      background: #1765cc;
    }
    .btn-secondary {
      background: #5f6368;
      color: white;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #4d5156;
    }
    .btn-cancel {
      background: #fff;
      color: #5f6368;
      border: 1px solid #dadce0;
    }
    .btn-cancel:hover:not(:disabled) {
      background: #f8f9fa;
    }
    .checkmark {
      color: #34a853;
    }
    .info-text {
      color: #5f6368;
      font-size: 14px;
    }
    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.8s linear infinite;
      margin-left: 8px;
      vertical-align: middle;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
`;
}

function showSetupCompleteHtmlDialog(auditName, setupStatus, config) {
  const secondaryAudit = fetchAuditDetails(config.SECONDARY_AUDIT_ID, config);
  
  const primaryReportAction = setupStatus.primaryReportCreated ? 'created' : 'configured';
  const secondaryAuditAction = setupStatus.secondaryAuditCreated ? 'created' : 'configured';
  const secondaryReportAction = setupStatus.secondaryReportCreated ? 'created' : 'configured';
  
  const primaryAuditUrl = buildAuditUrl(config.PRIMARY_AUDIT_ID, config);
  const secondaryAuditUrl = buildAuditUrl(config.SECONDARY_AUDIT_ID, config);
  const primaryReportUrl = buildReportUrl(config.PRIMARY_REPORT_ID);
  const brokenReportUrl = buildReportUrl(config.BROKEN_REPORT_ID);
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_blank">
        ${getDialogStyles()}
      </head>
      <body>
        <h2>Setup Complete! ✅</h2>
        
        <div class="section">
          <p><strong>The automated setup is complete:</strong></p>
          <p>✓ Primary report ${primaryReportAction}: <a href="${primaryReportUrl}">"${auditName} - all external links"</a></p>
          <p>✓ Secondary audit ${secondaryAuditAction}: <a href="${secondaryAuditUrl}">"${secondaryAudit.name}"</a></p>
          <p>✓ Secondary report ${secondaryReportAction}: <a href="${brokenReportUrl}">"${auditName} - only broken external links"</a></p>
          <p>✓ Webhooks configured</p>
        </div>
        
        <div class="section">
          <p><strong>PRIMARY AUDIT:</strong> <a href="${primaryAuditUrl}">"${auditName}"</a></p>
          <p><strong>What would you like to do?</strong></p>
          <ul>
            <li><strong>Run Primary Audit:</strong> Run the primary audit now (workflow will continue automatically)</li>
            <li><strong>Process Existing Data:</strong> Primary audit has already run (process existing data)</li>
          </ul>
        </div>
        
        <div class="button-container">
          <button class="btn-cancel" onclick="google.script.host.close()">Cancel</button>
          <button class="btn-secondary" id="processBtn" onclick="handleChoice('process', this)">Process Existing Data</button>
          <button class="btn-primary" id="runBtn" onclick="handleChoice('run', this)">Run Primary Audit</button>
        </div>
        
        <script>
          function handleChoice(choice, button) {
            // Disable all buttons
            const buttons = document.querySelectorAll('button');
            buttons.forEach(btn => btn.disabled = true);
            
            // Add spinner to clicked button
            const originalText = button.innerHTML;
            button.innerHTML = originalText + '<span class="spinner"></span>';
            
            google.script.run
              .withSuccessHandler(function() {
                google.script.host.close();
              })
              .withFailureHandler(function(error) {
                // Re-enable buttons on error
                buttons.forEach(btn => btn.disabled = false);
                button.innerHTML = originalText;
                alert('Error: ' + error.message);
              })
              .handleSetupCompleteChoice(choice);
          }
        </script>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(600)
    .setHeight(500);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Setup Complete');
}

function showSecondaryAuditHtmlDialog(primaryAuditName, config) {
  const secondaryAudit = fetchAuditDetails(config.SECONDARY_AUDIT_ID, config);
  const secondaryAuditUrl = buildAuditUrl(config.SECONDARY_AUDIT_ID, config);
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_blank">
        ${getDialogStyles()}
      </head>
      <body>
        <h2>Secondary Audit Options</h2>
        
        <div class="section">
          <p><strong>SECONDARY AUDIT:</strong> <a href="${secondaryAuditUrl}">"${secondaryAudit.name}"</a></p>
          <p><strong>What would you like to do?</strong></p>
          <ul>
            <li><strong>Run Secondary Audit:</strong> Run the secondary audit now (test the external links)</li>
            <li><strong>Process Existing Data:</strong> Secondary audit has already run (process existing data)</li>
          </ul>
        </div>
        
        <div class="button-container">
          <button class="btn-cancel" onclick="google.script.host.close()">Cancel</button>
          <button class="btn-secondary" id="processBtn" onclick="handleChoice('process', this)">Process Existing Data</button>
          <button class="btn-primary" id="runBtn" onclick="handleChoice('run', this)">Run Secondary Audit</button>
        </div>
        
        <script>
          function handleChoice(choice, button) {
            // Disable all buttons
            const buttons = document.querySelectorAll('button');
            buttons.forEach(btn => btn.disabled = true);
            
            // Add spinner to clicked button
            const originalText = button.innerHTML;
            button.innerHTML = originalText + '<span class="spinner"></span>';
            
            google.script.run
              .withSuccessHandler(function() {
                google.script.host.close();
              })
              .withFailureHandler(function(error) {
                // Re-enable buttons on error
                buttons.forEach(btn => btn.disabled = false);
                button.innerHTML = originalText;
                alert('Error: ' + error.message);
              })
              .handleSecondaryAuditChoice(choice);
          }
        </script>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(600)
    .setHeight(350);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Secondary Audit Options');
}

function handleSetupCompleteChoice(choice) {
  const config = getConfigForSetup();
  const primaryAudit = fetchAuditDetails(config.PRIMARY_AUDIT_ID, config);
  
  if (choice === 'run') {
    runPrimaryAuditAndWait(primaryAudit.name);
  } else if (choice === 'process') {
    showSecondaryAuditHtmlDialog(primaryAudit.name, config);
  }
}

function handleSecondaryAuditChoice(choice) {
  if (choice === 'run') {
    // Process primary data AND trigger secondary audit
    handlePrimaryAuditComplete();
    showSuccessDialog(
      'Secondary Audit Started ✅',
      'Primary report data has been processed.<br><br>' +
      'The secondary audit has been triggered.<br>' +
      'When it completes, the webhook will automatically process the results.<br><br>' +
      '<span class="info-text">Check the Execution_Log sheet for progress.</span>'
    );
  } else if (choice === 'process') {
    // Process both reports WITHOUT running audits
    processPrimaryReportData();
    handleSecondaryAuditComplete();
    showSuccessDialog(
      'Processing Complete ✅',
      'Both primary and secondary audit data have been processed.<br><br>' +
      'Check the Final_Broken_Links sheet for results.'
    );
  }
}
