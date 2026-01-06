/**
 * Report Creation Functions
 * 
 * Functions for creating primary and secondary saved reports via Grid API
 */

function createOrGetPrimaryReport(primaryAudit, config) {
  if (config.PRIMARY_REPORT_ID) {
    log('INFO', 'report_check', 'Using existing primary report: ' + config.PRIMARY_REPORT_ID);
    return { id: config.PRIMARY_REPORT_ID, created: false };
  }
  
  log('INFO', 'report_create', 'Creating primary report for audit: ' + primaryAudit.name);
  
  const reportName = primaryAudit.name + ' - all external links';
  
  const queryDefinition = {
    size: 1000,
    page: 0,
    filters: {
      allAccounts: false,
      conditions: [
        {
          negated: false,
          operator: 'integer_in',
          filteredColumn: {
            columnId: 'IS_MOST_RECENT_PAGE_SCAN'
          },
          args: [1]
        },
        {
          negated: false,
          operator: 'integer_in',
          filteredColumn: {
            columnId: 'IS_LINK_EXTERNAL'
          },
          args: [1]
        },
        {
          negated: false,
          operator: 'integer_in',
          filteredColumn: {
            columnId: 'AUDIT_ID'
          },
          args: [parseInt(primaryAudit.id)]
        }
      ],
      conditionMatchMode: 'all'
    },
    columns: [
      {
        groupBy: true,
        columnId: 'FINAL_PAGE_URL'
      },
      {
        groupBy: true,
        columnId: 'LINK_URL'
      },
      {
        groupBy: true,
        columnId: 'LINK_TEXT'
      },
      {
        groupBy: true,
        columnId: 'LINK_OUTER_HTML'
      }
    ],
    sortBy: []
  };
  
  const payload = {
    name: reportName,
    isFavorite: false,
    visibility: 'private',
    queryDefinition: queryDefinition,
    gridEntityType: 'links',
    displayMetadata: {}
  };
  
  const url = config.BASE_URL + '/v3/reports/grid/saved';
  const options = {
    method: 'post',
    headers: {
      'Authorization': 'api_key ' + config.API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() >= 300) {
    throw new Error('Failed to create primary report: ' + response.getContentText());
  }
  
  const result = JSON.parse(response.getContentText());
  log('INFO', 'report_created', 'Primary report created with ID: ' + result.id);
  
  return { id: result.id, created: true };
}

function createOrGetSecondaryReport(primaryAudit, secondaryAuditId, config) {
  if (config.BROKEN_REPORT_ID) {
    log('INFO', 'report_check', 'Using existing secondary report: ' + config.BROKEN_REPORT_ID);
    return { id: config.BROKEN_REPORT_ID, created: false };
  }
  
  const secondaryAudit = fetchAuditDetails(secondaryAuditId, config);
  log('INFO', 'report_create', 'Creating secondary report for audit: ' + secondaryAudit.name);
  
  const reportName = primaryAudit.name + ' - only broken external links';
  
  const queryDefinition = {
    size: 1000,
    page: 0,
    filters: {
      allAccounts: false,
      conditions: [
        {
          negated: false,
          operator: 'integer_in',
          filteredColumn: {
            columnId: 'IS_MOST_RECENT_RUN'
          },
          args: [1]
        },
        {
          negated: false,
          operator: 'integer_in',
          filteredColumn: {
            columnId: 'AUDIT_ID'
          },
          args: [parseInt(secondaryAudit.id)]
        },
        {
          negated: false,
          operator: 'integer_in',
          filteredColumn: {
            columnId: 'FINAL_PAGE_STATUS_CODE_TYPE'
          },
          args: [3]
        },
        {
          negated: true,
          operator: 'integer_in',
          filteredColumn: {
            columnId: 'FINAL_PAGE_STATUS_CODE'
          },
          args: [403, 429]
        }
      ],
      conditionMatchMode: 'all'
    },
    columns: [
      {
        columnId: 'INITIAL_PAGE_URL'
      },
      {
        columnId: 'FINAL_PAGE_URL'
      },
      {
        columnId: 'FINAL_PAGE_STATUS_CODE'
      }
    ],
    sortBy: []
  };
  
  const payload = {
    name: reportName,
    isFavorite: false,
    visibility: 'private',
    queryDefinition: queryDefinition,
    gridEntityType: 'pages',
    displayMetadata: {}
  };
  
  const url = config.BASE_URL + '/v3/reports/grid/saved';
  const options = {
    method: 'post',
    headers: {
      'Authorization': 'api_key ' + config.API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() >= 300) {
    throw new Error('Failed to create secondary report: ' + response.getContentText());
  }
  
  const result = JSON.parse(response.getContentText());
  log('INFO', 'report_created', 'Secondary report created with ID: ' + result.id);
  
  return { id: result.id, created: true };
}

function createOrGetSecondaryAudit(primaryAudit, config) {
  if (config.SECONDARY_AUDIT_ID) {
    log('INFO', 'audit_check', 'Using existing secondary audit: ' + config.SECONDARY_AUDIT_ID);
    return { id: config.SECONDARY_AUDIT_ID, created: false };
  }
  
  log('INFO', 'audit_create', 'Creating secondary audit based on: ' + primaryAudit.name);
  
  const secondaryAuditPayload = {
    name: primaryAudit.name + ' - External Links Test',
    domainId: primaryAudit.domainId,
    folderId: primaryAudit.folderId,
    startingUrls: [],
    limit: 1,
    frequency: 'once',
    schedule: {
      recurrenceRule: 'FREQ=MINUTELY;WKST=SU;COUNT=1;INTERVAL=1',
      description: 'Once',
      dtStart: new Date().toISOString().replace(/\.\d{3}Z$/, '.000'),
      tzId: primaryAudit.schedule.tzId || 'America/Denver',
      presetType: 'RUN_ONCE',
      isPaused: false
    },
    options: primaryAudit.options || {},
    filters: {
      include: [],
      exclude: []
    },
    recipients: primaryAudit.recipients || []
  };
  
  const url = config.BASE_URL + '/v2/web-audits';
  const options = {
    method: 'post',
    headers: {
      'Authorization': 'api_key ' + config.API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(secondaryAuditPayload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() >= 300) {
    throw new Error('Failed to create secondary audit: ' + response.getContentText());
  }
  
  const result = JSON.parse(response.getContentText());
  log('INFO', 'audit_created', 'Secondary audit created with ID: ' + result.id);
  
  return { id: result.id, created: true };
}

function configureWebhooks(primaryAuditId, secondaryAuditId, config) {
  log('INFO', 'webhook_config', 'Configuring webhooks for audits');
  
  const primaryWebhookUrl = config.WEBHOOK_BASE_URL + '?stage=primary';
  const secondaryWebhookUrl = config.WEBHOOK_BASE_URL + '?stage=secondary';
  
  const primaryAudit = fetchAuditDetails(primaryAuditId, config);
  primaryAudit.options.webHookUrl = primaryWebhookUrl;
  
  const primaryUpdateUrl = config.BASE_URL + '/v2/web-audits/' + primaryAuditId;
  const primaryOptions = {
    method: 'put',
    headers: {
      'Authorization': 'api_key ' + config.API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(primaryAudit),
    muteHttpExceptions: true
  };
  
  const primaryResponse = UrlFetchApp.fetch(primaryUpdateUrl, primaryOptions);
  if (primaryResponse.getResponseCode() >= 300) {
    throw new Error('Failed to update primary audit webhook: ' + primaryResponse.getContentText());
  }
  
  log('INFO', 'webhook_set', 'Primary audit webhook configured: ' + primaryWebhookUrl);
  
  const secondaryAudit = fetchAuditDetails(secondaryAuditId, config);
  secondaryAudit.options.webHookUrl = secondaryWebhookUrl;
  
  const secondaryUpdateUrl = config.BASE_URL + '/v2/web-audits/' + secondaryAuditId;
  const secondaryOptions = {
    method: 'put',
    headers: {
      'Authorization': 'api_key ' + config.API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(secondaryAudit),
    muteHttpExceptions: true
  };
  
  const secondaryResponse = UrlFetchApp.fetch(secondaryUpdateUrl, secondaryOptions);
  if (secondaryResponse.getResponseCode() >= 300) {
    throw new Error('Failed to update secondary audit webhook: ' + secondaryResponse.getContentText());
  }
  
  log('INFO', 'webhook_set', 'Secondary audit webhook configured: ' + secondaryWebhookUrl);
}
