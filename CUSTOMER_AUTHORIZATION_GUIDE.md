# Customer Authorization Guide

## Understanding the Authorization Screen

When your customers first use the ObservePoint Tools, they'll see a Google authorization screen. This is **normal and expected** for all Google Apps Script applications.

## Why It Looks Scary (And How to Fix It)

### Issue 1: "Untitled project"

**Problem**: The app shows as "Untitled project" instead of "ObservePoint Tools"

**Fix**: Rename the Apps Script project:
1. Open the Apps Script editor (in your master sheet)
2. Click on "Untitled project" at the top
3. Rename to: **"ObservePoint CSM Toolbelt"**
4. This name will show in customer authorization screens

### Issue 2: "Google hasn't verified this app"

**Problem**: Big red warning because the app isn't verified by Google

**Why This Happens**: 
- Apps Script projects are unverified by default
- Google verification requires a formal review process
- Only needed for apps used by 100+ users or published publicly

**Options**:

#### Option A: Keep Unverified (Easiest)
- **Pros**: No setup needed, works immediately
- **Cons**: Scary warning screen
- **Best for**: Internal tools, trusted customers, small user base

**Customer Instructions**:
1. Click "Advanced" (or "Hide Advanced")
2. Click "Go to ObservePoint CSM Toolbelt (unsafe)"
3. Click "Allow"

#### Option B: Verify the App (Professional, but complex)
- **Pros**: No warning screen, looks professional
- **Cons**: Requires OAuth verification process, takes time
- **Best for**: Large customer base, public distribution

**Requirements**:
- Google Cloud Project with OAuth consent screen configured
- Privacy policy and terms of service URLs
- Google verification review (can take weeks)
- Annual re-verification

**Process**: See [Google's OAuth Verification Guide](https://support.google.com/cloud/answer/9110914)

#### Option C: Use Internal Deployment (Recommended for CSM)
- **Pros**: No verification needed, no scary warnings
- **Cons**: Only works within your Google Workspace domain
- **Best for**: Internal team tools

**Setup**:
1. Deploy as "Internal" instead of "Anyone"
2. Only users in your domain can access
3. No verification warnings

## Required Permissions Explained

The app requests these permissions:

### 1. ✅ **See, edit, create, and delete all your Google Sheets spreadsheets**
```
https://www.googleapis.com/auth/spreadsheets
```

**Why needed**: 
- Read/write data to sheets
- Create new sheets for imports
- Format cells and headers

**Can remove?**: ❌ No - Core functionality

**Customer concern**: "Can it access ALL my sheets?"
**Answer**: Yes, but the code only touches the specific sheet they're using. This is a Google limitation - can't request access to just one sheet.

### 2. ✅ **Connect to an external service**
```
https://www.googleapis.com/auth/script.external_request
```

**Why needed**:
- Call ObservePoint API
- Fetch report data
- Send webhook requests

**Can remove?**: ❌ No - Required for API calls

**Customer concern**: "What external services?"
**Answer**: Only ObservePoint's API (api.observepoint.com)

### 3. ✅ **Display and run third-party web content in prompts and sidebars**
```
https://www.googleapis.com/auth/script.container.ui
```

**Why needed**:
- Show configuration dialogs
- Display setup wizards
- Show success/error messages

**Can remove?**: ⚠️ Maybe - If you remove all HTML dialogs and use basic alerts

**Customer concern**: "What third-party content?"
**Answer**: Just the tool's own dialogs - no external content

### 4. ✅ **Send email as you**
```
https://www.googleapis.com/auth/script.send_mail
```

**Why needed**:
- Send setup instructions to new customers
- Email notifications (if implemented)

**Can remove?**: ✅ Yes - If you remove email functionality

**Customer concern**: "Will it send emails without my permission?"
**Answer**: Only when explicitly triggered by the create customer sheet function

## Reducing Permissions

If you want to make it less scary, you can remove the email permission:

### Remove Email Functionality

**In `appsscript.json`**, remove this line:
```json
"https://www.googleapis.com/auth/script.send_mail"
```

**In `CustomerSheetManager.js`**, comment out email sending:
```javascript
// Send setup email if customer email provided
// if (customerEmail) {
//   try {
//     sendSetupEmail(customerEmail, customerName, spreadsheetUrl);
//   } catch (e) {
//     Logger.error('email_failed', 'Could not send email: ' + e.toString());
//   }
// }
```

**Result**: 
- ✅ One less permission to authorize
- ❌ No automatic setup emails (you send manually)

## Customer-Facing Authorization Instructions

### What to Tell Customers

**Email Template**:

```
Subject: ObservePoint Tools - First Time Setup

Hi [Customer],

When you first use the ObservePoint Tools, Google will ask you to authorize the app. This is normal and secure.

You'll see a warning that says "Google hasn't verified this app" - this is expected for internal tools. Here's how to proceed safely:

1. Click "Advanced" at the bottom
2. Click "Go to ObservePoint CSM Toolbelt (unsafe)"
3. Review the permissions:
   - Access to Google Sheets (to read/write your data)
   - Connect to ObservePoint API (to fetch reports)
   - Show dialogs (for configuration)
4. Click "Allow"

You only need to do this once. After authorization, the tools will work normally.

The permissions are necessary for the tools to:
- Import report data into your sheet
- Create new sheets for each import
- Show configuration dialogs
- Call ObservePoint's API

Questions? Reply to this email.
```

### In-Sheet Instructions

Add this to your setup email or documentation:

**"Why am I seeing a security warning?"**

Google shows this warning for all custom Apps Script tools that aren't formally verified. Verification is only required for public apps with 100+ users.

This tool is safe because:
- ✅ Created by your ObservePoint CSM team
- ✅ Code is transparent (you can view it in Apps Script editor)
- ✅ Only accesses ObservePoint API and your sheet
- ✅ Doesn't store or share your data

**"What permissions does it need?"**

- **Google Sheets**: Read/write data in your sheet
- **External requests**: Call ObservePoint API
- **UI dialogs**: Show setup wizards and messages

**"Is this safe?"**

Yes. The tool:
- Only runs when you trigger it
- Only accesses the sheet you're using
- Only calls ObservePoint's API
- Doesn't access other Google services
- Doesn't share data with third parties

## Best Practices

### For You (CSM)

1. **Rename the project** to "ObservePoint CSM Toolbelt"
2. **Prepare customers** with authorization instructions before sharing
3. **Be available** for questions during first authorization
4. **Consider verification** if you have 50+ customers using this

### For Customers

1. **Review permissions** before authorizing
2. **Verify the developer email** matches your CSM
3. **Ask questions** if anything seems unusual
4. **Revoke access** anytime in Google Account settings if needed

## Revoking Access

Customers can revoke access anytime:

1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find "ObservePoint CSM Toolbelt"
3. Click "Remove Access"

The tools will stop working until they re-authorize.

## Summary

**The scary warnings are normal** for unverified Apps Script tools.

**To reduce fear**:
1. ✅ Rename project to "ObservePoint CSM Toolbelt"
2. ✅ Prepare customers with clear instructions
3. ✅ Explain why each permission is needed
4. ✅ Remove email permission if not needed
5. ⚠️ Consider Google verification for large deployments

**All permissions are necessary** except email sending (optional).

**The tool is safe** - it only does what the code says, and customers can review the code.
