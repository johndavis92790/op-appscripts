# ObservePoint CSM Toolbelt

Unified Apps Script library containing all ObservePoint tools in one deployment.

## What's Included

### Grid API Importer
Import large saved reports from ObservePoint (handles 350k+ rows efficiently).

### Webhook Automation
Automated broken external links detection workflow triggered by audit webhooks.

## Deployment

This is the unified library that gets deployed to Google Sheets.

```bash
cd src
clasp create --type sheets --title "ObservePoint CSM Toolbelt"
clasp push
```

## Usage

Once deployed to a Google Sheet:

1. Refresh the sheet
2. See "ObservePoint Tools" menu
3. Use "Initialize All Configs" to set up configuration sheets
4. Configure your API keys and settings
5. Use any tool from the menu

## Menu Structure

```
ObservePoint Tools ▼
├── Grid API Importer
│   ├── Import Saved Report
│   ├── Initialize Config
│   └── Clear Data
├── Webhook Automation
│   ├── Setup Wizard
│   ├── Manual Run Primary
│   ├── Manual Run Secondary
│   └── Initialize Config
├── Customer Management
│   ├── Create Customer Sheet
│   ├── View Customer Registry
│   └── Check for Updates Needed
├── Initialize All Configs
├── View Execution Log
└── Clear Execution Log
```

## Files

- `Main.js` - Unified menu and entry point
- `ObservePointClient.js` - API client (shared)
- `SheetHelpers.js` - Sheet operations (shared)
- `Logger.js` - Logging system (shared)
- `ConfigManager.js` - Configuration management (shared)
- `GridImporter.js` - Grid API Importer tool
- `WebhookHandler.js` - Webhook automation core
- `AuditHelpers.js` - Audit API helpers
- `AutomatedSetup.js` - Setup wizard
- `DialogTemplates.js` - UI dialogs
- `ReportCreation.js` - Report processing
- `WizardDialogs.js` - Setup wizard dialogs
- `appsscript.json` - Apps Script manifest
