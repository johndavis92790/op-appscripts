# Repository Structure

## Clean Unified Library Architecture

This repository contains a single Apps Script library that can be used in any Google Sheet.

## Directory Layout

```
op-appscripts/
├── src/                          # Library source code (deployed to Apps Script)
│   ├── Main.js                   # Menu and entry points for all tools
│   ├── GridImporter.js           # Grid API Importer tool
│   ├── GridImporterDialogs.js    # Interactive dialogs for Grid Importer
│   ├── WebhookHandler.js         # Webhook Automation tool
│   ├── AutomatedSetup.js         # Setup wizard for webhooks
│   ├── AuditHelpers.js           # Audit API helpers
│   ├── ReportCreation.js         # Report processing
│   ├── WizardDialogs.js          # Setup wizard dialogs
│   ├── DialogTemplates.js        # Shared UI components and styles
│   ├── ObservePointClient.js     # Shared API client
│   ├── SheetHelpers.js           # Shared sheet utilities
│   ├── Logger.js                 # Shared logging system
│   ├── ConfigManager.js          # Shared configuration management
│   ├── appsscript.json           # Apps Script manifest
│   └── .clasp.json               # clasp configuration (gitignored)
│
├── customer-template/            # Template for customer sheets
│   ├── Code.js                   # Wrapper code to call library
│   └── appsscript.json           # Manifest with library reference
│
├── scripts/                      # Development scripts
│   ├── update-library.sh         # Update and deploy library
│   └── generate-customer-template.sh  # Auto-generate customer wrapper code
│
├── .cascade/                     # AI assistant documentation
│   ├── PROJECT_CONTEXT.md        # Project architecture
│   ├── API_PATTERNS.md           # ObservePoint API examples
│   ├── TOOL_CHECKLIST.md         # New tool requirements
│   └── DIALOG_PATTERN.md         # Interactive dialog pattern
│
├── README.md                     # Main documentation
├── LIBRARY_USAGE.md              # How to use the library
├── CLASP_SETUP.md                # clasp setup guide
├── DEVELOPMENT_GUIDE.md          # Development patterns
├── CHANGELOG.md                  # Version history
├── package.json                  # npm configuration
└── .gitignore                    # Git ignore rules
```

## What Was Removed

The following were removed as they're no longer needed for the unified library approach:

- `/tools/` - Individual tool directories (consolidated into `/src`)
- `/lib/` - Separate shared library directory (now in `/src`)
- `/templates/` - Tool scaffolding templates (not needed for library)
- Old deployment scripts (replaced with `update-library.sh`)
- Root `.claspignore` (only needed in `/src`)

## Single Source of Truth

**`/src/` is the only directory that gets deployed to Apps Script.**

Everything in `/src` becomes part of the library that customer sheets can reference.

## Library Information

- **Script ID**: `1v4DTpf5lRrNk1g4V4P9k1QYpfRMTolkHXP5BENkD36gzt1dF8XjuFjcS`
- **Library Name**: `ObservePointTools`
- **Current Version**: See CHANGELOG.md

## Development Workflow

### Making Changes

```bash
cd src
vim GridImporter.js
clasp push
clasp open  # Test in master sheet
```

### Deploying Updates

```bash
./scripts/update-library.sh "Description of changes"
```

This automatically:
- Pushes code to Apps Script
- Creates new deployment version
- Generates updated customer template
- Updates CHANGELOG.md

### Adding New Tools

1. Create new tool file in `/src` (e.g., `NewTool.js`)
2. Create dialog file in `/src` (e.g., `NewToolDialogs.js`)
3. Add menu items to `Main.js`
4. Test with `clasp push` and `clasp open`
5. Deploy new version

## Customer Usage

Customers add the library to their Google Sheets:

1. Extensions > Apps Script
2. Add Library with Script ID
3. Copy wrapper code from `/customer-template/Code.js`
4. Save and refresh sheet
5. Use "ObservePoint Tools" menu

Each customer sheet has:
- Their own configuration (in sheets)
- Their own data (imported reports, logs)
- Their own permissions
- Reference to the shared library code

## Benefits of This Structure

✅ **Clean**: No duplicate files or old tool directories  
✅ **Simple**: One source directory (`/src`)  
✅ **Maintainable**: Update once, deploy once  
✅ **Scalable**: Add new tools easily  
✅ **Professional**: Proper library architecture  

## Version Control

- All source code in `/src` is tracked by git
- `.clasp.json` is gitignored (contains script ID)
- Customer sheets are not in this repo
- Library deployments are versioned in Apps Script

## Documentation

- **For Users**: See `LIBRARY_USAGE.md`
- **For Developers**: See `DEVELOPMENT_GUIDE.md`
- **For AI Assistants**: See `.cascade/` directory
