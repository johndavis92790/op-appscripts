/**
 * HTML Dialogs for the Setup Wizard
 */

function showWelcomeDialog() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        ${DIALOG_STYLES}
      </head>
      <body>
        <h2>🚀 ObservePoint Automated Setup Wizard</h2>
        
        <p>This wizard will guide you through setting up the broken external links workflow.</p>
        
        <div class="section">
          <p><strong>Prerequisites:</strong></p>
          <ul>
            <li>You have deployed this script as a Web App</li>
            <li>You have your ObservePoint API key</li>
            <li>You have a primary audit ID (the audit that crawls your site)</li>
          </ul>
        </div>
        
        <div class="section success-section">
          <p><strong>The wizard will:</strong></p>
          <ul>
            <li>Create reports for external links</li>
            <li>Create a secondary audit to test those links</li>
            <li>Configure webhooks automatically</li>
          </ul>
        </div>
        
        <div class="button-container">
          <button class="btn-cancel" onclick="google.script.host.close()">Cancel</button>
          <button class="btn-primary" id="continueBtn" onclick="handleContinue(this)">Continue</button>
        </div>
        
        <script>
          function handleContinue(button) {
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
              .continueSetupWizard();
          }
        </script>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(550)
    .setHeight(450);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Setup Wizard');
}

function showConfigSavedDialog() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        ${DIALOG_STYLES}
      </head>
      <body>
        <h2>Configuration Saved ✅</h2>
        
        <div class="section success-section">
          <p>Initial configuration has been saved.</p>
          <p class="info-text">Next: The wizard will set up your reports and audits.</p>
        </div>
        
        <div class="button-container">
          <button class="btn-primary" onclick="google.script.host.close()">Continue</button>
        </div>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(450)
    .setHeight(250);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Configuration Saved');
}

function showAuditStartedDialog(auditName, config) {
  const auditUrl = buildAuditUrl(config.PRIMARY_AUDIT_ID, config);
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_blank">
        ${DIALOG_STYLES}
      </head>
      <body>
        <h2>Primary Audit Started ✅</h2>
        
        <div class="section">
          <p><strong>PRIMARY AUDIT:</strong> <a href="${auditUrl}">"${auditName}"</a></p>
          <p>The audit has been started.</p>
        </div>
        
        <div class="section success-section">
          <p><strong>When it completes, the webhook will automatically:</strong></p>
          <ol>
            <li>Fetch the report data</li>
            <li>Extract unique external links</li>
            <li>Trigger the secondary audit</li>
          </ol>
          <p class="info-text">Check the Execution_Log sheet for progress.</p>
        </div>
        
        <div class="button-container">
          <button class="btn-primary" onclick="google.script.host.close()">OK</button>
        </div>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(550)
    .setHeight(400);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Audit Started');
}

function showErrorDialog(title, message) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        ${DIALOG_STYLES}
      </head>
      <body>
        <h2>${title}</h2>
        
        <div class="section error-section">
          <p>${message}</p>
        </div>
        
        <div class="button-container">
          <button class="btn-primary" onclick="google.script.host.close()">OK</button>
        </div>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(500)
    .setHeight(300);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, title);
}

function showSuccessDialog(title, message) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        ${DIALOG_STYLES}
      </head>
      <body>
        <h2>${title}</h2>
        
        <div class="section success-section">
          <p>${message}</p>
        </div>
        
        <div class="button-container">
          <button class="btn-primary" onclick="google.script.host.close()">OK</button>
        </div>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(500)
    .setHeight(300);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, title);
}

function showInfoDialog(title, message) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        ${DIALOG_STYLES}
      </head>
      <body>
        <h2>${title}</h2>
        
        <div class="section">
          <p>${message}</p>
        </div>
        
        <div class="button-container">
          <button class="btn-primary" onclick="google.script.host.close()">OK</button>
        </div>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(500)
    .setHeight(300);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, title);
}

function continueSetupWizard() {
  collectSetupInputs();
}
