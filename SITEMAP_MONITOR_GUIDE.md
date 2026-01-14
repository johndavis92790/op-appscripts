# Sitemap Monitor Guide

## Overview

The Sitemap Monitor tool automatically checks a sitemap for new pages and updates an ObservePoint audit with only the new URLs found. This is perfect for monitoring websites that frequently add new content.

## Features

- **Automatic URL Discovery**: Fetches and parses XML sitemaps
- **Change Tracking**: Monitors `lastmod` dates to detect updated pages
- **Smart Updates**: Only adds new URLs to your audit (doesn't duplicate existing ones)
- **Historical Tracking**: Maintains a record of all URLs and when they were discovered
- **Auto-Run Option**: Optionally runs the audit automatically after updating URLs
- **Google Sheets Integration**: All tracking data stored in your spreadsheet

## Quick Start

### 1. Initialize Configuration

From the Google Sheets menu:
```
ObservePoint Tools → Sitemap Monitor → Initialize Config
```

This creates a `SitemapMonitor_Config` sheet with these settings:
- **API_KEY**: Your ObservePoint API key
- **AUDIT_ID**: The ID of the audit to update with new URLs
- **SITEMAP_URL**: The full URL to the sitemap XML file
- **AUTO_RUN_AUDIT**: `true` or `false` - whether to automatically run the audit after updating

### 2. Fill in Configuration

Open the `SitemapMonitor_Config` sheet and fill in your values:
- Get your API key from: https://app.observepoint.com/my-profile
- Find your audit ID in the ObservePoint URL when viewing an audit
- Enter the full sitemap URL (e.g., `https://www.example.com/en-us/sitemap.xml`)

### 3. Run the Monitor

From the Google Sheets menu:
```
ObservePoint Tools → Sitemap Monitor → Run Monitor
```

On the first run, the tool will:
1. Fetch all URLs from the sitemap
2. Create a `SitemapMonitor_Tracking` sheet
3. Record all URLs as "New"
4. Add all URLs to your ObservePoint audit
5. Optionally run the audit

### 4. Subsequent Runs

On future runs, the tool will:
1. Fetch the current sitemap
2. Compare against tracked URLs
3. Identify new URLs and updated URLs
4. Add only new URLs to the audit
5. Update the tracking sheet
6. Optionally run the audit

### 5. Check Results

All progress and results are logged to the `Execution_Log` sheet:
- Monitor start/completion times
- Number of URLs found (total, new, updated)
- Audit update status
- Any errors encountered

Check the `SitemapMonitor_Tracking` sheet to see all discovered URLs and their status.

## Configuration

The tool uses a config-first approach with no interactive dialogs:

1. **Initialize**: Creates `SitemapMonitor_Config` sheet
2. **Configure**: Fill in your settings in the config sheet
3. **Run**: Execute the monitor
4. **Review**: Check `Execution_Log` for results

## Tracking Sheet

The `SitemapMonitor_Tracking` sheet contains:

| Column | Description |
|--------|-------------|
| **URL** | The page URL from the sitemap |
| **Last Modified** | The `lastmod` date from the sitemap |
| **First Seen** | When this URL was first discovered |
| **Last Checked** | When the URL was last checked |
| **Status** | `New`, `Updated`, or `Tracked` |

## Use Cases

### Monitor New Blog Posts

Check a blog sitemap daily for new posts:
1. Set `SITEMAP_URL` to `https://www.example.com/blog/sitemap.xml`
2. Set `AUTO_RUN_AUDIT` to `true`
3. Set up a time-based trigger to run `sitemapMonitor_runMonitor` daily

### Track Product Pages

Monitor an e-commerce sitemap for new products:
1. Set `SITEMAP_URL` to `https://www.example.com/products/sitemap.xml`
2. Set `AUTO_RUN_AUDIT` to `true`
3. Review `Execution_Log` to see when new products are added

### Monitor Multiple Sections

For multiple sitemaps, you can:
- Use separate Google Sheets for each sitemap
- Or modify the config sheet name in the code to support multiple configs
- Each configuration can update a different audit

## Automation with Triggers

To run the monitor automatically:

1. Open Apps Script editor: `Extensions → Apps Script`
2. Click on the clock icon (Triggers)
3. Click `+ Add Trigger`
4. Configure:
   - Function: `sitemapMonitor_runMonitor`
   - Event source: `Time-driven`
   - Type: `Day timer` or `Hour timer`
   - Time of day: Choose your preference

The monitor will now run automatically at your chosen interval.

## Example: Lumen.com Sitemap

For the Lumen.com sitemap provided:

```
Sitemap URL: https://www.example.com/en-us/sitemap.xml
```

This sitemap includes:
- 300+ URLs
- `lastmod` dates for each page
- `changefreq` and `priority` metadata

The tool will:
1. Parse all URLs and their lastmod dates
2. Track which pages are new vs. existing
3. Update your audit with only new pages
4. Monitor for changes on subsequent runs

## Best Practices

### 1. Start with Manual Runs

Before setting up automation:
- Run the monitor manually a few times
- Check the `Execution_Log` sheet for progress
- Verify the `SitemapMonitor_Tracking` sheet is populated correctly
- Confirm the audit is being updated in ObservePoint

### 2. Choose Appropriate Frequency

Consider your site's update frequency:
- **High-frequency sites** (news, blogs): Daily or multiple times per day
- **Medium-frequency sites** (e-commerce): Daily or weekly
- **Low-frequency sites** (corporate): Weekly or monthly

### 3. Monitor the Logs

Regularly review the `Execution_Log` sheet:
- Check for successful monitor runs
- Look for any errors or warnings
- Track how many new URLs are being discovered

And review the `SitemapMonitor_Tracking` sheet:
- Check for unexpected new URLs
- Verify lastmod dates are updating
- Look for patterns in when content is added

### 4. Audit Configuration

Ensure your ObservePoint audit is configured appropriately:
- Set reasonable crawl limits
- Configure appropriate filters
- Set up notifications for audit completion

### 5. Handle Large Sitemaps

For sitemaps with thousands of URLs:
- First run may take several minutes
- Consider breaking into multiple audits by section
- Monitor Google Sheets row limits (10 million cells per spreadsheet)

## Troubleshooting

### "Failed to fetch sitemap"

**Cause**: The sitemap URL is not accessible or returns an error.

**Solutions**:
- Verify the URL is correct and publicly accessible
- Check if the site requires authentication
- Try accessing the URL in a browser
- Check for SSL certificate issues

### "Failed to parse sitemap XML"

**Cause**: The sitemap is not valid XML or uses an unexpected format.

**Solutions**:
- Verify the sitemap follows the standard format
- Check for XML syntax errors
- Ensure the sitemap uses the correct namespace
- Try validating the sitemap with an online XML validator

### "No new URLs to add to audit"

**Cause**: All URLs in the sitemap are already tracked.

**Result**: This is normal behavior - the audit won't be updated if there are no new URLs. Check the `Execution_Log` sheet to confirm.

### "API Error 404: Audit not found"

**Cause**: The audit ID is incorrect or you don't have access to it.

**Solutions**:
- Verify the audit ID in ObservePoint
- Check that your API key has access to this audit
- Ensure the audit hasn't been deleted

### Tracking Sheet Not Updating

**Cause**: The sheet may be protected or there's a permissions issue.

**Solutions**:
- Check the `Execution_Log` sheet for error messages
- Verify sheet protection settings
- Ensure you have edit access to the spreadsheet
- Try manually deleting the tracking sheet and running again

### No Output or Errors

**Cause**: The function completed but you didn't see any feedback.

**Solution**: This is expected behavior - the tool runs silently. Check the `Execution_Log` sheet to see what happened.

## API Details

### Sitemap Format

The tool expects standard XML sitemap format:

```xml
<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.example.com/page1.html</loc>
    <lastmod>2025-01-06</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- More URLs... -->
</urlset>
```

### ObservePoint API Calls

The tool makes these API calls:
1. `GET /v2/web-audits/{auditId}` - Fetch current audit configuration
2. `PUT /v2/web-audits/{auditId}` - Update audit with new URLs
3. `POST /v2/web-audits/{auditId}/run` - Run the audit (if auto-run enabled)

## Advanced Usage

### Custom Processing

You can modify `SitemapMonitor.js` to add custom logic:

```javascript
// Example: Only add URLs matching a pattern
function identifyNewUrls(sitemapUrls, trackedUrls) {
  var newUrls = [];
  
  for (var i = 0; i < sitemapUrls.length; i++) {
    var url = sitemapUrls[i].url;
    
    // Custom filter: only blog posts
    if (url.indexOf('/blog/') === -1) {
      continue;
    }
    
    if (!trackedUrls[url]) {
      newUrls.push(sitemapUrls[i]);
    }
  }
  
  return { newUrls: newUrls, updatedUrls: [] };
}
```

### Multiple Sitemaps

To monitor multiple sitemaps:
1. Create separate config sheets for each sitemap
2. Modify the tool to accept a config sheet parameter
3. Set up separate triggers for each sitemap

### Integration with Other Tools

Combine with other ObservePoint tools:
- Use Grid API Importer to analyze audit results
- Set up Webhook Automation for broken link detection
- Chain multiple audits together

## Support

For issues or questions:
1. Check the `Execution_Log` sheet for error details
2. Review this guide's troubleshooting section
3. Verify your ObservePoint API key and audit access
4. Check the ObservePoint API documentation

## Version History

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.
