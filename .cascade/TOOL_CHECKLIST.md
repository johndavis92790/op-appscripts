# New Tool Development Checklist

Use this checklist when creating a new tool for the library.

## Planning Phase

- [ ] Define tool purpose and use case
- [ ] Identify ObservePoint API endpoints needed
- [ ] Determine required user inputs (API key, IDs, etc.)
- [ ] Plan Google Sheets structure (what sheets will be created)
- [ ] Identify which shared libraries are needed
- [ ] Sketch out workflow/process flow

## File Structure

- [ ] Create tool files in `/src/` directory
- [ ] Add `ToolName.js` - Core tool logic and functions
- [ ] Add `ToolNameDialogs.js` - Interactive config and success dialogs
- [ ] Add menu items to `Main.js` for the new tool
- [ ] Update `src/README.md` with new tool documentation

## Code Requirements

### Main.js Structure

- [ ] `onOpen()` function creates menu
- [ ] Main function with try/catch error handling
- [ ] **Interactive config dialog check** (see DIALOG_PATTERN.md)
- [ ] Show dialog if config missing, execute if config exists
- [ ] Logging for all major operations
- [ ] Success dialog on completion (not basic alert)
- [ ] User-friendly alerts/notifications
- [ ] Comments explaining complex logic

### Configuration:
- [ ] Config sheet with clear labels and descriptions
- [ ] Validation of required config values
- [ ] Helpful error messages for missing config
- [ ] Default values where appropriate

### Logging:
- [ ] Use shared Logger for all operations
- [ ] Log INFO for normal operations
- [ ] Log WARN for recoverable issues
- [ ] Log ERROR for failures
- [ ] Include timestamps and context

### API Integration:
- [ ] Use shared ObservePointClient
- [ ] Handle API errors gracefully
- [ ] Implement retry logic for transient failures
- [ ] Respect rate limits
- [ ] Log all API calls

### Sheet Operations:
- [ ] Use shared SheetHelpers where possible
- [ ] Batch write operations (50000+ rows at once)
- [ ] Clear old data before writing new
- [ ] Format headers (bold, colored, frozen)
- [ ] Set appropriate column widths
- [ ] Handle empty/missing data

## Documentation

### README.md Must Include:
- [ ] Tool name and description
- [ ] Use case / purpose
- [ ] Features list
- [ ] Quick start guide
- [ ] Setup instructions
- [ ] Configuration details
- [ ] Usage instructions
- [ ] Troubleshooting section
- [ ] Example screenshots (if helpful)

### Code Comments:
- [ ] File-level JSDoc comment
- [ ] Function-level JSDoc comments
- [ ] Inline comments for complex logic
- [ ] TODO comments for future improvements

## Testing

- [ ] Test with valid configuration
- [ ] Test with missing/invalid configuration
- [ ] Test with small dataset first
- [ ] Test with large dataset (if applicable)
- [ ] Test error scenarios (API failures, etc.)
- [ ] Test in fresh Google Sheet
- [ ] Verify all menu items work
- [ ] Check execution logs for errors

## Deployment

- [ ] Test with `cd src && clasp push`
- [ ] Test in master Google Sheet with `clasp open`
- [ ] Verify all functions execute
- [ ] Check that sheets are created properly
- [ ] Confirm data is formatted correctly
- [ ] Test with real ObservePoint data
- [ ] Deploy new version: `./scripts/update-library.sh "Added ToolName"`
- [ ] Verify customer template includes new tool functions

## Library Integration

- [ ] Update main `/README.md` with new tool
- [ ] Add tool to `src/README.md` menu structure
- [ ] Deploy new library version with `./scripts/update-library.sh`
- [ ] Verify customer template auto-generates correctly
- [ ] Update CHANGELOG.md (auto-updated by deployment script)

## Quality Checks

### Code Quality:
- [ ] No hardcoded values (use config)
- [ ] **Interactive dialogs for config** (never show errors for missing config)
- [ ] Error messages are helpful
- [ ] Success dialogs show results clearly
- [ ] Code is commented
- [ ] Follows ES5 syntax (Apps Script compatible)
- [ ] No console.log (use Logger instead)
- [ ] Uses shared DIALOG_STYLES for consistency
- [ ] ES5 compatible (no ES6+ features)

### User Experience:
- [ ] Clear menu item names
- [ ] Helpful alert messages
- [ ] Progress indicators for long operations
- [ ] Confirmation dialogs for destructive actions
- [ ] Intuitive sheet names

### Performance:
- [ ] Batch operations where possible
- [ ] Minimize API calls
- [ ] Efficient data processing
- [ ] Stays under 6-minute execution limit
- [ ] Memory-efficient for large datasets

### Security:
- [ ] API keys stored in Config sheet (not hardcoded)
- [ ] No sensitive data in logs
- [ ] Proper OAuth scopes in appsscript.json
- [ ] Input validation for user-provided data

## Maintenance Considerations

- [ ] Tool version number in code
- [ ] Dependencies documented
- [ ] Breaking changes noted
- [ ] Migration path from old versions (if applicable)
- [ ] Known limitations documented

## Optional Enhancements

- [ ] Setup wizard for first-time users
- [ ] Data validation on Config sheet
- [ ] Export functionality
- [ ] Scheduling/automation options
- [ ] Custom formatting options
- [ ] Advanced filtering capabilities
- [ ] Integration with other tools

## Pre-Release Checklist

- [ ] All tests pass
- [ ] Documentation is complete
- [ ] Code is clean and commented
- [ ] No console.log() statements (use Logger)
- [ ] Error handling is comprehensive
- [ ] User experience is smooth
- [ ] Performance is acceptable
- [ ] Security best practices followed

## Post-Release

- [ ] Monitor for user issues
- [ ] Gather feedback
- [ ] Plan improvements
- [ ] Update documentation as needed
- [ ] Version bump for updates
