import type { ChangesResponse } from '../../shared/generated/ChangesResponse'
import type { ChangesResponseSummary } from '../../shared/generated/ChangesResponseSummary'

/**
 * The totals of the whole change, which the summary and the tab of Changes
 * show: the summary of the listed files plus the omitted totals of the
 * report. A report without omitted totals, as from an older runner, counts
 * only its listed files.
 */
export function wholeChange(changes: ChangesResponse): ChangesResponseSummary {
  const { summary, omitted } = changes
  if (!omitted) return summary
  return {
    files: summary.files + omitted.files,
    added: summary.added + omitted.added,
    removed: summary.removed + omitted.removed,
  }
}
