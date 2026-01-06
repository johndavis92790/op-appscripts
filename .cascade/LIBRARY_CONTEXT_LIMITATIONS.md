# Library Context Limitations

## The Problem

Apps Script libraries have a critical limitation: **library functions cannot use `SpreadsheetApp.getUi()` when called from customer sheets.**

This affects all UI interactions:
- `alert()` - Error dialogs
- `prompt()` - User input
- `showModalDialog()` - Custom dialogs
- `showSidebar()` - Sidebar panels
- `toast()` - Toast notifications

## Why This Happens

When a customer sheet calls a library function:
1. The function executes in the **library's context**, not the customer sheet's context
2. The library context doesn't have access to the customer sheet's UI
3. Any `getUi()` call throws: `Cannot call SpreadsheetApp.getUi() from this context`

## The Solution: Silent Execution with Logging

### Design Pattern

**Core Principle**: Library functions should never attempt UI interactions. Instead:
- Log all progress to `Execution_Log` sheet
- Throw descriptive errors (customer wrapper can catch and display)
- Return result objects
- Use config sheets for input

### Example: Grid API Importer

#### ❌ Original Approach (Doesn't Work)
```javascript
function gridImporter_importReport() {
  // Show config dialog
  showGridImporterConfigDialog(); // ❌ Fails: getUi() error
  
  // Show progress
  SpreadsheetApp.getUi().alert('Starting import...'); // ❌ Fails
  
  // Import data
  const data = fetchData();
  
  // Show completion
  SpreadsheetApp.getUi().alert('Import complete!'); // ❌ Fails
}
```

#### ✅ Current Approach (Works)
```javascript
function gridImporter_importReport() {
  try {
    // Read config from sheet (no UI)
    const apiKey = getConfigValue('OP_API_KEY');
    const reportId = getConfigValue('SAVED_REPORT_ID');
    
    if (!apiKey || !reportId) {
      throw new Error('Config missing. Please run Initialize Config first.');
    }
    
    // Run import silently
    log('INFO', 'import_start', 'Starting import');
    executeGridImport(apiKey, reportId, batchSize, maxPages);
    
  } catch (e) {
    // Throw error - customer wrapper can display if needed
    throw new Error('Import failed: ' + e.message);
  }
}

function executeGridImport(apiKey, reportId, batchSize, maxPages) {
  const startTime = new Date();
  
  try {
    log('INFO', 'import_start', `Starting import of saved report ${reportId}`);
    
    const reportData = getQueryDefinition(apiKey, reportId);
    log('INFO', 'query_fetched', `Retrieved query definition for report: ${reportData.name}`);
    
    const totalRows = fetchAllData(apiKey, reportData.gridEntityType, reportData.queryDefinition, batchSize, maxPages, sheetName);
    
    const duration = ((new Date() - startTime) / 1000).toFixed(2);
    log('INFO', 'import_complete', `Import completed. ${totalRows} rows imported in ${duration} seconds.`);
    
    // Return result - no UI
    return {
      success: true,
      reportName: reportData.name,
      totalRows: totalRows,
      duration: duration
    };
    
  } catch (error) {
    log('ERROR', 'import_failed', error.toString());
    throw error;
  }
}
```

## Implementation Guidelines

### 1. Configuration: Use Config Sheets

❌ **Don't use prompts**:
```javascript
const apiKey = SpreadsheetApp.getUi().prompt('Enter API key').getResponseText();
```

✅ **Use config sheets**:
```javascript
// Initialize creates empty sheet
function tool_initConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName('Tool_Config');
  
  if (!configSheet) {
    configSheet = ss.insertSheet('Tool_Config');
    configSheet.getRange('A1:C5').setValues([
      ['Setting', 'Value', 'Description'],
      ['OP_API_KEY', '', 'Your ObservePoint API key'],
      ['REPORT_ID', '', 'The report ID to import'],
      ['BATCH_SIZE', '50000', 'Rows per batch'],
      ['MAX_PAGES', '', 'Optional page limit']
    ]);
  }
}

// Tool reads from sheet
function tool_run() {
  const apiKey = getConfigValue('OP_API_KEY');
  if (!apiKey) {
    throw new Error('Config missing. Please run Initialize Config first.');
  }
  // ... continue
}
```

### 2. Progress: Use Logging

❌ **Don't show progress dialogs**:
```javascript
SpreadsheetApp.getUi().alert('Fetching page 1 of 10...');
updateProgressDialog('50% complete');
```

✅ **Log to Execution_Log sheet**:
```javascript
log('INFO', 'fetch_page', 'Fetching page 1 of 10');
log('INFO', 'progress', '50% complete - 5000 rows processed');
```

### 3. Completion: Log Results

❌ **Don't show completion dialogs**:
```javascript
SpreadsheetApp.getUi().alert('Import complete! 10,000 rows imported.');
```

✅ **Log completion and return results**:
```javascript
log('INFO', 'import_complete', `Import completed. ${totalRows} rows imported in ${duration} seconds.`);
return { success: true, totalRows: totalRows, duration: duration };
```

### 4. Errors: Throw Descriptive Errors

❌ **Don't show error dialogs**:
```javascript
try {
  // ... code
} catch (error) {
  SpreadsheetApp.getUi().alert('Error: ' + error.message);
}
```

✅ **Log and throw**:
```javascript
try {
  // ... code
} catch (error) {
  log('ERROR', 'operation_failed', error.toString());
  throw new Error('Operation failed: ' + error.message);
}
```

## User Experience

### How Users Interact with Tools

1. **Setup**: Run "Initialize Config" menu item
   - Creates empty config sheet
   - No dialogs, just creates the sheet

2. **Configure**: Manually edit config sheet
   - Fill in API key, settings, etc.
   - Simple spreadsheet editing

3. **Run**: Run tool menu item
   - Tool executes silently
   - No progress dialogs
   - Check `Execution_Log` sheet for progress

4. **Results**: Check log sheet and data sheet
   - `Execution_Log` shows what happened
   - New data sheet created with results

### Benefits of This Approach

✅ **Reliable**: No UI context errors
✅ **Transparent**: All actions logged
✅ **Debuggable**: Full execution history in log sheet
✅ **Simple**: No complex dialog state management
✅ **Fast**: No UI overhead during execution

## Testing

When testing library functions:

1. **Test in library context** (simulates customer usage):
   ```javascript
   // In customer sheet Code.js
   function testImport() {
     ObservePointTools.gridImporter_importReport();
   }
   ```

2. **Check for UI calls**:
   - Search codebase for `getUi()`
   - Verify none are in library functions that customers call
   - Only use `getUi()` in customer wrapper code (if needed)

3. **Verify logging**:
   - Run tool
   - Check `Execution_Log` sheet
   - Ensure all important steps are logged

## Common Mistakes

### Mistake 1: Trying to Show Dialogs from Library

```javascript
// ❌ This will fail
function myLibraryFunction() {
  const html = HtmlService.createHtmlOutput('<p>Hello</p>');
  SpreadsheetApp.getUi().showModalDialog(html, 'Title'); // Error!
}
```

**Fix**: Don't show dialogs from library functions. Use config sheets and logging instead.

### Mistake 2: Calling getUi() Indirectly

```javascript
// ❌ This will also fail
function myLibraryFunction() {
  showProgressDialog(); // This function calls getUi()
}

function showProgressDialog() {
  SpreadsheetApp.getUi().alert('Progress...'); // Error!
}
```

**Fix**: Remove all UI calls from the entire execution path.

### Mistake 3: Trying to Show Dialogs from Callbacks

```javascript
// ❌ This will fail
function saveConfig(data) {
  // Save config...
  
  // Try to show dialog after save
  showSuccessDialog(); // Error if called from library context
}
```

**Fix**: Just log success and return. Let the customer wrapper handle UI if needed.

## Summary

**Golden Rule**: Library functions should be **silent executors** that:
- Read from config sheets
- Log to `Execution_Log` sheet
- Write results to data sheets
- Throw descriptive errors
- Return result objects

**Never**:
- Call `getUi()`
- Show dialogs, alerts, or prompts
- Display progress indicators
- Show completion messages

This pattern ensures tools work reliably in customer sheets without UI context errors.
