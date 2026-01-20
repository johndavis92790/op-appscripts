# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024-12-23

### Added
- **Shared Library System**
  - `ObservePointClient.js` - API client with retry logic and rate limiting
  - `SheetHelpers.js` - Sheet operations (write, format, join, filter)
  - `Logger.js` - Consistent logging across all tools
  - `ConfigManager.js` - Configuration management utilities

- **Development Tools**
  - `npm run new-tool` - Scaffold new tools from template
  - `npm run deploy` - Deploy specific tool to Apps Script
  - `npm run deploy-all` - Deploy all tools at once
  - `npm run push-lib` - Copy shared libraries to all tools
  - `npm run list-tools` - List all tools and their status

- **Tool Template**
  - Basic tool template with shared library integration
  - Includes Main.js, appsscript.json, README.md
  - Pre-configured with menu, config, and logging

- **Documentation**
  - PROJECT_CONTEXT.md - Architecture and principles
  - API_PATTERNS.md - ObservePoint API examples
  - TOOL_CHECKLIST.md - New tool requirements
  - DEVELOPMENT_GUIDE.md - Daily workflows and patterns
  - CLASP_SETUP.md - Complete clasp setup guide

- **Tools**
  - Grid API Importer - Import large reports (350k+ rows)
  - Webhook Automation - Broken links detection workflow

### Changed
- Reorganized project structure into `/lib`, `/tools`, `/templates`, `/scripts`
- Moved existing tools to `/tools` directory
- Renamed all `.gs` files to `.js` for better IDE support
- Updated all documentation with new structure

### Infrastructure
- Set up clasp configuration for multi-project deployment
- Created `.claspignore` and `.gitignore` files
- Added `package.json` with npm scripts
- Created automation scripts for common tasks

## Future Enhancements

### Planned Features
- Automated testing framework
- CI/CD with GitHub Actions
- Additional shared components (UI dialogs, wizards)
- ObservePoint API mock for local testing
- Tool marketplace/catalog
- Performance monitoring
- Usage analytics

### Under Consideration
- Library versioning strategy
- Breaking change management
- Tool dependency tracking
- Customer-facing documentation site

## Version 2 - 2025-12-23 14:38
Fixed library identifier to ObservePointTools, removed email functionality, simplified customer sheet creation

## Version 3 - 2025-12-23 14:45
Fixed Grid Importer dialog hanging issue by separating config save and import trigger

## Version 4 - 2026-01-06 10:34
Initial version

## Version 5 - 2026-01-06 10:54
Project cleanup: removed 8 obsolete files, updated documentation to reflect unified library architecture

## Version 6 - 2026-01-06 11:36
Menu sync: customer template now auto-generates from Main.js menu structure to ensure menus stay in sync

## Version 7 - 2026-01-06 11:53
Exclude Customer Management submenu from customer template - internal tool only

## Version 8 - 2026-01-06 11:57
Add live progress dialog to Grid Importer - shows real-time import status after Save & Import

## Version 9 - 2026-01-06 12:15
Fix DIALOG_STYLES reference error - convert constant to function for customer sheet compatibility

## Version 10 - 2026-01-06 12:20
Fix gridImporter_initConfig - add missing LOG_SHEET_NAME constant

## Version 11 - 2026-01-06 12:23
Fix eternal spinner - show progress dialog from client-side after config saves

## Version 12 - 2026-01-06 12:26
Remove progress dialog from callback - let import run in background and show completion dialog

## Version 13 - 2026-01-06 12:28
Fix getUi() error - show error message instead of dialog when config missing

## Version 14 - 2026-01-06 12:30
Show config dialog when missing, with graceful fallback for non-UI contexts

## Version 15 - 2026-01-06 12:37
Simplify Grid Importer to single menu option - always shows config dialog with prefilled values

## Version 16 - 2026-01-06 12:42
Remove all UI calls from import execution - fixes eternal spinner issue

## Version 17 - 2026-01-06 12:45
Remove remaining updateImportProgress calls from fetchAllData function

## Version 18 - 2026-01-06 12:50
Fix getUi() error - customer wrapper now shows dialog using its own UI context

## Version 19 - 2026-01-06 12:57
Fix Grid Importer dialog - customer wrapper shows dialog from customer context

## Version 20 - 2026-01-06 13:00
Fix dialog callback - remove ObservePointTools prefix and add customer wrapper

## Version  - 2026-01-06 14:23
Simplified Grid Importer - separate menu items for config and import, no dialogs

## Version  - 2026-01-06 14:46
Ensure menu structure stays in sync - added dynamic wrapper generation

## Version  - 2026-01-06 14:52
Test auto-generation of customer template before deployment

## Version  - 2026-01-06 15:15
Added Sitemap Monitor tool for tracking new pages in sitemaps

## Version  - 2026-01-06 15:23
Added Sitemap Monitor tool for tracking new pages in sitemaps

## Version 30 - 2026-01-06 15:27
Added Sitemap Monitor tool for tracking new pages in sitemaps

## Version 31 - 2026-01-06 15:35
Fix API error: include required id and name fields in audit update

## Version 32 - 2026-01-06 15:38
Fix API error: add required domainId field to audit update

## Version 33 - 2026-01-06 15:42
Fix audit update: preserve all audit fields, only modify startingUrls

## Version 34 - 2026-01-06 15:48
Fix Sitemap Monitor: correct parameter order and remove read-only audit fields

## Version 35 - 2026-01-06 15:53
Fix audit run endpoint: use /runs instead of /run

## Version 36 - 2026-01-06 16:04
Sitemap Monitor: replace all audit URLs with sitemap URLs, exclude sitemap URL itself

## Version 37 - 2026-01-06 16:11
Fixed missing generateCustomerWrapperCode function - customer sheet creation now works and dynamically syncs with menu structure

## Version 38 - 2026-01-06 16:39
Sitemap Monitor: only audit new/updated URLs, skip if no changes

## Version 39 - 2026-01-06 16:44
Fix lastmod comparison: normalize to strings to prevent false 'updated' status

## Version 40 - 2026-01-06 16:55
Added doPost() function for webhook support in customer sheets

## Version 41 - 2026-01-06 17:10
Description of changes

## Version 42 - 2026-01-14 14:49
Remove secondary audit trigger from primary webhook, add 30s delay before Grid API fetch

## Version 43 - 2026-01-20 09:04
Fixed pagination bug - removed page limit to fetch all report rows

## Version 44 - 2026-01-20 09:10
Added pagination logging to debug row fetch issue

## Version 45 - 2026-01-20 09:11
Added pagination object debug logging

## Version 46 - 2026-01-20 09:12
Fixed pagination - use totalPageCount instead of totalPages
