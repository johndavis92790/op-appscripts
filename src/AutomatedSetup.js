/**
 * Automated Setup Wizard for ObservePoint Broken External Links Workflow
 * 
 * This file contains functions for the automated setup process that:
 * 1. Collects API key and primary audit ID from user
 * 2. Creates/configures primary and secondary reports
 * 3. Creates/configures secondary audit
 * 4. Sets up webhooks
 * 5. Provides options to run or skip audit execution
 */

function webhooks_setupWizard() {
  try {
    showWelcomeDialog();
  } catch (err) {
    showErrorDialog('Setup Failed', 'Error: ' + err.message);
    throw err;
  }
}

function collectSetupInputs() {
  const ui = SpreadsheetApp.getUi();
  
  const existingConfig = getExistingConfig();
  
  let apiKey = existingConfig.OP_API_KEY || '';
  let primaryAuditId = existingConfig.PRIMARY_AUDIT_ID || '';
  let webhookBaseUrl = existingConfig.WEBHOOK_BASE_URL || '';
  
  if (!apiKey) {
    const apiKeyResponse = ui.prompt(
      'Step 1: API Key',
      'Enter your ObservePoint API key:\n(Get it from https://app.observepoint.com/my-profile)',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (apiKeyResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    apiKey = apiKeyResponse.getResponseText().trim();
    if (!apiKey) {
      ui.alert('Error', 'API key is required', ui.ButtonSet.OK);
      return;
    }
  } else {
    log('INFO', 'setup_config', 'Using existing API key from config');
  }
  
  if (!primaryAuditId) {
    const auditIdResponse = ui.prompt(
      'Step 2: Primary Audit ID',
      'Enter your primary audit ID:\n(The audit that crawls your website)',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (auditIdResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    primaryAuditId = auditIdResponse.getResponseText().trim();
    if (!primaryAuditId) {
      ui.alert('Error', 'Primary audit ID is required', ui.ButtonSet.OK);
      return;
    }
  } else {
    log('INFO', 'setup_config', 'Using existing primary audit ID from config: ' + primaryAuditId);
  }
  
  if (webhookBaseUrl && webhookBaseUrl.indexOf('/a/') === -1) {
    log('INFO', 'setup_config', 'Using existing valid webhook URL from config');
  } else {
    try {
      const detectedUrl = ScriptApp.getService().getUrl();
      log('INFO', 'setup_config', 'Auto-detected Web App URL: ' + detectedUrl);
      
      if (detectedUrl && detectedUrl.indexOf('/a/') === -1) {
        webhookBaseUrl = detectedUrl;
        log('INFO', 'setup_config', 'Using auto-detected URL (valid format)');
      } else {
        log('WARN', 'setup_config', 'Auto-detected URL contains Workspace domain - prompting for manual entry');
        webhookBaseUrl = '';
      }
    } catch (err) {
      log('WARN', 'setup_config', 'Could not auto-detect Web App URL: ' + err.message);
      webhookBaseUrl = '';
    }
    
    if (!webhookBaseUrl) {
      const webhookUrlResponse = ui.prompt(
        'Step 3: Web App URL',
        'Enter your deployed Web App URL:\n(From Deploy > Manage deployments)\n\n' +
        'Should look like:\nhttps://script.google.com/macros/s/[ID]/exec\n\n' +
        'Note: Workspace domain URLs with /a/domain.com/ will not work for external webhooks.',
        ui.ButtonSet.OK_CANCEL
      );
      
      if (webhookUrlResponse.getSelectedButton() !== ui.Button.OK) {
        return;
      }
      
      webhookBaseUrl = webhookUrlResponse.getResponseText().trim();
      if (!webhookBaseUrl) {
        ui.alert('Error', 'Web App URL is required', ui.ButtonSet.OK);
        return;
      }
    }
  }
  
  saveInitialConfig(apiKey, primaryAuditId, webhookBaseUrl);
  
  showConfigSavedDialog();
  
  proceedWithAutomatedSetup();
}

function getExistingConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  
  if (!configSheet) {
    return {};
  }
  
  const data = configSheet.getRange('A2:B10').getValues();
  const config = {};
  
  data.forEach(function(row) {
    const key = row[0];
    const value = row[1];
    if (key && value) {
      config[key] = value;
    }
  });
  
  return config;
}

function saveInitialConfig(apiKey, primaryAuditId, webhookBaseUrl) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  
  if (!configSheet) {
    configSheet = ss.insertSheet(SHEET_NAMES.CONFIG);
    configSheet.getRange('A1:B1').setValues([['Setting', 'Value']]);
    configSheet.getRange('A1:B1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  }
  
  const existingConfig = getExistingConfig();
  
  configSheet.getRange('A2:B11').setValues([
    ['OP_API_KEY', apiKey],
    ['WEBHOOK_BASE_URL', webhookBaseUrl],
    ['PRIMARY_AUDIT_ID', primaryAuditId],
    ['SECONDARY_AUDIT_ID', existingConfig.SECONDARY_AUDIT_ID || ''],
    ['PRIMARY_REPORT_ID', existingConfig.PRIMARY_REPORT_ID || ''],
    ['BROKEN_REPORT_ID', existingConfig.BROKEN_REPORT_ID || ''],
    ['PRIMARY_AUDIT_URL', existingConfig.PRIMARY_AUDIT_URL || ''],
    ['SECONDARY_AUDIT_URL', existingConfig.SECONDARY_AUDIT_URL || ''],
    ['PRIMARY_REPORT_URL', existingConfig.PRIMARY_REPORT_URL || ''],
    ['BROKEN_REPORT_URL', existingConfig.BROKEN_REPORT_URL || '']
  ]);
  
  configSheet.setColumnWidth(1, 200);
  configSheet.setColumnWidth(2, 500);
}

function proceedWithAutomatedSetup() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const config = getConfigForSetup();
    const primaryAudit = fetchAuditDetails(config.PRIMARY_AUDIT_ID, config);
    
    log('INFO', 'setup_start', 'Starting automated setup for audit: ' + primaryAudit.name);
    
    const primaryReportResult = createOrGetPrimaryReport(primaryAudit, config);
    const secondaryAuditResult = createOrGetSecondaryAudit(primaryAudit, config);
    const secondaryReportResult = createOrGetSecondaryReport(primaryAudit, secondaryAuditResult.id, config);
    
    updateConfigWithIds(primaryReportResult.id, secondaryAuditResult.id, secondaryReportResult.id, config.PRIMARY_AUDIT_ID);
    
    configureWebhooks(config.PRIMARY_AUDIT_ID, secondaryAuditResult.id, config);
    
    log('INFO', 'setup_complete', 'Automated setup completed successfully');
    
    const setupStatus = {
      primaryReportCreated: primaryReportResult.created,
      secondaryAuditCreated: secondaryAuditResult.created,
      secondaryReportCreated: secondaryReportResult.created
    };
    
    showSetupCompleteDialog(primaryAudit.name, setupStatus);
    
  } catch (err) {
    log('ERROR', 'setup_failed', err.message);
    showErrorDialog('Setup Failed', 'Error: ' + err.message + '<br><br>Check Execution_Log for details.');
    throw err;
  }
}

function getConfigForSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  
  if (!configSheet) {
    throw new Error('Config sheet not found');
  }
  
  const data = configSheet.getRange('A2:B10').getValues();
  const config = {};
  
  data.forEach(function(row) {
    const key = row[0];
    const value = row[1];
    if (key && value) {
      config[key] = value;
    }
  });
  
  return {
    API_KEY: config.OP_API_KEY,
    PRIMARY_AUDIT_ID: config.PRIMARY_AUDIT_ID,
    PRIMARY_REPORT_ID: config.PRIMARY_REPORT_ID || null,
    BROKEN_REPORT_ID: config.BROKEN_REPORT_ID || null,
    SECONDARY_AUDIT_ID: config.SECONDARY_AUDIT_ID || null,
    WEBHOOK_BASE_URL: config.WEBHOOK_BASE_URL || '',
    BASE_URL: 'https://api.observepoint.com'
  };
}

function fetchAuditDetails(auditId, config) {
  const url = config.BASE_URL + '/v2/web-audits/' + auditId;
  const options = {
    method: 'get',
    headers: {
      'Authorization': 'api_key ' + config.API_KEY,
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() >= 300) {
    throw new Error('Failed to fetch audit: ' + response.getContentText());
  }
  
  return JSON.parse(response.getContentText());
}

function updateConfigWithIds(primaryReportId, secondaryAuditId, secondaryReportId, primaryAuditId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  const config = getConfigForSetup();
  
  // Row 5: SECONDARY_AUDIT_ID
  configSheet.getRange('B5').setValue(secondaryAuditId);
  // Row 6: PRIMARY_REPORT_ID
  configSheet.getRange('B6').setValue(primaryReportId);
  // Row 7: BROKEN_REPORT_ID
  configSheet.getRange('B7').setValue(secondaryReportId);
  
  const primaryAuditUrl = buildAuditUrl(primaryAuditId, config);
  const secondaryAuditUrl = buildAuditUrl(secondaryAuditId, config);
  const primaryReportUrl = buildReportUrl(primaryReportId);
  const brokenReportUrl = buildReportUrl(secondaryReportId);
  
  // Row 8: PRIMARY_AUDIT_URL
  configSheet.getRange('B8').setValue(primaryAuditUrl);
  // Row 9: SECONDARY_AUDIT_URL
  configSheet.getRange('B9').setValue(secondaryAuditUrl);
  // Row 10: PRIMARY_REPORT_URL
  configSheet.getRange('B10').setValue(primaryReportUrl);
  // Row 11: BROKEN_REPORT_URL
  configSheet.getRange('B11').setValue(brokenReportUrl);
  
  configSheet.getRange('B8:B11').setFontColor('#1155cc').setFontLine('underline');
}

function showSetupCompleteDialog(auditName, setupStatus) {
  const config = getConfigForSetup();
  showSetupCompleteHtmlDialog(auditName, setupStatus, config);
}

function showSecondaryAuditDialog(primaryAuditName) {
  const config = getConfigForSetup();
  showSecondaryAuditHtmlDialog(primaryAuditName, config);
}

function runPrimaryAuditAndWait(auditName) {
  const ui = SpreadsheetApp.getUi();
  const config = getConfigForSetup();
  
  try {
    const runUrl = config.BASE_URL + '/v2/web-audits/' + config.PRIMARY_AUDIT_ID + '/runs';
    const options = {
      method: 'post',
      headers: {
        'Authorization': 'api_key ' + config.API_KEY,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(runUrl, options);
    if (response.getResponseCode() >= 300) {
      throw new Error('Failed to start audit: ' + response.getContentText());
    }
    
    const result = JSON.parse(response.getContentText());
    const runId = result.id || result.runId;
    
    log('INFO', 'audit_started', 'Primary audit run started', runId);
    
    showAuditStartedDialog(auditName, config);
    
  } catch (err) {
    log('ERROR', 'audit_start_failed', err.message);
    showErrorDialog('Failed to Start Audit', 'Error: ' + err.message);
    throw err;
  }
}
