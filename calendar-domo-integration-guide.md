# Google Calendar + Domo Integration Guide

## Overview
This guide walks you through building a Google Apps Script that:
1. Pulls events from Google Calendar
2. Pulls account data from Domo via API
3. Joins/matches them (e.g., by account name in event titles)
4. Writes the combined data to a Google Sheet for analysis

## Use Cases
- Track meeting frequency per account
- Identify accounts without upcoming meetings
- Generate reports on customer engagement
- Build dashboards showing meeting patterns

---

## Architecture

```
Google Calendar API
        ↓
    Apps Script  ←→  Domo API (datasets)
        ↓
   Google Sheet (output table)
```

### Data Flow
1. **Calendar Events**: Pull events from your primary calendar (or specific calendars) for a date range
2. **Domo Accounts**: Pull account/customer data from a Domo dataset via REST API
3. **Matching Logic**: Match calendar events to accounts (by name in title, attendee domain, etc.)
4. **Output**: Write combined data to sheet with columns like:
   - Account Name
   - Last Meeting Date
   - Next Meeting Date
   - Meeting Count (last 30 days)
   - Meeting Count (next 30 days)
   - Days Since Last Meeting
   - Has Upcoming Meeting (Y/N)

---

## Prerequisites

### 1. Google Calendar API Access
**Status**: ✅ Confirmed (you tested this successfully in OAuth Playground)

You can use either:
- **Option A**: `CalendarApp` service (built-in, easier, no API key needed)
- **Option B**: Advanced Calendar API (more control, requires enabling in Apps Script)

**Recommendation**: Start with `CalendarApp` for simplicity.

### 2. Domo API Access
**Status**: ⚠️ Needs verification

You need:
- **Client ID** and **Client Secret** (from a Domo "developer app")
- **Dataset ID** of the account/customer data you want to pull
- Permissions to read that dataset

#### How to get Domo credentials:
1. In Domo, go to **Admin** → **Authentication** (or similar, varies by org)
2. Create a new **Client** or **App** (or ask your admin to create one)
3. Note the **Client ID** and **Client Secret**
4. Confirm you have read access to the dataset(s) you need

#### How to find your Dataset ID:
1. In Domo, navigate to the dataset (Data Center)
2. Look at the URL: `https://yourinstance.domo.com/datasources/{DATASET_ID}/details/overview`
3. Copy the `DATASET_ID`

### 3. Salesforce API Access (Optional)
**Status**: ⚠️ Needs verification (check `API Enabled` permission)

If you want to pull account data from Salesforce instead of (or in addition to) Domo:
- Confirm you have **`API Enabled`** permission in Salesforce
- You'll need a **Connected App** with OAuth credentials
- Or use username/password + security token (less secure, not recommended)

---

## Implementation Plan

### Step 1: Set Up Google Apps Script Project
1. Create a new Google Sheet (or use existing)
2. Go to **Extensions** → **Apps Script**
3. Create the following files:
   - `Code.js` (main script)
   - `Config.js` (credentials and settings)
   - `CalendarService.js` (Calendar API functions)
   - `DomoService.js` (Domo API functions)
   - `DataProcessor.js` (matching/joining logic)
   - `SheetWriter.js` (write to sheet)

### Step 2: Configuration File

**File**: `Config.js`

```javascript
/**
 * Configuration for Calendar + Domo Integration
 * 
 * IMPORTANT: Keep credentials secure
 * - For production, use PropertiesService instead of hardcoding
 * - Never commit credentials to version control
 */

const CONFIG = {
  // Domo API Configuration
  domo: {
    clientId: 'YOUR_DOMO_CLIENT_ID',
    clientSecret: 'YOUR_DOMO_CLIENT_SECRET',
    instance: 'yourcompany', // e.g., if URL is yourcompany.domo.com
    datasetId: 'YOUR_DATASET_ID', // Dataset containing account data
    accountNameField: 'Account_Name', // Field name for account name in dataset
  },
  
  // Calendar Configuration
  calendar: {
    calendarId: 'primary', // or specific calendar ID
    daysBack: 90, // How many days in the past to pull events
    daysForward: 90, // How many days in the future to pull events
  },
  
  // Matching Configuration
  matching: {
    // How to match calendar events to accounts
    // Options: 'title', 'attendee_domain', 'custom'
    method: 'title',
    
    // If method is 'title', look for account name in event title
    // If method is 'attendee_domain', match by email domain
    // If method is 'custom', implement custom logic in DataProcessor.js
  },
  
  // Output Sheet Configuration
  output: {
    sheetName: 'Account Meetings', // Name of output sheet
    clearBeforeWrite: true, // Clear existing data before writing
  }
};

// Helper to get config (allows override via Script Properties)
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  
  // Override from properties if set (more secure)
  if (props.getProperty('DOMO_CLIENT_ID')) {
    CONFIG.domo.clientId = props.getProperty('DOMO_CLIENT_ID');
  }
  if (props.getProperty('DOMO_CLIENT_SECRET')) {
    CONFIG.domo.clientSecret = props.getProperty('DOMO_CLIENT_SECRET');
  }
  
  return CONFIG;
}
```

### Step 3: Domo Service (API Functions)

**File**: `DomoService.js`

```javascript
/**
 * Domo API Service
 * Handles authentication and data retrieval from Domo
 */

class DomoService {
  constructor(config) {
    this.config = config;
    this.baseUrl = `https://${config.instance}.domo.com`;
    this.apiUrl = 'https://api.domo.com/v1';
    this.accessToken = null;
  }
  
  /**
   * Authenticate with Domo and get access token
   */
  authenticate() {
    const url = 'https://api.domo.com/oauth/token?grant_type=client_credentials';
    const auth = Utilities.base64Encode(
      `${this.config.clientId}:${this.config.clientSecret}`
    );
    
    const options = {
      method: 'post',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      muteHttpExceptions: true
    };
    
    try {
      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response.getContentText());
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        Logger.log('Domo authentication successful');
        return true;
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      Logger.log('Domo authentication failed: ' + error.message);
      throw new Error('Failed to authenticate with Domo: ' + error.message);
    }
  }
  
  /**
   * Get data from a Domo dataset
   * @param {string} datasetId - The dataset ID to query
   * @param {number} limit - Max rows to return (default 1000)
   * @returns {Array} Array of row objects
   */
  getDataset(datasetId, limit = 1000) {
    if (!this.accessToken) {
      this.authenticate();
    }
    
    const url = `${this.apiUrl}/datasets/${datasetId}/data?limit=${limit}`;
    
    const options = {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    try {
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      
      if (statusCode === 401) {
        // Token expired, re-authenticate and retry
        Logger.log('Token expired, re-authenticating...');
        this.authenticate();
        return this.getDataset(datasetId, limit);
      }
      
      if (statusCode !== 200) {
        throw new Error(`HTTP ${statusCode}: ${response.getContentText()}`);
      }
      
      const data = JSON.parse(response.getContentText());
      Logger.log(`Retrieved ${data.length} rows from Domo dataset ${datasetId}`);
      return data;
      
    } catch (error) {
      Logger.log('Failed to get Domo dataset: ' + error.message);
      throw error;
    }
  }
  
  /**
   * Get account data (convenience wrapper)
   */
  getAccounts() {
    const data = this.getDataset(this.config.datasetId);
    
    // Transform to simpler format if needed
    return data.map(row => ({
      name: row[this.config.accountNameField] || row.Account_Name || row.name,
      // Add other fields you need from the dataset
      id: row.Account_ID || row.id,
      owner: row.Account_Owner || row.owner,
      // ... etc
      rawData: row // Keep full row for reference
    }));
  }
}
```

### Step 4: Calendar Service

**File**: `CalendarService.js`

```javascript
/**
 * Google Calendar Service
 * Handles calendar event retrieval
 */

class CalendarService {
  constructor(config) {
    this.config = config;
  }
  
  /**
   * Get calendar events for a date range
   * @returns {Array} Array of event objects
   */
  getEvents() {
    const calendar = CalendarApp.getCalendarById(this.config.calendarId);
    
    if (!calendar) {
      throw new Error(`Calendar not found: ${this.config.calendarId}`);
    }
    
    const now = new Date();
    const startDate = new Date(now.getTime() - (this.config.daysBack * 24 * 60 * 60 * 1000));
    const endDate = new Date(now.getTime() + (this.config.daysForward * 24 * 60 * 60 * 1000));
    
    Logger.log(`Fetching events from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const events = calendar.getEvents(startDate, endDate);
    
    Logger.log(`Retrieved ${events.length} calendar events`);
    
    // Transform to simpler format
    return events.map(event => ({
      title: event.getTitle(),
      startTime: event.getStartTime(),
      endTime: event.getEndTime(),
      attendees: event.getGuestList().map(guest => guest.getEmail()),
      description: event.getDescription(),
      location: event.getLocation(),
      isAllDay: event.isAllDayEvent(),
      // Add computed fields
      isPast: event.getEndTime() < now,
      isFuture: event.getStartTime() > now,
      rawEvent: event // Keep reference to original event
    }));
  }
  
  /**
   * Filter events by date range
   */
  filterEventsByDateRange(events, startDate, endDate) {
    return events.filter(event => {
      return event.startTime >= startDate && event.startTime <= endDate;
    });
  }
}
```

### Step 5: Data Processor (Matching Logic)

**File**: `DataProcessor.js`

```javascript
/**
 * Data Processor
 * Handles matching calendar events to accounts
 */

class DataProcessor {
  constructor(config) {
    this.config = config;
  }
  
  /**
   * Match calendar events to accounts
   * @param {Array} accounts - Array of account objects
   * @param {Array} events - Array of calendar event objects
   * @returns {Array} Array of matched account objects with meeting data
   */
  matchEventsToAccounts(accounts, events) {
    const now = new Date();
    
    return accounts.map(account => {
      // Find all events that match this account
      const matchedEvents = events.filter(event => 
        this.isEventForAccount(event, account)
      );
      
      // Separate past and future events
      const pastEvents = matchedEvents.filter(e => e.isPast);
      const futureEvents = matchedEvents.filter(e => e.isFuture);
      
      // Calculate metrics
      const lastMeeting = pastEvents.length > 0 
        ? this.getMostRecentEvent(pastEvents)
        : null;
      
      const nextMeeting = futureEvents.length > 0
        ? this.getNextEvent(futureEvents)
        : null;
      
      const daysSinceLastMeeting = lastMeeting
        ? Math.floor((now - lastMeeting.startTime) / (1000 * 60 * 60 * 24))
        : null;
      
      const daysUntilNextMeeting = nextMeeting
        ? Math.floor((nextMeeting.startTime - now) / (1000 * 60 * 60 * 24))
        : null;
      
      // Get meetings in specific time windows
      const last30Days = this.filterLast30Days(pastEvents, now);
      const next30Days = this.filterNext30Days(futureEvents, now);
      
      return {
        accountName: account.name,
        accountId: account.id,
        accountOwner: account.owner,
        
        // Meeting counts
        totalMeetings: matchedEvents.length,
        pastMeetings: pastEvents.length,
        futureMeetings: futureEvents.length,
        meetingsLast30Days: last30Days.length,
        meetingsNext30Days: next30Days.length,
        
        // Last meeting info
        lastMeetingDate: lastMeeting ? lastMeeting.startTime : null,
        lastMeetingTitle: lastMeeting ? lastMeeting.title : null,
        daysSinceLastMeeting: daysSinceLastMeeting,
        
        // Next meeting info
        nextMeetingDate: nextMeeting ? nextMeeting.startTime : null,
        nextMeetingTitle: nextMeeting ? nextMeeting.title : null,
        daysUntilNextMeeting: daysUntilNextMeeting,
        hasUpcomingMeeting: futureEvents.length > 0,
        
        // Raw data for debugging
        matchedEventTitles: matchedEvents.map(e => e.title)
      };
    });
  }
  
  /**
   * Check if an event is for a specific account
   */
  isEventForAccount(event, account) {
    const method = this.config.matching.method;
    
    if (method === 'title') {
      // Check if account name appears in event title (case-insensitive)
      return event.title.toLowerCase().includes(account.name.toLowerCase());
    }
    
    if (method === 'attendee_domain') {
      // Check if any attendee email matches account domain
      // Assumes account has a 'domain' field
      const domain = account.domain || this.extractDomain(account.name);
      return event.attendees.some(email => email.includes(domain));
    }
    
    if (method === 'custom') {
      // Implement your custom matching logic here
      return this.customMatchLogic(event, account);
    }
    
    return false;
  }
  
  /**
   * Custom matching logic (implement as needed)
   */
  customMatchLogic(event, account) {
    // Example: match by multiple criteria
    const titleMatch = event.title.toLowerCase().includes(account.name.toLowerCase());
    const descriptionMatch = event.description && 
      event.description.toLowerCase().includes(account.name.toLowerCase());
    
    return titleMatch || descriptionMatch;
  }
  
  /**
   * Helper: Get most recent event
   */
  getMostRecentEvent(events) {
    return events.reduce((latest, event) => {
      return !latest || event.startTime > latest.startTime ? event : latest;
    }, null);
  }
  
  /**
   * Helper: Get next upcoming event
   */
  getNextEvent(events) {
    return events.reduce((next, event) => {
      return !next || event.startTime < next.startTime ? event : next;
    }, null);
  }
  
  /**
   * Helper: Filter events from last 30 days
   */
  filterLast30Days(events, now) {
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    return events.filter(e => e.startTime >= thirtyDaysAgo);
  }
  
  /**
   * Helper: Filter events for next 30 days
   */
  filterNext30Days(events, now) {
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    return events.filter(e => e.startTime <= thirtyDaysFromNow);
  }
  
  /**
   * Helper: Extract domain from company name or email
   */
  extractDomain(name) {
    // Simple heuristic: convert "Acme Corp" to "acme"
    return name.toLowerCase().split(' ')[0];
  }
}
```

### Step 6: Sheet Writer

**File**: `SheetWriter.js`

```javascript
/**
 * Sheet Writer
 * Handles writing data to Google Sheets
 */

class SheetWriter {
  constructor(config) {
    this.config = config;
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  /**
   * Write account meeting data to sheet
   * @param {Array} data - Array of account objects with meeting data
   */
  writeAccountMeetings(data) {
    let sheet = this.spreadsheet.getSheetByName(this.config.output.sheetName);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = this.spreadsheet.insertSheet(this.config.output.sheetName);
    }
    
    // Clear existing data if configured
    if (this.config.output.clearBeforeWrite) {
      sheet.clear();
    }
    
    // Define headers
    const headers = [
      'Account Name',
      'Account ID',
      'Account Owner',
      'Total Meetings',
      'Past Meetings',
      'Future Meetings',
      'Meetings (Last 30d)',
      'Meetings (Next 30d)',
      'Last Meeting Date',
      'Last Meeting Title',
      'Days Since Last',
      'Next Meeting Date',
      'Next Meeting Title',
      'Days Until Next',
      'Has Upcoming Meeting',
      'Last Updated'
    ];
    
    // Write headers
    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    
    // Prepare data rows
    const rows = data.map(account => [
      account.accountName,
      account.accountId,
      account.accountOwner,
      account.totalMeetings,
      account.pastMeetings,
      account.futureMeetings,
      account.meetingsLast30Days,
      account.meetingsNext30Days,
      account.lastMeetingDate ? this.formatDate(account.lastMeetingDate) : '',
      account.lastMeetingTitle || '',
      account.daysSinceLastMeeting || '',
      account.nextMeetingDate ? this.formatDate(account.nextMeetingDate) : '',
      account.nextMeetingTitle || '',
      account.daysUntilNextMeeting || '',
      account.hasUpcomingMeeting ? 'Yes' : 'No',
      new Date()
    ]);
    
    // Write data
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    // Format sheet
    this.formatSheet(sheet, headers.length, rows.length + 1);
    
    Logger.log(`Wrote ${rows.length} rows to sheet "${this.config.output.sheetName}"`);
  }
  
  /**
   * Format the sheet for readability
   */
  formatSheet(sheet, numCols, numRows) {
    // Auto-resize columns
    for (let i = 1; i <= numCols; i++) {
      sheet.autoResizeColumn(i);
    }
    
    // Freeze header row
    sheet.setFrozenRows(1);
    
    // Add alternating row colors
    if (numRows > 1) {
      sheet.getRange(2, 1, numRows - 1, numCols)
        .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    }
    
    // Format date columns
    const dateColumns = [9, 12]; // Last Meeting Date, Next Meeting Date
    dateColumns.forEach(col => {
      if (numRows > 1) {
        sheet.getRange(2, col, numRows - 1, 1)
          .setNumberFormat('yyyy-mm-dd hh:mm');
      }
    });
    
    // Format number columns (center align)
    const numberColumns = [4, 5, 6, 7, 8, 11, 14]; // Meeting counts, days
    numberColumns.forEach(col => {
      if (numRows > 1) {
        sheet.getRange(2, col, numRows - 1, 1)
          .setHorizontalAlignment('center');
      }
    });
  }
  
  /**
   * Helper: Format date for display
   */
  formatDate(date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  }
}
```

### Step 7: Main Script

**File**: `Code.js`

```javascript
/**
 * Main Script - Calendar + Domo Integration
 * 
 * This script pulls data from Google Calendar and Domo,
 * matches events to accounts, and writes to a Google Sheet.
 */

/**
 * Create custom menu when sheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Account Meetings')
    .addItem('Run Full Sync', 'runFullSync')
    .addItem('Test Domo Connection', 'testDomoConnection')
    .addItem('Test Calendar Connection', 'testCalendarConnection')
    .addSeparator()
    .addItem('Configure Settings', 'showConfigDialog')
    .addToUi();
}

/**
 * Main function - Run full sync
 */
function runFullSync() {
  const startTime = new Date();
  Logger.log('=== Starting Calendar + Domo Sync ===');
  
  try {
    // Get configuration
    const config = getConfig();
    
    // Initialize services
    const domoService = new DomoService(config.domo);
    const calendarService = new CalendarService(config.calendar);
    const dataProcessor = new DataProcessor(config);
    const sheetWriter = new SheetWriter(config);
    
    // Step 1: Get accounts from Domo
    Logger.log('Step 1: Fetching accounts from Domo...');
    const accounts = domoService.getAccounts();
    Logger.log(`Retrieved ${accounts.length} accounts`);
    
    // Step 2: Get calendar events
    Logger.log('Step 2: Fetching calendar events...');
    const events = calendarService.getEvents();
    Logger.log(`Retrieved ${events.length} events`);
    
    // Step 3: Match events to accounts
    Logger.log('Step 3: Matching events to accounts...');
    const matchedData = dataProcessor.matchEventsToAccounts(accounts, events);
    
    // Step 4: Write to sheet
    Logger.log('Step 4: Writing to sheet...');
    sheetWriter.writeAccountMeetings(matchedData);
    
    // Done
    const duration = (new Date() - startTime) / 1000;
    Logger.log(`=== Sync Complete in ${duration}s ===`);
    
    SpreadsheetApp.getUi().alert(
      'Sync Complete',
      `Successfully synced ${accounts.length} accounts with ${events.length} calendar events.\n\n` +
      `Duration: ${duration}s`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('ERROR: ' + error.message);
    Logger.log(error.stack);
    
    SpreadsheetApp.getUi().alert(
      'Sync Failed',
      'Error: ' + error.message + '\n\nCheck the logs for details.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Test Domo connection
 */
function testDomoConnection() {
  try {
    const config = getConfig();
    const domoService = new DomoService(config.domo);
    
    Logger.log('Testing Domo authentication...');
    domoService.authenticate();
    
    Logger.log('Testing dataset retrieval...');
    const data = domoService.getDataset(config.domo.datasetId, 5); // Get 5 rows
    
    Logger.log('Domo connection successful!');
    Logger.log('Sample data:');
    Logger.log(JSON.stringify(data, null, 2));
    
    SpreadsheetApp.getUi().alert(
      'Domo Connection Test',
      `✅ Success!\n\nRetrieved ${data.length} sample rows.\nCheck logs for details.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('Domo connection failed: ' + error.message);
    SpreadsheetApp.getUi().alert(
      'Domo Connection Test',
      `❌ Failed\n\nError: ${error.message}\n\nCheck logs for details.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Test Calendar connection
 */
function testCalendarConnection() {
  try {
    const config = getConfig();
    const calendarService = new CalendarService(config.calendar);
    
    Logger.log('Testing calendar access...');
    const events = calendarService.getEvents();
    
    Logger.log('Calendar connection successful!');
    Logger.log(`Retrieved ${events.length} events`);
    
    // Show sample events
    const sampleEvents = events.slice(0, 5).map(e => 
      `${e.title} - ${e.startTime.toLocaleDateString()}`
    ).join('\n');
    
    SpreadsheetApp.getUi().alert(
      'Calendar Connection Test',
      `✅ Success!\n\nRetrieved ${events.length} events.\n\nSample events:\n${sampleEvents}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('Calendar connection failed: ' + error.message);
    SpreadsheetApp.getUi().alert(
      'Calendar Connection Test',
      `❌ Failed\n\nError: ${error.message}\n\nCheck logs for details.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Show configuration dialog (optional - for future enhancement)
 */
function showConfigDialog() {
  const html = HtmlService.createHtmlOutput(
    '<p>Configuration is currently managed in Config.js</p>' +
    '<p>For secure credential storage, use Script Properties:</p>' +
    '<ol>' +
    '<li>Go to Project Settings (gear icon)</li>' +
    '<li>Add Script Properties for DOMO_CLIENT_ID and DOMO_CLIENT_SECRET</li>' +
    '</ol>'
  )
    .setWidth(400)
    .setHeight(200);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Configuration');
}

/**
 * Set up time-driven trigger (optional - for automated runs)
 */
function createDailyTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runFullSync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new daily trigger at 6 AM
  ScriptApp.newTrigger('runFullSync')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();
  
  Logger.log('Daily trigger created for 6 AM');
}
```

---

## Setup Instructions

### 1. Create the Apps Script Project
1. Open a new Google Sheet
2. Go to **Extensions** → **Apps Script**
3. Create the 6 files listed above (Code.js, Config.js, etc.)
4. Copy the code into each file

### 2. Configure Credentials
1. Get your Domo Client ID and Secret (see Prerequisites section)
2. Get your Domo Dataset ID
3. Update `Config.js` with your credentials

**Secure option** (recommended):
- Go to **Project Settings** (gear icon in Apps Script)
- Add **Script Properties**:
  - `DOMO_CLIENT_ID`: your client ID
  - `DOMO_CLIENT_SECRET`: your client secret
- The code will automatically use these instead of hardcoded values

### 3. Test Connections
1. Save all files
2. Refresh your Google Sheet
3. You should see a new menu: **Account Meetings**
4. Click **Account Meetings** → **Test Domo Connection**
5. Click **Account Meetings** → **Test Calendar Connection**
6. Authorize the script when prompted

### 4. Run Full Sync
1. Click **Account Meetings** → **Run Full Sync**
2. The script will:
   - Pull accounts from Domo
   - Pull calendar events
   - Match them
   - Write results to a new sheet

### 5. Review Output
- A new sheet named "Account Meetings" will be created
- Review the data and adjust matching logic if needed

---

## Customization Options

### Adjust Matching Logic
Edit `DataProcessor.js` → `isEventForAccount()` method to change how events are matched to accounts.

Examples:
- Match by account name in title (default)
- Match by attendee email domain
- Match by keywords in description
- Match by custom field mapping

### Change Date Ranges
Edit `Config.js` → `calendar.daysBack` and `calendar.daysForward`

### Add More Metrics
Edit `DataProcessor.js` → `matchEventsToAccounts()` to calculate additional metrics like:
- Average meeting duration
- Meeting frequency trend
- Time since last contact
- Meeting types (by keyword)

### Change Output Format
Edit `SheetWriter.js` → `writeAccountMeetings()` to:
- Add/remove columns
- Change formatting
- Add conditional formatting
- Create charts

---

## Troubleshooting

### Domo Authentication Fails
**Error**: `Failed to authenticate with Domo`

**Solutions**:
1. Verify Client ID and Secret are correct
2. Check that the client has not been revoked
3. Confirm your Domo user has API access
4. Try creating a new client in Domo

### Dataset Not Found
**Error**: `HTTP 404` or `Dataset not found`

**Solutions**:
1. Verify the Dataset ID is correct (check URL in Domo)
2. Confirm you have read access to that dataset
3. Try with a different dataset you know you can access

### Calendar Authorization Issues
**Error**: `Authorization required` or `Calendar not found`

**Solutions**:
1. Re-authorize the script (delete and re-run)
2. Check that `calendar.calendarId` is correct
3. Try using `'primary'` for your main calendar
4. Verify Calendar API is enabled (if using Advanced Calendar API)

### No Events Matched
**Issue**: All accounts show 0 meetings

**Solutions**:
1. Check your matching logic in `DataProcessor.js`
2. Verify account names match what's in event titles
3. Add logging to see what's being compared
4. Try a more lenient matching method (e.g., partial match)

### Script Timeout
**Error**: `Exceeded maximum execution time`

**Solutions**:
1. Reduce date range (fewer days back/forward)
2. Limit number of accounts processed
3. Add pagination for large datasets
4. Split into multiple runs

---

## Advanced Features (Optional)

### 1. Automated Daily Sync
Add a time-driven trigger to run automatically:

```javascript
// Run this once to set up daily sync at 6 AM
function createDailyTrigger() {
  ScriptApp.newTrigger('runFullSync')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();
}
```

### 2. Email Notifications
Send email when sync completes or if accounts need attention:

```javascript
function sendSummaryEmail(data) {
  const accountsWithoutMeetings = data.filter(a => !a.hasUpcomingMeeting);
  
  const body = `
    Sync completed at ${new Date()}
    
    Total accounts: ${data.length}
    Accounts without upcoming meetings: ${accountsWithoutMeetings.length}
    
    Accounts needing attention:
    ${accountsWithoutMeetings.map(a => `- ${a.accountName}`).join('\n')}
  `;
  
  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: 'Account Meeting Report',
    body: body
  });
}
```

### 3. Salesforce Integration
Add Salesforce as an additional data source:

```javascript
// In Config.js
salesforce: {
  instanceUrl: 'https://yourinstance.salesforce.com',
  accessToken: 'YOUR_ACCESS_TOKEN', // or use OAuth
  accountQuery: 'SELECT Id, Name, Owner.Name FROM Account WHERE IsActive__c = true'
}

// Create SalesforceService.js similar to DomoService.js
```

### 4. Multiple Calendar Support
Pull from multiple calendars:

```javascript
// In CalendarService.js
getEventsFromMultipleCalendars(calendarIds) {
  const allEvents = [];
  calendarIds.forEach(calId => {
    const calendar = CalendarApp.getCalendarById(calId);
    const events = calendar.getEvents(startDate, endDate);
    allEvents.push(...events);
  });
  return allEvents;
}
```

---

## Next Steps

1. **Set up the project** following the setup instructions
2. **Test connections** to verify Domo and Calendar access
3. **Run a test sync** with a small dataset
4. **Adjust matching logic** based on your data
5. **Customize output** to fit your needs
6. **Set up automation** if desired

---

## Security Best Practices

1. **Never hardcode credentials** in the script
2. **Use Script Properties** for sensitive data
3. **Limit API scopes** to minimum required
4. **Don't share the script** with credentials included
5. **Regularly rotate** API keys and secrets
6. **Use service accounts** for production (if available)
7. **Log access** and monitor for unusual activity

---

## Support Resources

### Domo API Documentation
- https://developer.domo.com/docs/authentication/overview-4
- https://developer.domo.com/docs/dataset-api/dataset

### Google Calendar API
- https://developers.google.com/apps-script/reference/calendar
- https://developers.google.com/calendar/api/v3/reference

### Apps Script Best Practices
- https://developers.google.com/apps-script/guides/services/quotas
- https://developers.google.com/apps-script/guides/support/best-practices

---

## Questions to Answer Before Starting

1. **Domo Dataset**: What is your Dataset ID and what fields does it contain?
2. **Matching Logic**: How should calendar events be matched to accounts?
   - By account name in event title?
   - By attendee email domain?
   - By custom field?
3. **Date Range**: How far back and forward should we look for events?
4. **Output**: What metrics are most important to you?
5. **Automation**: Do you want this to run automatically (daily/weekly)?

---

Good luck! Let me know if you have questions when you start implementing this in your new project.
