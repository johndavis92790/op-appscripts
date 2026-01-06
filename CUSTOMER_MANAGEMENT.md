# Customer Sheet Management System

## Overview

The ObservePoint Toolbelt now includes an automated customer sheet management system that helps you:
- Create new customer sheets with the library pre-configured
- Track all customer sheets in a registry
- Monitor which sheets need library updates
- Manage customer deployments efficiently

## How Library Updates Work

### Important: Updates Are NOT Automatic

When you deploy a new version of the library:

1. **You create new version**: `./scripts/update-library.sh "New features"`
2. **New version is available**: Version 2, 3, etc.
3. **Customer sheets stay on their current version** - This is intentional!
4. **Customers must manually upgrade** to new versions

**Why this is good:**
- ✅ Prevents breaking changes from affecting customers unexpectedly
- ✅ Customers can test updates before applying
- ✅ You can support multiple versions simultaneously
- ✅ Customers control when they upgrade

### Customer Upgrade Process

Customers upgrade by:
1. Extensions > Apps Script
2. Click on **ObservePointToolbelt** library
3. Select new version from dropdown (e.g., version 2)
4. Click **Save**
5. Refresh their Google Sheet

## Creating Customer Sheets

### Using the Menu (Recommended)

1. **In your master sheet**, click:
   - **ObservePoint Tools** > **Customer Management** > **Create Customer Sheet**

2. **Fill in the dialog**:
   - Customer Name (required)
   - Customer Email (optional - will auto-share)
   - Notes (optional)

3. **Click Create Sheet**

4. **Manual setup required** (see below)

### What Gets Created

- ✅ New Google Sheet with customer's name
- ✅ Entry in Customer_Sheet_Registry
- ✅ Tracking of library version
- ✅ Auto-shared with customer email (if provided)
- ⚠️ Library and wrapper code must be added manually

### Manual Setup Steps

After creating the sheet, you need to:

1. **Open the new sheet** (link provided in success dialog)

2. **Add the library**:
   - Extensions > Apps Script
   - Click **Libraries** (+ icon)
   - Paste Script ID: `1v4DTpf5lRrNk1g4V4P9k1QYpfRMTolkHXP5BENkD36gzt1dF8XjuFjcS`
   - Click **Look up**
   - Select version **1** (or latest)
   - Set Identifier: `ObservePointToolbelt`
   - Click **Add**

3. **Add wrapper code**:
   - Copy from `/customer-template/Code.js`
   - Paste into the Apps Script editor
   - Click **Save**

4. **Test**:
   - Close Apps Script editor
   - Refresh the Google Sheet
   - "ObservePoint Tools" menu should appear

## Customer Sheet Registry

### Viewing the Registry

Click: **ObservePoint Tools** > **Customer Management** > **View Customer Registry**

The registry tracks:
- **Created Date**: When the sheet was created
- **Customer Name**: Name of the customer
- **Spreadsheet ID**: Unique ID of the sheet
- **Spreadsheet URL**: Direct link to the sheet
- **Customer Email**: Contact email
- **Library Version**: Which version they're using
- **Last Updated**: Last modification date
- **Notes**: Any additional notes
- **Script ID**: Apps Script project ID

### Registry Benefits

- 📋 Central tracking of all customer sheets
- 🔍 Easy to find customer sheets
- 📊 Version tracking for updates
- 📧 Contact information readily available
- 📝 Notes for special configurations

## Managing Library Updates

### Checking for Outdated Sheets

1. Click: **ObservePoint Tools** > **Customer Management** > **Check for Updates Needed**

2. See which customers are on old versions

3. Contact customers to upgrade

### Update Workflow

```bash
# 1. Make changes to library
cd src
vim GridImporter.js

# 2. Test changes
clasp push
clasp open

# 3. Deploy new version
./scripts/update-library.sh "Bug fixes and new features"

# 4. Check which customers need updates
# In master sheet: Customer Management > Check for Updates Needed

# 5. Notify customers
# Email or call customers with upgrade instructions
```

### Customer Notification Template

```
Subject: ObservePoint Toolbelt Update Available

Hi [Customer Name],

A new version of the ObservePoint Toolbelt is available with the following improvements:
- [List of changes]

To upgrade:
1. Open your ObservePoint Tools sheet
2. Extensions > Apps Script
3. Click on "ObservePointToolbelt" library
4. Select version [X] from the dropdown
5. Click Save
6. Refresh your sheet

Let me know if you have any questions!
```

## Limitations & Workarounds

### Limitation 1: Manual Library Setup

**Issue**: Apps Script API doesn't allow programmatic library addition from another script.

**Workaround**: 
- Create sheet automatically
- Provide clear instructions for manual setup
- Consider creating a video walkthrough

### Limitation 2: No Forced Updates

**Issue**: Can't force customers to update to new versions.

**Workaround**:
- Track versions in registry
- Proactively notify customers
- Maintain backward compatibility when possible

### Limitation 3: Script ID Access

**Issue**: Can't programmatically get script ID of newly created sheets.

**Workaround**:
- Manual entry in registry if needed
- Use spreadsheet ID for tracking

## Advanced: Automated Setup (Future)

### Using Apps Script API

If you enable the Apps Script API and set up OAuth:

```javascript
// This would require Apps Script API setup
function fullyAutomatedSetup(spreadsheetId) {
  // 1. Get script ID via API
  // 2. Add library via API
  // 3. Add wrapper code via API
  // 4. No manual steps needed
}
```

**Requirements**:
- Apps Script API enabled
- OAuth credentials configured
- Service account setup
- More complex but fully automated

## Best Practices

### For Creating Sheets

1. ✅ Use descriptive customer names
2. ✅ Include customer email for auto-sharing
3. ✅ Add notes about special configurations
4. ✅ Test the new sheet before sharing
5. ✅ Provide setup instructions to customer

### For Managing Updates

1. ✅ Test updates in master sheet first
2. ✅ Document changes in deployment description
3. ✅ Check registry before deploying
4. ✅ Notify affected customers
5. ✅ Maintain changelog

### For Customer Support

1. ✅ Keep registry up to date
2. ✅ Document customer-specific customizations
3. ✅ Track which customers are active
4. ✅ Regular check-ins on library versions
5. ✅ Provide upgrade support

## Troubleshooting

### "Create Customer Sheet" not working

- Check you have permission to create sheets
- Verify you're in the master sheet
- Check execution logs for errors

### Customer can't see the menu

- Verify library was added correctly
- Check wrapper code is in place
- Ensure they refreshed the sheet
- Verify library version is selected

### Registry not updating

- Check Customer_Sheet_Registry sheet exists
- Verify permissions on the sheet
- Check execution logs

### Customer on wrong version

- Use "Check for Updates Needed" to identify
- Contact customer with upgrade instructions
- Update registry manually if needed

## FAQ

**Q: Can I force all customers to update?**  
A: No, and you shouldn't. Customers control their version to prevent breaking changes.

**Q: How do I know which customers need updates?**  
A: Use "Check for Updates Needed" in the Customer Management menu.

**Q: Can I customize the library per customer?**  
A: Not with the library approach. Consider creating separate deployments for heavy customization.

**Q: What if a customer wants to stay on an old version?**  
A: That's fine! Support multiple versions and document any breaking changes.

**Q: Can I automate the entire setup?**  
A: Partially. Sheet creation is automated, but library setup requires manual steps or Apps Script API.

**Q: How do I track customer usage?**  
A: Use the registry and consider adding usage logging to the library.

## Summary

The customer management system provides:
- ✅ Automated sheet creation
- ✅ Centralized tracking
- ✅ Version management
- ✅ Update notifications
- ⚠️ Manual library setup required

This gives you a professional way to manage customer deployments while maintaining control over updates and versions.
