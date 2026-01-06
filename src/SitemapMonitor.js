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
      ['SITEMAP_URL', '', 'The sitemap URL to monitor (e.g., https://www.lumen.com/en-us/sitemap.xml)'],
      ['AUTO_RUN_AUDIT', 'true', 'Automatically run audit after updating URLs (true/false)']
    ];
    
    ConfigManager.createConfigSheet(CONFIG_SHEET, configItems);
    
    SpreadsheetApp.getUi().alert(
      'Configuration Created',
      'Please fill in the SitemapMonitor_Config sheet with your settings.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
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
        tracked[url] = {
          lastmod: data[i][1],
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
        newUrls.push(sitemapUrl);
      } else if (sitemapUrl.lastmod && sitemapUrl.lastmod !== trackedUrls[url].lastmod) {
        updatedUrls.push(sitemapUrl);
      }
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
  
  function updateAuditWithNewUrls(auditId, newUrls, apiKey) {
    if (newUrls.length === 0) {
      Logger.log('INFO', 'no_new_urls', 'No new URLs to add to audit');
      return null;
    }
    
    var client = new ObservePointClient(apiKey);
    
    var audit = client.getAudit(auditId);
    Logger.log('INFO', 'audit_fetched', 'Current audit has ' + (audit.startingUrls ? audit.startingUrls.length : 0) + ' starting URLs');
    
    var currentUrls = audit.startingUrls || [];
    var urlStrings = newUrls.map(function(item) { return item.url; });
    
    var combinedUrls = currentUrls.concat(urlStrings);
    
    var uniqueUrls = [];
    var seen = {};
    for (var i = 0; i < combinedUrls.length; i++) {
      if (!seen[combinedUrls[i]]) {
        seen[combinedUrls[i]] = true;
        uniqueUrls.push(combinedUrls[i]);
      }
    }
    
    var updates = {
      startingUrls: uniqueUrls
    };
    
    Logger.log('INFO', 'update_audit', 'Updating audit with ' + uniqueUrls.length + ' total URLs (added ' + newUrls.length + ' new)');
    client.updateAudit(auditId, updates);
    
    return {
      previousCount: currentUrls.length,
      newCount: newUrls.length,
      totalCount: uniqueUrls.length
    };
  }
  
  function runMonitor() {
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
      
      if (changes.newUrls.length > 0) {
        var updateResult = updateAuditWithNewUrls(config.AUDIT_ID, changes.newUrls, config.API_KEY);
        
        if (updateResult) {
          result.auditUpdated = true;
          result.previousUrlCount = updateResult.previousCount;
          result.totalUrlCount = updateResult.totalCount;
          
          if (config.AUTO_RUN_AUDIT === 'true' || config.AUTO_RUN_AUDIT === true) {
            var client = new ObservePointClient(config.API_KEY);
            client.runAudit(config.AUDIT_ID);
            result.auditRun = true;
            Logger.log('INFO', 'audit_started', 'Audit ' + config.AUDIT_ID + ' started');
          }
        }
      }
      
      Logger.log('INFO', 'monitor_complete', 'Monitor complete: ' + JSON.stringify(result));
      
      return result;
      
    } catch (error) {
      Logger.log('ERROR', 'monitor_failed', error.toString());
      throw error;
    }
  }
  
  function showSetupDialog() {
    var html = `
      <!DOCTYPE html>
      <html>
        <head>
          <base target="_top">
          <style>
            body {
              font-family: 'Google Sans', Arial, sans-serif;
              padding: 24px;
              line-height: 1.6;
              margin: 0;
              color: #202124;
            }
            h2 {
              color: #1a73e8;
              margin: 0 0 16px 0;
              font-size: 22px;
              font-weight: 400;
            }
            .form-group {
              margin-bottom: 20px;
            }
            label {
              display: block;
              margin-bottom: 6px;
              font-weight: 500;
              color: #5f6368;
            }
            input[type="text"], input[type="password"] {
              width: 100%;
              padding: 10px;
              border: 1px solid #dadce0;
              border-radius: 4px;
              font-size: 14px;
              box-sizing: border-box;
            }
            input[type="text"]:focus, input[type="password"]:focus {
              outline: none;
              border-color: #1a73e8;
            }
            .checkbox-group {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            input[type="checkbox"] {
              width: 18px;
              height: 18px;
              cursor: pointer;
            }
            .button-container {
              margin-top: 24px;
              display: flex;
              gap: 12px;
              justify-content: flex-end;
            }
            button {
              padding: 10px 24px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            }
            .btn-primary {
              background: #1a73e8;
              color: white;
            }
            .btn-primary:hover {
              background: #1765cc;
            }
            .btn-cancel {
              background: #fff;
              color: #5f6368;
              border: 1px solid #dadce0;
            }
            .btn-cancel:hover {
              background: #f8f9fa;
            }
            .info-box {
              background: #e8f0fe;
              padding: 12px;
              border-radius: 4px;
              margin-bottom: 20px;
              font-size: 13px;
              color: #1967d2;
            }
            .spinner {
              display: none;
              width: 14px;
              height: 14px;
              border: 2px solid rgba(255,255,255,.3);
              border-radius: 50%;
              border-top-color: #fff;
              animation: spin 0.8s linear infinite;
              margin-left: 8px;
              vertical-align: middle;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <h2>Sitemap Monitor Setup</h2>
          
          <div class="info-box">
            This tool monitors a sitemap for new pages and automatically updates an ObservePoint audit with only the new URLs found.
          </div>
          
          <form id="setupForm">
            <div class="form-group">
              <label for="apiKey">ObservePoint API Key *</label>
              <input type="password" id="apiKey" required placeholder="Enter your API key">
            </div>
            
            <div class="form-group">
              <label for="auditId">Audit ID *</label>
              <input type="text" id="auditId" required placeholder="e.g., 123456">
            </div>
            
            <div class="form-group">
              <label for="sitemapUrl">Sitemap URL *</label>
              <input type="text" id="sitemapUrl" required placeholder="e.g., https://www.example.com/sitemap.xml">
            </div>
            
            <div class="form-group">
              <div class="checkbox-group">
                <input type="checkbox" id="autoRun" checked>
                <label for="autoRun" style="margin: 0;">Automatically run audit after updating URLs</label>
              </div>
            </div>
            
            <div class="button-container">
              <button type="button" class="btn-cancel" onclick="google.script.host.close()">Cancel</button>
              <button type="submit" class="btn-primary" id="submitBtn">
                Save & Run Monitor
                <span class="spinner" id="spinner"></span>
              </button>
            </div>
          </form>
          
          <script>
            document.getElementById('setupForm').addEventListener('submit', function(e) {
              e.preventDefault();
              
              const submitBtn = document.getElementById('submitBtn');
              const spinner = document.getElementById('spinner');
              
              submitBtn.disabled = true;
              spinner.style.display = 'inline-block';
              
              const config = {
                apiKey: document.getElementById('apiKey').value,
                auditId: document.getElementById('auditId').value,
                sitemapUrl: document.getElementById('sitemapUrl').value,
                autoRun: document.getElementById('autoRun').checked
              };
              
              google.script.run
                .withSuccessHandler(function(result) {
                  google.script.host.close();
                })
                .withFailureHandler(function(error) {
                  submitBtn.disabled = false;
                  spinner.style.display = 'none';
                  alert('Error: ' + error.message);
                })
                .handleSitemapSetup(config);
            });
          </script>
        </body>
      </html>
    `;
    
    var htmlOutput = HtmlService.createHtmlOutput(html)
      .setWidth(600)
      .setHeight(500);
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Sitemap Monitor Setup');
  }
  
  function handleSitemapSetup(config) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName(CONFIG_SHEET);
    
    if (!configSheet) {
      initConfig();
      configSheet = ss.getSheetByName(CONFIG_SHEET);
    }
    
    ConfigManager.setValue('API_KEY', config.apiKey, CONFIG_SHEET);
    ConfigManager.setValue('AUDIT_ID', config.auditId, CONFIG_SHEET);
    ConfigManager.setValue('SITEMAP_URL', config.sitemapUrl, CONFIG_SHEET);
    ConfigManager.setValue('AUTO_RUN_AUDIT', config.autoRun ? 'true' : 'false', CONFIG_SHEET);
    
    var result = runMonitor();
    
    showResultDialog(result, config);
  }
  
  function showResultDialog(result, config) {
    var message = '<h3>Sitemap Monitor Results</h3>';
    message += '<p><strong>Total URLs in sitemap:</strong> ' + result.totalUrls + '</p>';
    message += '<p><strong>New URLs found:</strong> ' + result.newUrls + '</p>';
    message += '<p><strong>Updated URLs:</strong> ' + result.updatedUrls + '</p>';
    
    if (result.auditUpdated) {
      message += '<p style="color: #34a853;"><strong>✓ Audit updated successfully</strong></p>';
      message += '<p>Previous URL count: ' + result.previousUrlCount + '</p>';
      message += '<p>New total URL count: ' + result.totalUrlCount + '</p>';
      
      if (result.auditRun) {
        message += '<p style="color: #34a853;"><strong>✓ Audit started</strong></p>';
        message += '<p>Check ObservePoint for audit progress.</p>';
      }
    } else {
      message += '<p style="color: #5f6368;">No new URLs to add to audit.</p>';
    }
    
    message += '<p style="margin-top: 20px;"><em>Check the SitemapMonitor_Tracking sheet for details.</em></p>';
    
    var htmlOutput = HtmlService.createHtmlOutput(message)
      .setWidth(500)
      .setHeight(400);
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Monitor Complete');
  }
  
  return {
    initConfig: initConfig,
    runMonitor: runMonitor,
    showSetupDialog: showSetupDialog,
    handleSitemapSetup: handleSitemapSetup
  };
})();

function sitemapMonitor_initConfig() {
  SitemapMonitor.initConfig();
}

function sitemapMonitor_runMonitor() {
  try {
    var result = SitemapMonitor.runMonitor();
    
    var ui = SpreadsheetApp.getUi();
    var message = 'Sitemap Monitor Complete!\n\n' +
                  'Total URLs: ' + result.totalUrls + '\n' +
                  'New URLs: ' + result.newUrls + '\n' +
                  'Updated URLs: ' + result.updatedUrls + '\n\n';
    
    if (result.auditUpdated) {
      message += 'Audit updated: ' + result.previousUrlCount + ' → ' + result.totalUrlCount + ' URLs\n';
      if (result.auditRun) {
        message += 'Audit started successfully!\n';
      }
    } else {
      message += 'No new URLs to add to audit.\n';
    }
    
    message += '\nCheck the SitemapMonitor_Tracking sheet for details.';
    
    ui.alert('Monitor Complete', message, ui.ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function sitemapMonitor_showSetupDialog() {
  SitemapMonitor.showSetupDialog();
}

function handleSitemapSetup(config) {
  SitemapMonitor.handleSitemapSetup(config);
}
