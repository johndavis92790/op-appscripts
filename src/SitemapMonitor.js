/**
 * Sitemap Monitor
 * 
 * Monitors a sitemap for new pages and updates an ObservePoint audit
 * with only the new URLs found since the last check.
 * 
 * Features:
 * - Fetches and parses XML sitemap
 * - Tracks URLs and their lastmod dates
 * - Identifies new pages since last check
 * - Updates ObservePoint audit with new URLs only
 * - Runs the audit automatically
 */

var SitemapMonitor = (function() {
  
  var CONFIG_SHEET = 'SitemapMonitor_Config';
  var TRACKING_SHEET = 'SitemapMonitor_Tracking';
  
  function initConfig() {
    var configItems = [
      ['API_KEY', '', 'Your ObservePoint API key'],
      ['AUDIT_ID', '', 'The audit ID to update with new URLs'],
      ['SITEMAP_URL', '', 'The sitemap URL to monitor (e.g., https://www.example.com/en-us/sitemap.xml)'],
      ['AUTO_RUN_AUDIT', 'true', 'Automatically run audit after updating URLs (true/false)']
    ];
    
    ConfigManager.createConfigSheet(CONFIG_SHEET, configItems);
    Logger.log('INFO', 'config_created', 'SitemapMonitor_Config sheet created. Please fill in your settings.');
  }
  
  function fetchSitemap(sitemapUrl) {
    Logger.log('INFO', 'fetch_sitemap', 'Fetching sitemap from ' + sitemapUrl);
    
    try {
      var response = UrlFetchApp.fetch(sitemapUrl, {
        muteHttpExceptions: true,
        followRedirects: true
      });
      
      if (response.getResponseCode() !== 200) {
        throw new Error('Failed to fetch sitemap: HTTP ' + response.getResponseCode());
      }
      
      return response.getContentText();
    } catch (e) {
      Logger.log('ERROR', 'fetch_sitemap_failed', e.toString());
      throw new Error('Failed to fetch sitemap: ' + e.toString());
    }
  }
  
  function parseSitemap(xmlContent) {
    Logger.log('INFO', 'parse_sitemap', 'Parsing sitemap XML');
    
    var urls = [];
    
    try {
      var document = XmlService.parse(xmlContent);
      var root = document.getRootElement();
      var namespace = XmlService.getNamespace('http://www.sitemaps.org/schemas/sitemap/0.9');
      
      var urlElements = root.getChildren('url', namespace);
      
      for (var i = 0; i < urlElements.length; i++) {
        var urlElement = urlElements[i];
        var loc = urlElement.getChildText('loc', namespace);
        var lastmod = urlElement.getChildText('lastmod', namespace) || '';
        var changefreq = urlElement.getChildText('changefreq', namespace) || '';
        var priority = urlElement.getChildText('priority', namespace) || '';
        
        if (loc) {
          urls.push({
            url: loc,
            lastmod: lastmod,
            changefreq: changefreq,
            priority: priority
          });
        }
      }
      
      Logger.log('INFO', 'parse_complete', 'Parsed ' + urls.length + ' URLs from sitemap');
      return urls;
      
    } catch (e) {
      Logger.log('ERROR', 'parse_sitemap_failed', e.toString());
      throw new Error('Failed to parse sitemap XML: ' + e.toString());
    }
  }
  
  function getOrCreateTrackingSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(TRACKING_SHEET);
    
    if (!sheet) {
      sheet = ss.insertSheet(TRACKING_SHEET);
      
      var headers = [['URL', 'Last Modified', 'First Seen', 'Last Checked', 'Status']];
      sheet.getRange(1, 1, 1, 5).setValues(headers);
      sheet.getRange('A1:E1')
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('#ffffff');
      
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 500);
      sheet.setColumnWidth(2, 150);
      sheet.setColumnWidth(3, 150);
      sheet.setColumnWidth(4, 150);
      sheet.setColumnWidth(5, 100);
      
      Logger.log('INFO', 'tracking_sheet_created', 'Created tracking sheet');
    }
    
    return sheet;
  }
  
  function getTrackedUrls() {
    var sheet = getOrCreateTrackingSheet();
    var lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return {};
    }
    
    var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    var tracked = {};
    
    for (var i = 0; i < data.length; i++) {
      var url = data[i][0];
      if (url) {
        var lastmodValue = data[i][1];
        // Normalize lastmod to string for comparison (could be Date object from sheet)
        var lastmodString = lastmodValue ? (lastmodValue instanceof Date ? lastmodValue.toISOString().split('T')[0] : String(lastmodValue)) : '';
        
        tracked[url] = {
          lastmod: lastmodString,
          firstSeen: data[i][2],
          lastChecked: data[i][3],
          status: data[i][4],
          row: i + 2
        };
      }
    }
    
    return tracked;
  }
  
  function identifyNewUrls(sitemapUrls, trackedUrls) {
    var newUrls = [];
    var updatedUrls = [];
    var now = new Date();
    
    for (var i = 0; i < sitemapUrls.length; i++) {
      var sitemapUrl = sitemapUrls[i];
      var url = sitemapUrl.url;
      
      if (!trackedUrls[url]) {
        // URL is not in tracking sheet - it's new
        newUrls.push(sitemapUrl);
      } else if (sitemapUrl.lastmod && trackedUrls[url].lastmod && sitemapUrl.lastmod !== trackedUrls[url].lastmod) {
        // URL exists but lastmod date has changed - it's updated
        updatedUrls.push(sitemapUrl);
      }
      // If lastmod is same or missing, URL is unchanged - do nothing
    }
    
    Logger.log('INFO', 'identify_new_urls', 'Found ' + newUrls.length + ' new URLs and ' + updatedUrls.length + ' updated URLs');
    
    return {
      newUrls: newUrls,
      updatedUrls: updatedUrls
    };
  }
  
  function updateTrackingSheet(sitemapUrls, trackedUrls) {
    var sheet = getOrCreateTrackingSheet();
    var now = new Date();
    var updates = [];
    
    for (var i = 0; i < sitemapUrls.length; i++) {
      var sitemapUrl = sitemapUrls[i];
      var url = sitemapUrl.url;
      
      if (!trackedUrls[url]) {
        updates.push([
          url,
          sitemapUrl.lastmod,
          now,
          now,
          'New'
        ]);
      } else {
        var row = trackedUrls[url].row;
        sheet.getRange(row, 2).setValue(sitemapUrl.lastmod);
        sheet.getRange(row, 4).setValue(now);
        
        if (sitemapUrl.lastmod && sitemapUrl.lastmod !== trackedUrls[url].lastmod) {
          sheet.getRange(row, 5).setValue('Updated');
        } else {
          sheet.getRange(row, 5).setValue('Tracked');
        }
      }
    }
    
    if (updates.length > 0) {
      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, updates.length, 5).setValues(updates);
      Logger.log('INFO', 'tracking_updated', 'Added ' + updates.length + ' new URLs to tracking sheet');
    }
  }
  
  function updateAuditWithChangedUrls(apiKey, auditId, changedUrls, sitemapUrl) {
    if (changedUrls.length === 0) {
      Logger.log('INFO', 'no_changes', 'No new or updated URLs to audit');
      return null;
    }
    
    var client = new ObservePointClient(apiKey);
    
    // Step 1: Get the full audit object
    var audit = client.getAudit(auditId);
    Logger.log('INFO', 'audit_fetched', 'Current audit has ' + (audit.startingUrls ? audit.startingUrls.length : 0) + ' starting URLs');
    
    var previousCount = audit.startingUrls ? audit.startingUrls.length : 0;
    
    // Extract URLs from changed URLs data and exclude the sitemap URL itself
    var urlStrings = changedUrls.map(function(item) { return item.url; });
    var filteredUrls = urlStrings.filter(function(url) { return url !== sitemapUrl; });
    
    // Step 2: Replace all starting URLs with only new/updated URLs (excluding sitemap URL)
    audit.startingUrls = filteredUrls;
    audit.limit = filteredUrls.length;
    
    // Remove read-only fields that shouldn't be sent in PUT request
    delete audit.created;
    delete audit.lastRun;
    delete audit.lastUpdated;
    delete audit.queued;
    delete audit.runs;
    delete audit.screenshot;
    delete audit.webAuditRunning;
    delete audit.labels;
    delete audit.rules;
    delete audit.taggingPlans;
    
    Logger.log('INFO', 'update_audit', 'Updating audit with ' + filteredUrls.length + ' changed URLs (new or updated)');
    
    // Step 3: Send the complete audit object back (without read-only fields)
    client.updateAudit(auditId, audit);
    
    return {
      previousCount: previousCount,
      changedCount: filteredUrls.length,
      totalCount: filteredUrls.length
    };
  }
  
  function runMonitor() {
    var startTime = new Date();
    
    try {
      ConfigManager.validateRequired(['API_KEY', 'AUDIT_ID', 'SITEMAP_URL'], CONFIG_SHEET);
      
      var config = ConfigManager.getValues(['API_KEY', 'AUDIT_ID', 'SITEMAP_URL', 'AUTO_RUN_AUDIT'], CONFIG_SHEET);
      
      Logger.log('INFO', 'monitor_start', 'Starting sitemap monitor for ' + config.SITEMAP_URL);
      
      var xmlContent = fetchSitemap(config.SITEMAP_URL);
      var sitemapUrls = parseSitemap(xmlContent);
      
      var trackedUrls = getTrackedUrls();
      
      var changes = identifyNewUrls(sitemapUrls, trackedUrls);
      
      updateTrackingSheet(sitemapUrls, trackedUrls);
      
      var result = {
        totalUrls: sitemapUrls.length,
        newUrls: changes.newUrls.length,
        updatedUrls: changes.updatedUrls.length,
        auditUpdated: false,
        auditRun: false
      };
      
      // Only update audit if there are new or updated URLs
      if (changes.newUrls.length > 0 || changes.updatedUrls.length > 0) {
        var changedUrls = changes.newUrls.concat(changes.updatedUrls);
        var updateResult = updateAuditWithChangedUrls(config.API_KEY, config.AUDIT_ID, changedUrls, config.SITEMAP_URL);
        
        if (updateResult) {
          result.auditUpdated = true;
          result.previousUrlCount = updateResult.previousCount;
          result.changedUrlCount = updateResult.changedCount;
          
          if (config.AUTO_RUN_AUDIT === 'true' || config.AUTO_RUN_AUDIT === true) {
            var client = new ObservePointClient(config.API_KEY);
            client.runAudit(config.AUDIT_ID);
            result.auditRun = true;
            Logger.log('INFO', 'audit_started', 'Audit ' + config.AUDIT_ID + ' started with ' + changedUrls.length + ' URLs');
          }
        }
      } else {
        Logger.log('INFO', 'no_changes', 'No new or updated URLs found. Skipping audit update and run.');
      }
      
      var duration = ((new Date() - startTime) / 1000).toFixed(2);
      result.duration = duration;
      
      Logger.log('INFO', 'monitor_complete', 'Monitor complete in ' + duration + 's: ' + result.newUrls + ' new URLs, ' + result.updatedUrls + ' updated URLs');
      
      return result;
      
    } catch (error) {
      Logger.log('ERROR', 'monitor_failed', error.toString());
      throw error;
    }
  }
  
  
  return {
    initConfig: initConfig,
    runMonitor: runMonitor
  };
})();

function sitemapMonitor_initConfig() {
  SitemapMonitor.initConfig();
}

function sitemapMonitor_runMonitor() {
  try {
    var result = SitemapMonitor.runMonitor();
    
    Logger.log('INFO', 'monitor_summary', 
      'Monitor complete: ' + result.totalUrls + ' total URLs, ' + 
      result.newUrls + ' new, ' + result.updatedUrls + ' updated. ' +
      (result.auditUpdated ? 'Audit updated and ' + (result.auditRun ? 'started.' : 'ready to run.') : 'No changes to audit.'));
    
    return result;
    
  } catch (error) {
    Logger.log('ERROR', 'monitor_error', error.toString());
    throw error;
  }
}
