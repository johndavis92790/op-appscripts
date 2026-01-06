# Setting Up clasp for GitHub-Based Apps Script Development

This guide shows you how to use **clasp** (Command Line Apps Script Projects) to sync your local files directly to Google Apps Script, eliminating copy-paste workflow.

## What is clasp?

clasp is Google's official CLI tool that lets you:
- Push local `.js` files directly to Apps Script projects
- Pull changes from Apps Script back to local files
- Use GitHub as your single source of truth
- Develop with your preferred IDE (Windsurf, VS Code, etc.)

## Installation

### 1. Install clasp globally via npm

```bash
npm install -g @google/clasp
```

### 2. Login to Google Account

```bash
clasp login
```

This opens a browser window to authorize clasp with your Google account.

## Workflow Overview

```
Local Files (Windsurf) → clasp push → Apps Script Project → Google Sheets
       ↑                                                          ↓
       └──────────────── clasp pull ←──────────────────────────────┘

GitHub ← git push ← Local Files (source of truth)
```

## Setting Up Each Project

### For grid-api-importer

1. **Create Apps Script project in Google Sheets**
   - Create new Google Sheets spreadsheet
   - Extensions > Apps Script
   - Note the Script ID from URL: `https://script.google.com/.../.../edit?mid=PROJECT_ID`

2. **Initialize clasp in project folder**
   ```bash
   cd grid-api-importer
   clasp create --type sheets --title "ObservePoint Grid Importer" --rootDir .
   ```
   
   Or if project already exists:
   ```bash
   cd grid-api-importer
   clasp clone YOUR_SCRIPT_ID
   ```

3. **Push files to Apps Script**
   ```bash
   clasp push
   ```

4. **Open in browser to verify**
   ```bash
   clasp open
   ```

### For webhook-automation

Same steps as above, but:
```bash
cd webhook-automation
clasp create --type sheets --title "ObservePoint Webhook Automation" --rootDir .
# or
clasp clone YOUR_SCRIPT_ID
clasp push
```

## Daily Workflow

### Making Changes

1. **Edit files locally in Windsurf**
   ```bash
   # Edit GridImporter.js or any other file
   ```

2. **Push to Apps Script**
   ```bash
   cd grid-api-importer
   clasp push
   ```

3. **Commit to GitHub**
   ```bash
   git add .
   git commit -m "Updated import logic"
   git push origin main
   ```

### Pulling Changes

If you make changes in the Apps Script web editor:
```bash
clasp pull
```

## Project Configuration Files

### .clasp.json

Created automatically by `clasp create` or `clasp clone`. Contains:
```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "."
}
```

**Important**: Add `.clasp.json` to `.gitignore` if it contains sensitive script IDs, or commit it if you want to share the project setup.

### .claspignore

Tells clasp which files NOT to push to Apps Script:
```
**/**
!*.js
!appsscript.json
.git/**
node_modules/**
*.md
*.sh
```

### appsscript.json

Apps Script manifest file (created automatically):
```json
{
  "timeZone": "America/Los_Angeles",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

## GitHub Setup

### 1. Initialize Git Repository (if not already done)

```bash
cd /Users/johndavis/CascadeProjects/op-appscripts
git init
```

### 2. Create .gitignore

```
# clasp
.clasp.json

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Logs
*.log
```

### 3. Create GitHub Repository

```bash
git add .
git commit -m "Initial commit: ObservePoint Apps Script Library"
gh repo create op-appscripts --private --source=. --remote=origin
git push -u origin main
```

Or create manually on GitHub.com and:
```bash
git remote add origin https://github.com/YOUR_USERNAME/op-appscripts.git
git push -u origin main
```

## Common Commands

### Development
```bash
clasp push              # Push local files to Apps Script
clasp pull              # Pull Apps Script files to local
clasp open              # Open project in browser
clasp logs              # View execution logs
clasp deploy            # Create a versioned deployment
```

### Project Management
```bash
clasp list              # List all your Apps Script projects
clasp status            # Show which files will be pushed
clasp version           # Create a version
clasp versions          # List all versions
```

## File Naming: .js vs .gs

**Important**: clasp automatically converts:
- Local `.js` files → `.gs` files in Apps Script
- Apps Script `.gs` files → `.js` files when pulling

This means:
- ✅ Keep `.js` extension locally (better IDE support)
- ✅ clasp handles the conversion automatically
- ✅ Apps Script sees them as `.gs` files

## Benefits of This Workflow

1. **Single Source of Truth**: GitHub is your master repository
2. **No Copy-Paste**: Direct sync with `clasp push`
3. **Version Control**: Full Git history of all changes
4. **IDE Features**: Use Windsurf's JavaScript features (IntelliSense, refactoring, etc.)
5. **Collaboration**: Share code via GitHub, not Google Drive
6. **CI/CD Ready**: Can automate deployments with GitHub Actions

## Troubleshooting

### "User has not enabled the Apps Script API"
1. Go to https://script.google.com/home/usersettings
2. Enable "Google Apps Script API"

### "Push failed: Syntax error"
- Apps Script uses a subset of JavaScript
- Check for ES6+ features that might not be supported
- Use `clasp push --watch` to see errors immediately

### "Cannot find script"
- Verify `.clasp.json` has correct `scriptId`
- Run `clasp login` to re-authenticate

### Files not pushing
- Check `.claspignore` patterns
- Run `clasp status` to see what will be pushed

## Next Steps

1. Install clasp: `npm install -g @google/clasp`
2. Login: `clasp login`
3. For each project:
   - Create/clone Apps Script project
   - Push files with `clasp push`
4. Set up GitHub repository
5. Start developing with `clasp push` workflow

## Resources

- [clasp Documentation](https://github.com/google/clasp)
- [Apps Script API](https://developers.google.com/apps-script/api/quickstart/nodejs)
- [Apps Script Guides](https://developers.google.com/apps-script/guides/overview)
