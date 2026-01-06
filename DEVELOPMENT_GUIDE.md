# Development Guide

## Daily Workflow

### Starting a New Tool

```bash
# 1. Scaffold the tool
npm run new-tool my-tool-name

# 2. Navigate to tool directory
cd tools/my-tool-name

# 3. Edit Main.js to implement your logic
# - Use shared libraries (ObservePointClient, SheetHelpers, Logger, ConfigManager)
# - Follow the template structure
# - Add error handling

# 4. Update README.md with specific instructions

# 5. Link to Apps Script
clasp create --type sheets --title "My Tool Name"

# 6. Push to Apps Script
clasp push

# 7. Test in Google Sheets
clasp open
```

### Updating an Existing Tool

```bash
# 1. Navigate to tool directory
cd tools/grid-api-importer

# 2. Edit files locally in Windsurf

# 3. Push changes to Apps Script
clasp push

# 4. Test in Google Sheets

# 5. Commit to GitHub
git add .
git commit -m "Updated grid importer logic"
git push
```

### Updating Shared Libraries

```bash
# 1. Edit library file
# Edit lib/ObservePointClient.js

# 2. Copy to all tools
npm run push-lib

# 3. Deploy all tools (or specific ones)
npm run deploy-all
# or
npm run deploy grid-api-importer

# 4. Commit to GitHub
git add .
git commit -m "Updated ObservePoint client"
git push
```

## Code Patterns

### Basic Tool Structure

```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Tool Name')
    .addItem('Run Tool', 'mainFunction')
    .addItem('Initialize Config', 'initializeConfig')
    .addToUi();
}

function initializeConfig() {
  var configItems = [
    ['OP_API_KEY', '', 'Your ObservePoint API key'],
    ['REPORT_ID', '', 'Report ID to import']
  ];
  ConfigManager.createConfigSheet('Config', configItems);
}

function mainFunction() {
  try {
    Logger.info('start', 'Starting tool execution');
    
    // Validate config
    ConfigManager.validateRequired(['OP_API_KEY', 'REPORT_ID']);
    
    // Get config values
    var config = ConfigManager.getValues(['OP_API_KEY', 'REPORT_ID']);
    
    // Create API client
    var client = new ObservePointClient(config.OP_API_KEY);
    
    // Fetch data
    var report = client.getSavedReport(config.REPORT_ID);
    var data = client.fetchAllGridData(
      report.queryDefinition.gridEntityType,
      report.queryDefinition
    );
    
    // Process and write data
    var sheet = SheetHelpers.getOrCreateSheet('Results');
    var headers = client.extractHeaders(data.columns);
    var rows = client.extractRowsAsArray(data);
    
    SheetHelpers.batchWriteData(sheet, headers, rows, 50000);
    
    Logger.info('complete', 'Tool completed successfully');
    SpreadsheetApp.getUi().alert('Success!');
    
  } catch (error) {
    Logger.error('failed', error.toString());
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}
```

### Fetching Grid Data

```javascript
// Get saved report configuration
var savedReport = client.getSavedReport(reportId);

// Fetch all data with automatic pagination
var data = client.fetchAllGridData(
  savedReport.queryDefinition.gridEntityType,
  savedReport.queryDefinition,
  1000,  // rows per page
  null   // max pages (null = all)
);

// Extract to arrays
var headers = client.extractHeaders(data.columns);
var rows = client.extractRowsAsArray(data);
```

### Working with Audits

```javascript
// Get audit details
var audit = client.getAudit(auditId);

// Update audit URLs
client.updateAudit(auditId, {
  urls: ['https://example.com/page1', 'https://example.com/page2']
});

// Run audit
var run = client.runAudit(auditId);

// Get latest run
var latestRun = client.getLatestRun(auditId);
```

### Sheet Operations

```javascript
// Get or create sheet
var sheet = SheetHelpers.getOrCreateSheet('My Data');

// Write data with headers
SheetHelpers.writeDataWithHeaders(sheet, headers, data);

// Batch write for large datasets
SheetHelpers.batchWriteData(sheet, headers, data, 50000);

// Data manipulation
var unique = SheetHelpers.getUniqueValues(data, 0);
var filtered = SheetHelpers.filterRows(data, 0, ['value1', 'value2']);
var sorted = SheetHelpers.sortByColumn(data, 0, true);
var joined = SheetHelpers.joinData(leftData, rightData, 0, 0);
```

### Configuration Management

```javascript
// Create config sheet
var configItems = [
  ['API_KEY', '', 'Your API key'],
  ['SETTING', 'default', 'Setting description']
];
ConfigManager.createConfigSheet('Config', configItems);

// Get single value
var apiKey = ConfigManager.getValue('API_KEY');

// Get multiple values
var config = ConfigManager.getValues(['API_KEY', 'SETTING']);

// Validate required fields
ConfigManager.validateRequired(['API_KEY', 'SETTING']);

// Set value programmatically
ConfigManager.setValue('SETTING', 'new value');
```

### Logging

```javascript
// Log levels
Logger.info('action', 'Informational message');
Logger.warn('action', 'Warning message');
Logger.error('action', 'Error message');

// Generic log
Logger.log('INFO', 'action', 'message');

// Clear log
Logger.clearLog();
```

## Testing

### Local Testing

1. Edit files in Windsurf
2. Push to Apps Script: `clasp push`
3. Open in browser: `clasp open`
4. Run functions from menu
5. Check Execution_Log sheet

### Testing with Small Datasets

```javascript
// Limit pages for testing
var data = client.fetchAllGridData(
  entityType,
  queryDefinition,
  1000,
  5  // Only fetch 5 pages (50000 rows)
);
```

### Debugging

```javascript
// Add detailed logging
Logger.info('step1', 'Fetching report ' + reportId);
Logger.info('step2', 'Found ' + data.rows.length + ' rows');
Logger.info('step3', 'Writing to sheet');

// Check Apps Script logs
// In Apps Script editor: View > Executions

// Check Execution_Log sheet in Google Sheets
```

## Best Practices

### Error Handling

```javascript
function myFunction() {
  try {
    // Your code here
    
  } catch (error) {
    Logger.error('function_failed', error.toString());
    SpreadsheetApp.getUi().alert(
      'Error',
      'Failed: ' + error.toString() + '\n\nCheck Execution_Log for details.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    throw error;
  }
}
```

### User Feedback

```javascript
// Progress indicators
Logger.info('progress', 'Processing page 1 of 10...');

// Success messages
SpreadsheetApp.getUi().alert(
  'Success',
  'Imported 50,000 rows successfully.\n\nCheck the Results sheet.',
  SpreadsheetApp.getUi().ButtonSet.OK
);

// Confirmation dialogs
var response = SpreadsheetApp.getUi().alert(
  'Confirm',
  'This will clear all data. Continue?',
  SpreadsheetApp.getUi().ButtonSet.YES_NO
);

if (response === SpreadsheetApp.getUi().Button.YES) {
  // Proceed
}
```

### Performance

```javascript
// Batch write operations
SheetHelpers.batchWriteData(sheet, headers, data, 50000);

// Minimize API calls
var data = client.fetchAllGridData(...);  // One call for all data

// Use efficient data structures
var lookup = {};
for (var i = 0; i < data.length; i++) {
  lookup[data[i][0]] = data[i];
}
```

### Code Organization

```javascript
// Separate concerns
function mainFunction() {
  var config = getConfiguration();
  var data = fetchData(config);
  var processed = processData(data);
  writeResults(processed);
}

function getConfiguration() {
  ConfigManager.validateRequired(['API_KEY']);
  return ConfigManager.getValues(['API_KEY', 'REPORT_ID']);
}

function fetchData(config) {
  var client = new ObservePointClient(config.API_KEY);
  return client.fetchAllGridData(...);
}

function processData(data) {
  // Transform data
  return processed;
}

function writeResults(data) {
  var sheet = SheetHelpers.getOrCreateSheet('Results');
  SheetHelpers.writeDataWithHeaders(sheet, headers, data);
}
```

## Common Issues

### Apps Script Timeout (6 minutes)

**Problem**: Script exceeds 6-minute execution limit

**Solutions**:
- Batch process data in smaller chunks
- Use triggers to continue processing
- Reduce data volume with filters
- Optimize sheet write operations

### Memory Limit

**Problem**: Script runs out of memory with large datasets

**Solutions**:
- Increase batch size for writes
- Process data in chunks
- Clear variables after use
- Use efficient data structures

### Rate Limiting

**Problem**: ObservePoint API rate limits

**Solutions**:
- ObservePointClient has built-in retry logic
- Add delays between requests if needed
- Contact ObservePoint to increase limits

### clasp Push Fails

**Problem**: `clasp push` fails with errors

**Solutions**:
- Check `.clasp.json` exists and has correct scriptId
- Verify you're logged in: `clasp login`
- Check file syntax (ES5 compatible)
- Review `.claspignore` patterns

## Deployment Checklist

Before deploying a tool:

- [ ] Test with small dataset
- [ ] Test with large dataset (if applicable)
- [ ] Verify error handling works
- [ ] Check all menu items function
- [ ] Confirm sheets are created properly
- [ ] Review Execution_Log for errors
- [ ] Update README.md
- [ ] Test in fresh Google Sheet
- [ ] Commit to GitHub

## Resources

- [Apps Script Reference](https://developers.google.com/apps-script/reference)
- [ObservePoint API Docs](https://api-docs.observepoint.com/)
- [clasp Documentation](https://github.com/google/clasp)
- [Grid API Guide](https://api-docs.observepoint.com/reference/grid-api)
