# Using ObservePoint Toolbelt as a Library

Your ObservePoint CSM Toolbelt is now deployed as an Apps Script Library that can be used in any Google Sheet.

## Library Information

**Script ID**: `1v4DTpf5lRrNk1g4V4P9k1QYpfRMTolkHXP5BENkD36gzt1dF8XjuFjcS`  
**Library Name**: `ObservePointToolbelt`  
**Current Version**: 1

## Setup for New Google Sheets

### Step 1: Create a New Google Sheet

1. Go to https://sheets.google.com
2. Create a new blank sheet
3. Name it appropriately (e.g., "Customer Name - ObservePoint Tools")

### Step 2: Open Apps Script Editor

1. In your Google Sheet: **Extensions** > **Apps Script**
2. Delete any default code in `Code.gs`

### Step 3: Add the Library

1. In Apps Script editor, click **Libraries** (+ icon on left sidebar)
2. In "Script ID" field, paste: `1v4DTpf5lRrNk1g4V4P9k1QYpfRMTolkHXP5BENkD36gzt1dF8XjuFjcS`
3. Click **Look up**
4. Select version **1** (or latest)
5. Set Identifier to: `ObservePointToolbelt`
6. Click **Add**

### Step 4: Add Wrapper Code

Copy the wrapper code from `/customer-template/Code.js` into your Apps Script editor.

Or use this minimal version:

```javascript
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  ui.createMenu('ObservePoint Tools')
    .addSubMenu(ui.createMenu('Grid API Importer')
      .addItem('Import Saved Report', 'gridImporter_importReport')
      .addItem('Initialize Config', 'gridImporter_initConfig'))
    .addSubMenu(ui.createMenu('Webhook Automation')
      .addItem('Setup Wizard', 'webhooks_setupWizard')
      .addItem('Manual Run Primary', 'webhooks_manualRunPrimary')
      .addItem('Manual Run Secondary', 'webhooks_manualRunSecondary'))
    .addSeparator()
    .addItem('Initialize All Configs', 'initializeAllConfigs')
    .addItem('View Execution Log', 'showExecutionLog')
    .addToUi();
}

// Grid API Importer
function gridImporter_importReport() {
  ObservePointToolbelt.gridImporter_importReport();
}

function gridImporter_initConfig() {
  ObservePointToolbelt.gridImporter_initConfig();
}

// Webhook Automation
function webhooks_setupWizard() {
  ObservePointToolbelt.webhooks_setupWizard();
}

function webhooks_manualRunPrimary() {
  ObservePointToolbelt.webhooks_manualRunPrimary();
}

function webhooks_manualRunSecondary() {
  ObservePointToolbelt.webhooks_manualRunSecondary();
}

// Utilities
function initializeAllConfigs() {
  ObservePointToolbelt.initializeAllConfigs();
}

function showExecutionLog() {
  ObservePointToolbelt.showExecutionLog();
}

function clearExecutionLog() {
  ObservePointToolbelt.clearExecutionLog();
}

// For webhook automation
function doPost(e) {
  return ObservePointToolbelt.doPostHandler(e);
}
```

### Step 5: Save and Test

1. Click **Save** (disk icon)
2. Close Apps Script editor
3. **Refresh your Google Sheet**
4. You should see "ObservePoint Tools" menu
5. Click any tool to use it

## How It Works

- The **library** contains all the tool code (Grid Importer, Webhook Automation, etc.)
- Your **wrapper code** creates the menu and calls library functions
- Each Google Sheet has its own:
  - Configuration (stored in sheets)
  - Data (imported reports, logs, etc.)
  - Permissions (who can access)

## Updating the Library

When you update the library code:

### 1. Push Changes to Master

```bash
cd /Users/johndavis/CascadeProjects/op-appscripts/src
clasp push
```

### 2. Create New Deployment

```bash
clasp deploy --description "v1.1 - Bug fixes and improvements"
```

### 3. Notify Users

Users can update to the new version:
1. In their Apps Script editor
2. Click on **ObservePointToolbelt** library
3. Select new version from dropdown
4. Click **Save**
5. Refresh their Google Sheet

## Version Management

### Check Current Version

```bash
cd src
clasp deployments
```

### View All Versions

In Apps Script editor:
- Project Settings > Deployments
- See all versions and descriptions

### Rollback if Needed

Users can select any previous version in their library settings.

## Advantages of Library Approach

✅ **Centralized Updates**: Update once, all users can upgrade  
✅ **Consistent Code**: Everyone uses the same tested code  
✅ **Easy Maintenance**: One codebase to maintain  
✅ **Version Control**: Users can choose when to upgrade  
✅ **Smaller Sheets**: Customer sheets only have wrapper code

## Disadvantages to Consider

⚠️ **Setup Complexity**: Users need to add library manually  
⚠️ **Update Coordination**: Users must manually upgrade versions  
⚠️ **Debugging**: Harder to debug library code from customer sheets  
⚠️ **Customization**: Can't easily customize per customer

## Customer Instructions

Share this with customers:

---

### Quick Setup Guide

1. **Open your Google Sheet**
2. **Extensions** > **Apps Script**
3. Click **Libraries** (+ icon)
4. Paste Script ID: `1v4DTpf5lRrNk1g4V4P9k1QYpfRMTolkHXP5BENkD36gzt1dF8XjuFjcS`
5. Click **Look up** > Select version **1** > Click **Add**
6. Copy wrapper code (provided separately)
7. **Save** and close Apps Script
8. **Refresh** your Google Sheet
9. Use "ObservePoint Tools" menu

---

## Troubleshooting

### "ObservePointToolbelt is not defined"

- Library not added or wrong identifier
- Check Libraries section in Apps Script
- Identifier must be exactly: `ObservePointToolbelt`

### Menu Not Showing

- Refresh the Google Sheet
- Check that `onOpen()` function exists in wrapper code
- Try: Extensions > Apps Script > Run > onOpen

### "Authorization required"

- Normal on first run
- Click "Review Permissions"
- Authorize the script
- Try again

### Functions Not Working

- Check library version is selected (not blank)
- Verify wrapper functions call library correctly
- Check Execution Log in Apps Script for errors

## Support

For issues or questions:
1. Check Execution_Log sheet in Google Sheet
2. View Apps Script execution logs
3. Verify library version is up to date
4. Contact CSM team for assistance
