# ObservePoint API Patterns & Examples

## Authentication

All API requests require an API key in the Authorization header:

```javascript
const options = {
  method: 'get',
  headers: {
    'Authorization': `api_key ${apiKey}`,
    'Accept': 'application/json'
  },
  muteHttpExceptions: true
};
```

## Common Endpoints

### Grid API (v3) - Report Data

**Fetch Saved Report Configuration**
```javascript
GET https://api.observepoint.com/v3/reports/grid/saved/{reportId}

// Returns query definition to use for fetching actual data
```

**Fetch Grid Data**
```javascript
POST https://api.observepoint.com/v3/reports/grid/{entityType}

// entityType: 'links', 'pages', 'tags', etc.
// Body: queryDefinition with pagination
{
  "pagination": {
    "page": 0,
    "rows": 1000
  },
  "filters": [...],
  "columns": [...]
}
```

### Audit API (v2) - Audit Management

**List Audits**
```javascript
GET https://api.observepoint.com/v2/web-audits
```

**Get Audit Details**
```javascript
GET https://api.observepoint.com/v2/web-audits/{auditId}
```

**Update Audit URLs**
```javascript
PUT https://api.observepoint.com/v2/web-audits/{auditId}
{
  "urls": ["https://example.com/page1", "https://example.com/page2"]
}
```

**Run Audit**
```javascript
POST https://api.observepoint.com/v2/web-audits/{auditId}/run
```

**Get Latest Run**
```javascript
GET https://api.observepoint.com/v2/web-audits/{auditId}/runs?limit=1&sort=-id
```

## Pagination Pattern

Grid API uses page-based pagination:

```javascript
function fetchAllPages(apiKey, queryDefinition, entityType) {
  let allRows = [];
  let page = 0;
  const rowsPerPage = 1000;
  
  while (true) {
    const payload = {
      ...queryDefinition,
      pagination: { page, rows: rowsPerPage }
    };
    
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': `api_key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });
    
    const data = JSON.parse(response.getContentText());
    
    if (!data.rows || data.rows.length === 0) break;
    
    allRows = allRows.concat(data.rows);
    
    if (data.rows.length < rowsPerPage) break;
    
    page++;
  }
  
  return allRows;
}
```

## Error Handling Pattern

```javascript
function makeApiCall(url, options) {
  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    
    if (code >= 400) {
      const error = JSON.parse(response.getContentText());
      throw new Error(`API Error ${code}: ${error.message || response.getContentText()}`);
    }
    
    return JSON.parse(response.getContentText());
  } catch (e) {
    Logger.log('ERROR', 'api_call', `${url} failed: ${e.toString()}`);
    throw e;
  }
}
```

## Rate Limiting

ObservePoint API has rate limits. Implement retry with exponential backoff:

```javascript
function apiCallWithRetry(url, options, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      
      if (response.getResponseCode() === 429) {
        const waitTime = Math.pow(2, retries) * 1000;
        Utilities.sleep(waitTime);
        retries++;
        continue;
      }
      
      return response;
    } catch (e) {
      if (retries === maxRetries - 1) throw e;
      retries++;
      Utilities.sleep(Math.pow(2, retries) * 1000);
    }
  }
}
```

## Data Extraction Pattern

Grid API returns data in specific format:

```javascript
// Response structure
{
  "columns": [
    { "id": "LINK_URL", "label": "Link URL", "type": "string" },
    { "id": "STATUS_CODE", "label": "Status Code", "type": "number" }
  ],
  "rows": [
    {
      "LINK_URL": { "value": "https://example.com" },
      "STATUS_CODE": { "value": 404 }
    }
  ],
  "metadata": {
    "pagination": { "page": 0, "rows": 1000, "total": 50000 }
  }
}

// Extract to array format
function extractRows(data) {
  const columnIds = data.columns.map(col => col.id);
  
  return data.rows.map(row => {
    return columnIds.map(colId => {
      const cell = row[colId];
      return cell?.value ?? '';
    });
  });
}
```

## Common Filters

```javascript
// Status code filter
{
  "columnId": "STATUS_CODE",
  "operator": "IN",
  "values": [404, 500, 502, 503]
}

// Exclude specific codes
{
  "columnId": "STATUS_CODE",
  "operator": "NOT_IN",
  "values": [403, 429]
}

// Text contains
{
  "columnId": "PAGE_URL",
  "operator": "CONTAINS",
  "value": "/blog/"
}

// Date range
{
  "columnId": "SCAN_DATE",
  "operator": "BETWEEN",
  "values": ["2024-01-01", "2024-12-31"]
}
```

## Webhook Payload

When ObservePoint sends webhook on audit completion:

```javascript
// POST to your web app URL
{
  "event": "audit.completed",
  "auditId": 2018768,
  "runId": 8507342,
  "status": "completed",
  "timestamp": "2024-12-23T10:00:00Z"
}

// Handle in doPost
function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const auditId = payload.auditId;
  const runId = payload.runId;
  
  // Process audit results
  processAuditCompletion(auditId, runId);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success'
  })).setMimeType(ContentService.MimeType.JSON);
}
```

## Column ID Reference

Common column IDs in Grid API:

### Links Entity
- `LINK_URL` - The link URL
- `PAGE_URL` - Page containing the link
- `LINK_TEXT` - Anchor text
- `STATUS_CODE` - HTTP status code
- `ELEMENT_SELECTOR` - CSS selector
- `ELEMENT_HTML` - Full HTML element

### Pages Entity
- `PAGE_URL` - Page URL
- `PAGE_TITLE` - Page title
- `STATUS_CODE` - HTTP status code
- `LOAD_TIME` - Page load time
- `PAGE_SIZE` - Page size in bytes

### Tags Entity
- `TAG_NAME` - Tag/tool name
- `PAGE_URL` - Page URL
- `TAG_PRESENT` - Boolean presence
- `TAG_VERSION` - Version detected

## Best Practices

1. **Always use muteHttpExceptions: true** - Handle errors yourself
2. **Log all API calls** - Essential for debugging
3. **Paginate large datasets** - Don't try to fetch everything at once
4. **Cache query definitions** - Reduce API calls
5. **Validate API keys** - Check before making multiple calls
6. **Use specific column IDs** - Don't rely on column order
7. **Handle missing data** - Use optional chaining or defaults
8. **Batch Sheet writes** - Write 50000+ rows at once when possible
9. **Monitor execution time** - Apps Script has 6-minute limit
10. **Test with small datasets first** - Use MAX_PAGES limit

## Testing API Calls

Use curl to test before implementing:

```bash
export OP_API_KEY="your_key_here"

# Test saved report
curl -s "https://api.observepoint.com/v3/reports/grid/saved/16008" \
  -H "Authorization: api_key ${OP_API_KEY}" | jq

# Test audit details
curl -s "https://api.observepoint.com/v2/web-audits/2018768" \
  -H "Authorization: api_key ${OP_API_KEY}" | jq
```
