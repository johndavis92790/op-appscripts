/**
 * Helper functions for audit operations
 */

function getLatestRunId(auditId, config) {
  const url = config.BASE_URL + '/v2/web-audits/' + auditId + '/runs?limit=1&sort=-id';
  const options = {
    method: 'get',
    headers: {
      'Authorization': 'api_key ' + config.API_KEY,
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() >= 300) {
    log('WARN', 'run_fetch', 'Failed to fetch latest run for audit ' + auditId + ': ' + response.getContentText());
    return null;
  }
  
  const result = JSON.parse(response.getContentText());
  if (result && result.length > 0) {
    return result[0].id;
  }
  
  return null;
}

function buildAuditUrl(auditId, config) {
  const runId = getLatestRunId(auditId, config);
  
  if (runId) {
    return 'https://app.observepoint.com/audit/' + auditId + '/run/' + runId + '/report/highlights/discovery';
  } else {
    return 'https://app.observepoint.com/audit/' + auditId;
  }
}

function buildReportUrl(reportId) {
  return 'https://app.observepoint.com/reports/' + reportId;
}
