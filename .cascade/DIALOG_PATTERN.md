# Interactive Dialog Pattern for All Tools

## Standard User Experience Pattern

All tools in the ObservePoint CSM Toolbelt should follow this interactive dialog pattern for configuration and execution.

## Core Principle

**Never show errors for missing configuration. Always show a dialog to collect it.**

When a user runs a tool:
1. Check if configuration exists
2. If missing or incomplete → Show interactive dialog to collect it
3. If complete → Execute the tool with existing config
4. On completion → Show success dialog with results

## Implementation Pattern

### 1. Tool Entry Point

```javascript
function toolName_mainAction() {
  try {
    // Check if config exists
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName('ToolName_Config');
    
    let requiredParam1, requiredParam2;
    
    try {
      requiredParam1 = getConfigValue('PARAM1');
      requiredParam2 = getConfigValue('PARAM2');
    } catch (e) {
      // Config doesn't exist or is incomplete
      requiredParam1 = null;
      requiredParam2 = null;
    }
    
    if (!requiredParam1 || !requiredParam2) {
      // Show interactive config dialog
      showToolConfigDialog();
      return;
    }
    
    // Config exists, proceed with tool execution
    executeToolLogic(requiredParam1, requiredParam2);
    
  } catch (error) {
    Logger.error('tool_failed', error.toString());
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}
```

### 2. Configuration Dialog

Create a separate dialog file: `ToolNameDialogs.js`

```javascript
function showToolConfigDialog() {
  // Check for existing config to pre-fill form
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName('ToolName_Config');
  
  let existingParam1 = '';
  let existingParam2 = '';
  
  if (configSheet) {
    try {
      const data = configSheet.getRange('A2:B10').getValues();
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === 'PARAM1') existingParam1 = data[i][1] || '';
        if (data[i][0] === 'PARAM2') existingParam2 = data[i][1] || '';
      }
    } catch (e) {
      // Config sheet exists but is empty
    }
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        ${DIALOG_STYLES}
        <style>
          .form-group {
            margin: 16px 0;
          }
          label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
          }
          input {
            width: 100%;
            padding: 10px;
            border: 1px solid #dadce0;
            border-radius: 4px;
            box-sizing: border-box;
          }
          .help-text {
            font-size: 12px;
            color: #5f6368;
            margin-top: 4px;
          }
          .required {
            color: #ea4335;
          }
        </style>
      </head>
      <body>
        <h2>🔧 Tool Name Configuration</h2>
        
        <p>Brief description of what this tool does.</p>
        
        <form id="configForm">
          <div class="form-group">
            <label>Parameter 1 <span class="required">*</span></label>
            <input type="text" id="param1" value="${existingParam1}" required>
            <div class="help-text">Help text for this parameter</div>
          </div>
          
          <div class="form-group">
            <label>Parameter 2 <span class="required">*</span></label>
            <input type="text" id="param2" value="${existingParam2}" required>
            <div class="help-text">Help text for this parameter</div>
          </div>
        </form>
        
        <div class="button-container">
          <button class="btn-cancel" onclick="google.script.host.close()">Cancel</button>
          <button class="btn-primary" onclick="handleSave(this)">Save & Run</button>
        </div>
        
        <script>
          function handleSave(button) {
            const form = document.getElementById('configForm');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }
            
            const param1 = document.getElementById('param1').value.trim();
            const param2 = document.getElementById('param2').value.trim();
            
            // Disable buttons and show spinner
            const buttons = document.querySelectorAll('button');
            buttons.forEach(btn => btn.disabled = true);
            button.innerHTML += '<span class="spinner"></span>';
            
            google.script.run
              .withSuccessHandler(function() {
                google.script.host.close();
              })
              .withFailureHandler(function(error) {
                buttons.forEach(btn => btn.disabled = false);
                alert('Error: ' + error.message);
              })
              .saveConfigAndRun(param1, param2);
          }
        </script>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(550)
    .setHeight(500);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Tool Configuration');
}

function saveConfigAndRun(param1, param2) {
  // Save config to sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName('ToolName_Config');
  
  if (!configSheet) {
    configSheet = ss.insertSheet('ToolName_Config');
  }
  
  configSheet.clear();
  
  const headers = [
    ['Setting', 'Value', 'Description'],
    ['PARAM1', param1, 'Description of param1'],
    ['PARAM2', param2, 'Description of param2']
  ];
  
  configSheet.getRange(1, 1, headers.length, 3).setValues(headers);
  configSheet.getRange(1, 1, 1, 3)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');
  
  Logger.info('config_saved', 'Configuration saved');
  
  // Run tool immediately
  toolName_mainAction();
}
```

### 3. Success Dialog

```javascript
function showToolSuccessDialog(result) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        ${DIALOG_STYLES}
      </head>
      <body>
        <h2>Success! ✅</h2>
        
        <div class="section success-section">
          <p><strong>Result:</strong> ${result.summary}</p>
          <p><strong>Details:</strong> ${result.details}</p>
        </div>
        
        <div class="button-container">
          <button class="btn-primary" onclick="google.script.host.close()">Done</button>
        </div>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(500)
    .setHeight(300);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Complete');
}
```

## Required Components

### 1. Dialog Styles (Already Available)

Use the shared `DIALOG_STYLES` constant from `DialogTemplates.js`:
- Modern Google-style UI
- Responsive buttons with hover states
- Loading spinners
- Color-coded sections (success, warning, error)

### 2. Form Validation

- Use HTML5 validation (`required` attribute)
- Check form validity before submission
- Show helpful error messages
- Pre-fill existing values when editing

### 3. Loading States

- Disable buttons during async operations
- Show spinner on active button
- Handle errors gracefully
- Re-enable buttons on failure

### 4. User Feedback

- Clear success messages
- Helpful error messages
- Progress indicators for long operations
- Links to relevant resources

## Benefits

1. **Zero Friction**: Users never see cryptic errors
2. **Self-Documenting**: Dialogs explain what each parameter does
3. **Forgiving**: Can update config anytime by re-running
4. **Professional**: Modern, polished UI
5. **Consistent**: Same pattern across all tools

## Examples in Codebase

- **Grid API Importer**: `GridImporterDialogs.js` - Simple config dialog
- **Webhook Automation**: `WizardDialogs.js` - Multi-step wizard
- **Dialog Templates**: `DialogTemplates.js` - Shared styles and patterns

## When Building New Tools

1. Create `ToolNameDialogs.js` file
2. Implement `showToolConfigDialog()` function
3. Add config check at start of main function
4. Show dialog if config missing
5. Show success dialog on completion
6. Use shared `DIALOG_STYLES` for consistency

## Testing Checklist

- [ ] Tool runs with existing config (no dialog shown)
- [ ] Tool shows dialog when config missing
- [ ] Dialog pre-fills existing values
- [ ] Form validation works
- [ ] Save button shows spinner
- [ ] Tool executes after save
- [ ] Success dialog shows results
- [ ] Error handling works gracefully
