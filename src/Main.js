/**
 * ObservePoint CSM Toolbelt
 * 
 * A unified library of tools for working with ObservePoint data.
 * All tools are available from a single menu in any Google Sheet.
 * 
 * Available Tools:
 * - Grid API Importer: Import large saved reports (350k+ rows)
 * - Webhook Automation: Automated broken links detection
 * 
 * Setup:
 * 1. Deploy this script to your Google Sheet
 * 2. Refresh the sheet to see the "ObservePoint Tools" menu
 * 3. Use "Initialize Configs" to set up configuration sheets
 * 4. Configure your API key and settings
 * 5. Use any tool from the menu
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  ui.createMenu('ObservePoint Tools')
    .addSubMenu(ui.createMenu('Grid API Importer')
      .addItem('Import Saved Report', 'gridImporter_importReport')
      .addItem('Clear Data', 'gridImporter_clearData'))
    .addSubMenu(ui.createMenu('Webhook Automation')
      .addItem('Setup Wizard', 'webhooks_setupWizard')
      .addItem('Manual Run Primary', 'webhooks_manualRunPrimary')
      .addItem('Manual Run Secondary', 'webhooks_manualRunSecondary')
      .addItem('Initialize Config', 'webhooks_initConfig'))
    .addSubMenu(ui.createMenu('Sitemap Monitor')
      .addItem('Setup & Run Monitor', 'sitemapMonitor_showSetupDialog')
      .addItem('Run Monitor', 'sitemapMonitor_runMonitor')
      .addItem('Initialize Config', 'sitemapMonitor_initConfig'))
    .addSeparator()
    .addSubMenu(ui.createMenu('Customer Management')
      .addItem('Create Customer Sheet', 'showCreateCustomerSheetDialog')
      .addItem('View Customer Registry', 'viewCustomerSheetRegistry')
      .addItem('Check for Updates Needed', 'checkForOutdatedSheets'))
    .addSeparator()
    .addItem('Initialize All Configs', 'initializeAllConfigs')
    .addItem('View Execution Log', 'showExecutionLog')
    .addItem('Clear Execution Log', 'clearExecutionLog')
    .addToUi();
}

function initializeAllConfigs() {
  try {
    gridImporter_initConfig();
    webhooks_initConfig();
    sitemapMonitor_initConfig();
    
    SpreadsheetApp.getUi().alert(
      'Configurations Initialized',
      'All tool configurations have been created.\n\n' +
      'Please fill in the Config sheets with your API keys and settings.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    Logger.error('init_all_configs', error.toString());
    SpreadsheetApp.getUi().alert('Error initializing configs: ' + error.toString());
  }
}

function showExecutionLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName('Execution_Log');
  
  if (logSheet) {
    ss.setActiveSheet(logSheet);
  } else {
    SpreadsheetApp.getUi().alert('No execution log found.');
  }
}

function clearExecutionLog() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    'Clear Execution Log',
    'Are you sure you want to clear the execution log?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    Logger.clearLog();
    ui.alert('Execution log cleared successfully.');
  }
}
