# ObservePoint CSM Toolbelt

A unified Apps Script library providing tools for working with ObservePoint data in Google Sheets.

## Overview

This library is deployed as an Apps Script Library that can be used in any Google Sheet:
- **Grid API Importer**: Import large saved reports (350k+ rows)
- **Webhook Automation**: Automated broken links detection workflow

**Library Script ID**: `1v4DTpf5lRrNk1g4V4P9k1QYpfRMTolkHXP5BENkD36gzt1dF8XjuFjcS`

## Available Tools

### Grid API Importer
- Import large saved reports (350k+ rows)
- Interactive config dialog
- Creates new sheet per import with timestamp
- Works with any ObservePoint report

### Webhook Automation
- Automated broken links detection
- Setup wizard for easy configuration
- Primary and secondary audit workflow
- Webhook-triggered automation

### Sitemap Monitor
- Monitor sitemaps for new pages
- Track URLs and lastmod dates
- Automatically update ObservePoint audits with new URLs only
- Optional auto-run audit after update
- Maintains tracking history in Google Sheets

## For Library Users

See **[LIBRARY_USAGE.md](LIBRARY_USAGE.md)** for complete instructions on using this library in your Google Sheets.

## For Library Developers

### Development Setup

```bash
# Install dependencies
npm install
npm install -g @google/clasp

# Login to Google
clasp login

# Enable Apps Script API
# https://script.google.com/home/usersettings
```

### Making Changes

```bash
cd src

# Edit files
vim GridImporter.js

# Test changes (optional)
clasp push
clasp open

# When ready to deploy new version
cd ..
./scripts/update-library.sh "Description of changes"
```

This will:
1. Push code changes to Apps Script
2. Create new deployment version
3. Auto-generate updated customer template
4. Update CHANGELOG.md
5. Users can then upgrade to new version in their sheets

## Shared Libraries

All tools automatically include these shared utilities:

### ObservePointClient
```javascript
const client = new ObservePointClient(apiKey);

// Fetch saved report
const report = client.getSavedReport(reportId);

// Fetch all grid data with pagination
const data = client.fetchAllGridData('links', queryDefinition);

// Get/update/run audits
const audit = client.getAudit(auditId);
client.updateAudit(auditId, { urls: [...] });
client.runAudit(auditId);
```

### SheetHelpers
```javascript
// Write data with headers
SheetHelpers.writeDataWithHeaders(sheet, headers, data);

// Batch write for large datasets
SheetHelpers.batchWriteData(sheet, headers, data, 50000);

// Data operations
const unique = SheetHelpers.getUniqueValues(data, columnIndex);
const filtered = SheetHelpers.filterRows(data, columnIndex, values);
const joined = SheetHelpers.joinData(leftData, rightData, leftKey, rightKey);
```

### Logger
```javascript
Logger.info('action', 'message');
Logger.warn('action', 'message');
Logger.error('action', 'message');
Logger.clearLog();
```

### ConfigManager
```javascript
// Create config sheet
ConfigManager.createConfigSheet('Config', configItems);

// Get values
const apiKey = ConfigManager.getValue('OP_API_KEY');
const config = ConfigManager.getValues(['KEY1', 'KEY2']);

// Validate required
ConfigManager.validateRequired(['OP_API_KEY', 'REPORT_ID']);
```

## Documentation

- **[LIBRARY_USAGE.md](LIBRARY_USAGE.md)** - How to use the library in Google Sheets
- **[CLASP_SETUP.md](CLASP_SETUP.md)** - clasp CLI setup and usage
- **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)** - Development patterns and best practices
- **[.cascade/DIALOG_PATTERN.md](.cascade/DIALOG_PATTERN.md)** - Interactive dialog pattern for tools
- **[.cascade/API_PATTERNS.md](.cascade/API_PATTERNS.md)** - ObservePoint API examples
- **[.cascade/TOOL_CHECKLIST.md](.cascade/TOOL_CHECKLIST.md)** - Checklist for new tools

## 🔐 Configuration

Each tool requires an ObservePoint API key:

1. Get your API key: https://app.observepoint.com/my-profile
2. In Google Sheets: Run tool's "Initialize Config" menu item
3. Paste API key in Config sheet
4. Add any tool-specific configuration

## Version History

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

## 🎯 Design Principles

### Low Friction
- Scaffold new tools in seconds with `npm run new-tool`
- Shared libraries eliminate code duplication
- Automated deployment with clasp
- Consistent patterns across all tools

### Single Source of Truth
- GitHub is the master repository
- Local development with Windsurf
- Direct sync to Apps Script with `clasp push`
- No copy-paste workflow

### Professional Quality
- Comprehensive error handling
- Consistent logging
- User-friendly alerts
- Detailed documentation

### CSM-Optimized
- ObservePoint API client with retry logic
- Handle large datasets (350k+ rows)
- Batch processing for performance
- Rate limit handling

## 🔄 Common Workflows

### Adding a New Tool to the Library

1. **Create new tool files** in `/src`:
   ```bash
   cd src
   # Create NewTool.js with your tool logic
   # Create NewToolDialogs.js for UI (optional)
   ```

2. **Add menu items** in `Main.js`:
   ```javascript
   .addSubMenu(ui.createMenu('New Tool')
     .addItem('Run Tool', 'newTool_run')
     .addItem('Configure', 'newTool_initConfig'))
   ```

3. **Test locally**:
   ```bash
   clasp push
   clasp open
   ```

4. **Deploy new version**:
   ```bash
   cd ..
   ./scripts/update-library.sh "Added New Tool feature"
   ```

### Sharing with Customers

1. **Customer creates new sheet** or uses existing
2. **Add library**: Extensions > Apps Script > Libraries
   - Script ID: `1v4DTpf5lRrNk1g4V4P9k1QYpfRMTolkHXP5BENkD36gzt1dF8XjuFjcS`
   - Identifier: `ObservePointTools`
3. **Copy wrapper code** from `/customer-template/Code.js`
4. **Customer configures** API key via menu
5. **Tools are ready** to use

## 🐛 Troubleshooting

### "clasp not found"
```bash
npm install -g @google/clasp
clasp login
```

### "User has not enabled the Apps Script API"
1. Go to https://script.google.com/home/usersettings
2. Enable "Google Apps Script API"

### Library version not updating for customers
- Customers must manually upgrade library version in their Apps Script editor
- See CUSTOMER_MANAGEMENT.md for update workflow

### Customer template out of sync
- Run `./scripts/generate-customer-template.sh` to regenerate
- Template auto-updates when deploying new versions

### Check execution logs
- In Google Sheets: Check "Execution_Log" sheet
- In Apps Script: View > Executions

## 📊 ObservePoint API Resources

- [API Documentation](https://api-docs.observepoint.com/)
- [Grid API Guide](https://api-docs.observepoint.com/reference/grid-api)
- [Help Center](https://help.observepoint.com/)

## 🤝 Contributing

When adding new tools:
1. Create tool files in `/src` directory
2. Add menu items to `Main.js`
3. Test with `clasp push` and `clasp open`
4. Deploy with `./scripts/update-library.sh "Description"`
5. Update documentation as needed

## 📝 License

MIT
