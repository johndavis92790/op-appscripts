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

### 1. Setup

From the Google Sheets menu:
```
ObservePoint Tools → Sitemap Monitor → Setup & Run Monitor
```

This opens a dialog where you enter:
- **ObservePoint API Key**: Your API key from ObservePoint
- **Audit ID**: The ID of the audit to update with new URLs
- **Sitemap URL**: The full URL to the sitemap XML file
- **Auto-run**: Whether to automatically run the audit after updating

### 2. First Run

On the first run, the tool will:
1. Fetch all URLs from the sitemap
2. Create a `SitemapMonitor_Tracking` sheet
3. Record all URLs as "New"
4. Add all URLs to your ObservePoint audit
5. Optionally run the audit

### 3. Subsequent Runs

On future runs, the tool will:
1. Fetch the current sitemap
2. Compare against tracked URLs
3. Identify new URLs and updated URLs
4. Add only new URLs to the audit
5. Update the tracking sheet
6. Optionally run the audit

## Configuration

### Using the Setup Dialog (Recommended)

The easiest way is to use the setup dialog:
```
ObservePoint Tools → Sitemap Monitor → Setup & Run Monitor
```

### Manual Configuration

Alternatively, you can manually configure:

1. Initialize the config sheet:
   ```
   ObservePoint Tools → Sitemap Monitor → Initialize Config
   ```

2. Fill in the `SitemapMonitor_Config` sheet:
   - `API_KEY`: Your ObservePoint API key
   - `AUDIT_ID`: The audit ID to update
   - `SITEMAP_URL`: The sitemap URL to monitor
   - `AUTO_RUN_AUDIT`: `true` or `false`

3. Run the monitor:
   ```
   ObservePoint Tools → Sitemap Monitor → Run Monitor
   ```

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
```
Sitemap URL: https://www.example.com/blog/sitemap.xml
Auto-run: true
```

Set up a time-based trigger to run daily.

### Track Product Pages

Monitor an e-commerce sitemap for new products:
```
Sitemap URL: https://www.example.com/products/sitemap.xml
Auto-run: true
```

### Monitor Multiple Sections

Create separate configurations for different site sections:
- Main sitemap: `https://www.example.com/sitemap.xml`
- Blog sitemap: `https://www.example.com/blog/sitemap.xml`
- Products sitemap: `https://www.example.com/products/sitemap.xml`

Each can update a different audit.

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
Sitemap URL: https://www.lumen.com/en-us/sitemap.xml
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
- Verify the URLs are being tracked correctly
- Check that the audit is being updated as expected

### 2. Choose Appropriate Frequency

Consider your site's update frequency:
- **High-frequency sites** (news, blogs): Daily or multiple times per day
- **Medium-frequency sites** (e-commerce): Daily or weekly
- **Low-frequency sites** (corporate): Weekly or monthly

### 3. Monitor the Tracking Sheet

Regularly review the `SitemapMonitor_Tracking` sheet:
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

**Result**: This is normal behavior - the audit won't be updated if there are no new URLs.

### "API Error 404: Audit not found"

**Cause**: The audit ID is incorrect or you don't have access to it.

**Solutions**:
- Verify the audit ID in ObservePoint
- Check that your API key has access to this audit
- Ensure the audit hasn't been deleted

### Tracking Sheet Not Updating

**Cause**: The sheet may be protected or there's a permissions issue.

**Solutions**:
- Check sheet protection settings
- Verify you have edit access to the spreadsheet
- Try manually deleting and recreating the tracking sheet

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
