/**
 * ObservePoint API Client
 * 
 * Shared library for making ObservePoint API calls.
 * Handles authentication, error handling, retries, and common patterns.
 * 
 * Usage:
 *   const client = new ObservePointClient(apiKey);
 *   const report = client.fetchSavedReport(reportId);
 */

var ObservePointClient = (function() {
  
  function ObservePointClient(apiKey) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrlV2 = 'https://api.observepoint.com/v2';
    this.baseUrlV3 = 'https://api.observepoint.com/v3';
    this.maxRetries = 3;
  }
  
  ObservePointClient.prototype.makeRequest = function(url, options) {
    options = options || {};
    options.headers = options.headers || {};
    options.headers['Authorization'] = 'api_key ' + this.apiKey;
    options.headers['Accept'] = 'application/json';
    options.muteHttpExceptions = true;
    
    var retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        var response = UrlFetchApp.fetch(url, options);
        var code = response.getResponseCode();
        
        if (code === 429) {
          var waitTime = Math.pow(2, retries) * 1000;
          Logger.log('WARN', 'rate_limit', 'Rate limited, waiting ' + waitTime + 'ms');
          Utilities.sleep(waitTime);
          retries++;
          continue;
        }
        
        if (code >= 400) {
          var errorText = response.getContentText();
          Logger.log('ERROR', 'api_error', 'HTTP ' + code + ': ' + errorText);
          throw new Error('API Error ' + code + ': ' + errorText);
        }
        
        return JSON.parse(response.getContentText());
        
      } catch (e) {
        if (retries === this.maxRetries - 1) {
          Logger.log('ERROR', 'api_request_failed', url + ' - ' + e.toString());
          throw e;
        }
        retries++;
        Utilities.sleep(Math.pow(2, retries) * 1000);
      }
    }
  };
  
  ObservePointClient.prototype.getSavedReport = function(reportId) {
    var url = this.baseUrlV3 + '/reports/grid/saved/' + reportId;
    Logger.log('INFO', 'fetch_saved_report', 'Fetching saved report ' + reportId);
    return this.makeRequest(url, { method: 'get' });
  };
  
  ObservePointClient.prototype.fetchGridData = function(entityType, queryDefinition, page, rowsPerPage) {
    page = page || 0;
    rowsPerPage = rowsPerPage || 1000;
    
    var url = this.baseUrlV3 + '/reports/grid/' + entityType;
    
    var payload = JSON.parse(JSON.stringify(queryDefinition));
    payload.pagination = {
      page: page,
      rows: rowsPerPage
    };
    
    var options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    Logger.log('INFO', 'fetch_grid_page', 'Fetching page ' + page + ' of ' + entityType);
    return this.makeRequest(url, options);
  };
  
  ObservePointClient.prototype.fetchAllGridData = function(entityType, queryDefinition, rowsPerPage, maxPages) {
    rowsPerPage = rowsPerPage || 1000;
    maxPages = maxPages || null;
    
    var allRows = [];
    var page = 0;
    var columns = null;
    
    while (true) {
      if (maxPages && page >= maxPages) {
        Logger.log('INFO', 'max_pages_reached', 'Stopped at page ' + page);
        break;
      }
      
      var data = this.fetchGridData(entityType, queryDefinition, page, rowsPerPage);
      
      if (!data || !data.rows || data.rows.length === 0) {
        Logger.log('INFO', 'no_more_data', 'No more data at page ' + page);
        break;
      }
      
      if (page === 0) {
        columns = data.columns;
      }
      
      allRows = allRows.concat(data.rows);
      Logger.log('INFO', 'page_fetched', 'Page ' + page + ': ' + data.rows.length + ' rows (total: ' + allRows.length + ')');
      
      if (data.rows.length < rowsPerPage) {
        Logger.log('INFO', 'last_page', 'Last page reached');
        break;
      }
      
      page++;
    }
    
    return {
      columns: columns,
      rows: allRows
    };
  };
  
  ObservePointClient.prototype.getAudit = function(auditId) {
    var url = this.baseUrlV2 + '/web-audits/' + auditId;
    Logger.log('INFO', 'fetch_audit', 'Fetching audit ' + auditId);
    return this.makeRequest(url, { method: 'get' });
  };
  
  ObservePointClient.prototype.updateAudit = function(auditId, updates) {
    var url = this.baseUrlV2 + '/web-audits/' + auditId;
    
    var options = {
      method: 'put',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(updates)
    };
    
    Logger.log('INFO', 'update_audit', 'Updating audit ' + auditId);
    return this.makeRequest(url, options);
  };
  
  ObservePointClient.prototype.runAudit = function(auditId) {
    var url = this.baseUrlV2 + '/web-audits/' + auditId + '/runs';
    
    var options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    Logger.log('INFO', 'run_audit', 'Running audit ' + auditId);
    return this.makeRequest(url, options);
  };
  
  ObservePointClient.prototype.getLatestRun = function(auditId) {
    var url = this.baseUrlV2 + '/web-audits/' + auditId + '/runs?limit=1&sort=-id';
    Logger.log('INFO', 'fetch_latest_run', 'Fetching latest run for audit ' + auditId);
    
    var result = this.makeRequest(url, { method: 'get' });
    
    if (result && result.length > 0) {
      return result[0];
    }
    
    return null;
  };
  
  ObservePointClient.prototype.extractRowsAsArray = function(gridData) {
    if (!gridData || !gridData.columns || !gridData.rows) {
      return [];
    }
    
    var columnIds = gridData.columns.map(function(col) {
      return col.id;
    });
    
    return gridData.rows.map(function(row) {
      return columnIds.map(function(colId) {
        var cell = row[colId];
        if (!cell || cell.value === null || cell.value === undefined) {
          return '';
        }
        return cell.value;
      });
    });
  };
  
  ObservePointClient.prototype.extractHeaders = function(columns) {
    if (!columns || columns.length === 0) {
      return [];
    }
    
    return columns.map(function(col) {
      return col.label || col.id || 'Unknown';
    });
  };
  
  return ObservePointClient;
})();
