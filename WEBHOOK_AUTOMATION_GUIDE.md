# WebhookHandler - Automated Broken External Links Detection

## Overview

The WebhookHandler automates the detection of broken external links on your website by orchestrating two ObservePoint audits through webhook triggers. When your primary audit completes, it automatically extracts all external links, tests them with a secondary audit, and produces a comprehensive report showing which pages contain broken external links.

## How It Works

### Two-Stage Automated Workflow

#### Stage 1: Primary Audit Webhook (`?stage=primary`)
1. **Triggered**: When your primary website audit completes in ObservePoint
2. **Fetches**: Primary saved report containing all external links found on your pages
3. **Processes**: Deduplicates the `LINK_URL` column to create a unique list of external URLs
4. **Updates**: Secondary audit configuration with the unique URLs as scan targets
5. **Triggers**: Runs the secondary audit to test all external links

#### Stage 2: Secondary Audit Webhook (`?stage=secondary`)
1. **Triggered**: When the secondary audit completes
2. **Fetches**: Broken links report (filtered to status codes ≥400, excluding 403/429)
3. **Joins**: Broken links data with primary report data on Link URL
4. **Produces**: Final report showing source page, broken link URL, status code, and HTML element details

### Data Flow
```
Primary Audit (your website)
    ↓ webhook
Primary Report (all external links)
    ↓ deduplicate
Unique URLs List
    ↓ update & trigger
Secondary Audit (test external URLs)
    ↓ webhook
Broken Links Report
    ↓ join with Primary Report
Final Report (broken links + source pages)
```

## Setup Instructions

### Step 1: Initialize Configuration

1. Open your Google Sheet
2. Go to menu: **ObservePoint Tools > Webhook Automation > Initialize Config**
3. This creates two sheets:
   - `Config` - Your configuration settings
   - `Setup_Instructions` - Detailed setup guide

### Step 2: Configure API and Report Settings

In the `Config` sheet, fill in these values:

| Setting | Description | Example |
|---------|-------------|---------|
| `OP_API_KEY` | Your ObservePoint API key from [My Profile](https://app.observepoint.com/my-profile) | `abc123...` |
| `PRIMARY_REPORT_ID` | Saved report ID showing external links from your pages | `16008` |
| `BROKEN_REPORT_ID` | Saved report ID showing broken links (status ≥400) | `16009` |
| `SECONDARY_AUDIT_ID` | Audit ID that will test the external URLs | `2018768` |

### Step 3: Set Up ObservePoint Primary Audit

1. **Create or identify** your primary audit in ObservePoint
2. This audit should:
   - Crawl your website pages
   - Collect all links on each page
   - **Note**: Does NOT need to test external links - just collect them

### Step 4: Create Primary Report (External Links Report)

1. In ObservePoint: **Reports > Grid Reports > Create New**
2. Select **Links** report type
3. Add filters:
   - `IS_MOST_RECENT_PAGE_SCAN = 1`
   - `IS_EXTERNAL = 1` (or filter to show only external links)
4. Include these columns:
   - `LINK_URL` (required)
   - `FINAL_PAGE_URL` (source page)
   - `LINK_TEXT`
   - `LINK_OUTER_HTML`
5. **Save** the report and note the Report ID from the URL
6. Update `PRIMARY_REPORT_ID` in Config sheet

### Step 5: Set Up ObservePoint Secondary Audit

1. **Create a new audit** in ObservePoint
2. Configure as:
   - Type: Simple URL list audit (not a crawler)
   - Starting URLs: Add a placeholder like `https://example.com`
   - The script will automatically update these URLs before each run
3. Note the Audit ID from the URL when viewing the audit
4. Update `SECONDARY_AUDIT_ID` in Config sheet

### Step 6: Create Broken Links Report

1. In ObservePoint: **Reports > Grid Reports > Create New**
2. Select **Pages** report type (or appropriate grid type)
3. Add filters:
   - `FINAL_PAGE_STATUS_CODE >= 400` (or similar status code column)
   - `IS_MOST_RECENT_PAGE_SCAN = 1`
   - Optionally exclude: `FINAL_PAGE_STATUS_CODE != 403 AND != 429`
4. Include these columns:
   - `INITIAL_PAGE_URL` (required - matches with LINK_URL from primary)
   - `FINAL_PAGE_URL`
   - `FINAL_PAGE_STATUS_CODE`
5. **Save** the report and note the Report ID
6. Update `BROKEN_REPORT_ID` in Config sheet

### Step 7: Deploy Apps Script as Web App

1. In your Google Sheet: **Extensions > Apps Script**
2. Click **Deploy > New deployment**
3. Click the gear icon ⚙️ and select **Web app**
4. Configure:
   - **Description**: `ObservePoint Broken Links Webhook`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone`
5. Click **Deploy**
6. **Authorize** the script when prompted
7. **Copy the Web App URL** - you'll need this for webhooks

### Step 8: Configure Primary Audit Webhook

1. In ObservePoint, go to your **primary audit settings**
2. Navigate to **Webhooks** section
3. Add a new webhook:
   - **URL**: `YOUR_WEB_APP_URL?stage=primary`
   - **Trigger**: On audit completion
   - **Method**: POST
4. **Save** the webhook configuration

### Step 9: Configure Secondary Audit Webhook

1. In ObservePoint, go to your **secondary audit settings**
2. Navigate to **Webhooks** section
3. Add a new webhook:
   - **URL**: `YOUR_WEB_APP_URL?stage=secondary`
   - **Trigger**: On audit completion
   - **Method**: POST
4. **Save** the webhook configuration

### Step 10: Test the Setup

1. In your Google Sheet: **ObservePoint Tools > Webhook Automation > Setup Wizard**
2. This validates:
   - API key is correct
   - Reports are accessible and have correct columns
   - Secondary audit is accessible
3. Review the test results and fix any issues

### Step 11: Run End-to-End Test

1. **Run your primary audit** in ObservePoint
2. When it completes, the webhook should trigger automatically
3. Check the `Execution_Log` sheet for progress
4. Verify these sheets are populated:
   - `Primary_Report` - All external links from your pages
   - `Unique_Link_URLs` - Deduplicated list
   - `Broken_Links_Report` - Filtered broken links
   - `Final_Broken_Links` - Joined report with source page details

## Manual Testing (Without Webhooks)

You can test each stage manually without waiting for audit completion:

### Test Primary Stage
**Menu**: `ObservePoint Tools > Webhook Automation > Manual Run Primary`

This will:
- Fetch the primary report
- Extract unique URLs
- Update and trigger the secondary audit

### Test Secondary Stage
**Menu**: `ObservePoint Tools > Webhook Automation > Manual Run Secondary`

This will:
- Fetch the broken links report
- Join with primary report
- Create the final report

## Output Sheets

| Sheet Name | Description |
|------------|-------------|
| `Config` | Your API key and configuration settings |
| `Setup_Instructions` | Detailed setup guide (reference) |
| `Primary_Report` | All external links found on your website pages |
| `Unique_Link_URLs` | Deduplicated list of external URLs to test |
| `Broken_Links_Report` | External links that returned error status codes |
| `Final_Broken_Links` | Joined report showing which pages contain broken links |
| `Execution_Log` | Activity log with timestamps and status messages |

## Final Report Columns

The `Final_Broken_Links` sheet contains:

| Column | Description |
|--------|-------------|
| Source Page URL | The page on your site that contains the broken link |
| External Link URL | The external URL that was found on your page |
| External Link Text | The visible text of the link |
| External Link HTML | The full HTML element containing the link |
| External Link Destination URL | The final URL after redirects |
| External Link Status Code | HTTP status code (404, 500, etc.) |

## Troubleshooting

### Check Execution Log
The `Execution_Log` sheet shows detailed progress and error messages for each webhook execution.

### Common Issues

**"Config sheet not found"**
- Run: `ObservePoint Tools > Webhook Automation > Initialize Config`

**"API Key not set"**
- Add your API key to cell B2 in the Config sheet
- Get it from: https://app.observepoint.com/my-profile

**"Report has no data"**
- Ensure your primary audit has completed recently
- Check that your report filters are correct
- The script retries 10 times with 30-second delays

**"LINK_URL column not found"**
- Verify your primary report includes the `LINK_URL` column
- Check column names match exactly (case-sensitive)

**Webhook not triggering**
- Verify Web App URL is correct in ObservePoint webhooks
- Check that `?stage=primary` or `?stage=secondary` is appended
- Ensure Web App is deployed with "Who has access: Anyone"
- Check Apps Script execution logs: Extensions > Apps Script > Executions

### View Apps Script Logs
1. **Extensions > Apps Script**
2. Click **Executions** in left sidebar
3. View detailed execution logs and errors

## Using with Customer Sheets (Library Mode)

If you're using the ObservePoint Toolbelt as a **library** in a customer sheet (rather than copying the code directly):

### Important: doPost() Wrapper Required

The customer sheet's `Code.js` file **must** include this wrapper function with lock handling:

```javascript
/**
 * Webhook handler with lock protection
 * Lock is handled here (not in library) to prevent cross-customer conflicts
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  
  try {
    // Try to acquire lock for 30 seconds
    var hasLock = lock.tryLock(30000);
    
    if (!hasLock) {
      // Another webhook is processing, return early
      return ContentService.createTextOutput('Processing in progress, skipped duplicate')
        .setMimeType(ContentService.MimeType.TEXT);
    }
    
    // Call library function with lock held
    return ObservePointTools.doPost(e);
    
  } catch (err) {
    Logger.log('Webhook error: ' + err.message);
    return ContentService.createTextOutput('Error: ' + err.message)
      .setMimeType(ContentService.MimeType.TEXT);
      
  } finally {
    // Always release lock
    if (lock) {
      lock.releaseLock();
    }
  }
}
```

**Why the lock is in the wrapper (not the library):**
- If the lock were in the library, all customer sheets would share the same lock
- This would cause webhooks from different customers to block each other
- By handling the lock in each customer sheet, each customer has independent concurrency control

This wrapper is **automatically included** in the customer template generated by the library, but if you're setting up a customer sheet manually, you must add this function.

### Deployment Steps for Customer Sheets

1. **Add the library** to your customer sheet:
   - Extensions > Apps Script
   - Click + next to Libraries
   - Enter Script ID: `1v4DTpf5lRrNk1g4V4P9k1QYpfRMTolkHXP5BENkD36gzt1dF8XjuFjcS`
   - Identifier: `ObservePointTools`

2. **Ensure doPost() wrapper exists** in your Code.js (see above)

3. **Deploy as Web App**:
   - Deploy > New deployment
   - Type: Web app
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy and copy the Web App URL

4. **Configure webhooks** in ObservePoint with the Web App URL

5. **Initialize config** using the menu: `ObservePoint Tools > Webhook Automation > Initialize Config`

## Copying to a New Customer

To set up this workflow for a new customer:

1. **Make a copy** of the entire Google Sheet
2. **Update Config sheet** with new customer values:
   - New API key
   - New report IDs
   - New audit ID
3. **Create new reports and audits** in the customer's ObservePoint account
4. **Deploy as a new Web App**:
   - Extensions > Apps Script > Deploy > New deployment
   - Copy the new Web App URL
5. **Configure webhooks** in the customer's ObservePoint account with the new URL
6. **Test** using the Setup Wizard

## Technical Details

### API Endpoints Used

- **Grid API v3**: Fetch saved report data
  - `GET /v3/reports/grid/saved/{reportId}` - Get report definition
  - `POST /v3/reports/grid/{entityType}` - Fetch report data

- **Audits API v2**: Update and run secondary audit
  - `GET /v2/web-audits/{auditId}` - Get audit configuration
  - `PUT /v2/web-audits/{auditId}` - Update audit with new URLs
  - `POST /v2/web-audits/{auditId}/runs` - Trigger audit run

### Retry Logic
- Report fetching retries up to 10 times with 30-second delays
- Handles cases where reports need time to generate after audit completion

### Concurrency Protection
- Uses `LockService` to prevent duplicate webhook processing
- Ensures only one webhook per stage processes at a time

### Key Functions

| Function | Purpose |
|----------|---------|
| `doPostHandler(e)` | Main webhook entry point (routes to primary or secondary) |
| `handlePrimaryAuditComplete()` | Processes primary stage workflow |
| `handleSecondaryAuditComplete()` | Processes secondary stage workflow |
| `webhooks_initConfig()` | Creates Config and Setup_Instructions sheets |
| `testSetup()` | Validates configuration and API access |
| `webhooks_manualRunPrimary()` | Manual trigger for primary stage |
| `webhooks_manualRunSecondary()` | Manual trigger for secondary stage |

## Support

For issues or questions:
1. Check the `Execution_Log` sheet for error messages
2. Run the Setup Wizard to validate configuration
3. Review the `Setup_Instructions` sheet in your Google Sheet
4. Check Apps Script execution logs for detailed errors
