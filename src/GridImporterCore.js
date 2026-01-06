/**
 * Core import logic for Grid Importer
 * Separated from main function to allow reuse
 */

function executeGridImport(apiKey, reportId, batchSize, maxPages) {
  const startTime = new Date();
  
  try {
    // Reset progress
    updateImportProgress('Starting import...', '', 0, false);
    
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
