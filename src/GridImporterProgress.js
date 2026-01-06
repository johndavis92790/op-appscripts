/**
 * Progress tracking functions for Grid Importer
 * Allows real-time progress updates in the UI dialog
 */

/**
 * Update import progress
 */
function updateImportProgress(status, details, percent, complete) {
  IMPORT_PROGRESS = {
    status: status,
    details: details,
    percent: Math.min(100, Math.max(0, percent)),
    complete: complete
  };
}

/**
 * Get current import progress (called by dialog polling)
 */
function getImportProgress() {
  return IMPORT_PROGRESS;
}
