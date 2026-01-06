/**
 * Core import logic for Grid Importer
 * Separated from main function to allow reuse
 */

function executeGridImport(apiKey, reportId, batchSize, maxPages) {
  const startTime = new Date();
  
  try {
    log('INFO', 'import_start', `Starting import of saved report ${reportId}`);
    
    const reportData = getQueryDefinition(apiKey, reportId);
    log('INFO', 'query_fetched', `Retrieved query definition for report: ${reportData.name || reportId}`);
    
    // Create unique sheet name based on report name and timestamp
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss');
    const sheetName = (reportData.name || 'Report_' + reportId).substring(0, 50) + '_' + timestamp;
    
    const totalRows = fetchAllData(apiKey, reportData.gridEntityType, reportData.queryDefinition, batchSize, maxPages, sheetName);
    
    const duration = ((new Date() - startTime) / 1000).toFixed(2);
    log('INFO', 'import_complete', `Import completed successfully. ${totalRows} rows imported in ${duration} seconds. Sheet: ${sheetName}`);
    
    // Return success - no UI calls
    return {
      success: true,
      reportName: reportData.name,
      totalRows: totalRows,
      duration: duration,
      sheetName: sheetName
    };
    
  } catch (error) {
    log('ERROR', 'import_failed', error.toString());
    // Return error - no UI calls
    return {
      success: false,
      error: error.toString()
    };
  }
}
