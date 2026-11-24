import type { ChangesResponseSummary } from '../../../shared/generated/ChangesResponseSummary'

// The totals of Changes, which the app and the mockups share. `listed`
// counts the files that a changes report lists, with the lines that they
// add and remove, and `omitted` counts the files that it leaves out.
// Missing omitted totals are unknown, not zero, as in a report of an older
// runner.

/**
 * The totals of the whole change, which the summary and the tab of Changes
 * show: the listed files plus the omitted files. With unknown omitted
 * totals, only the listed files count.
 */
export function wholeChange(
  listed: ChangesResponseSummary,
  omitted?: ChangesResponseSummary,
): ChangesResponseSummary {
  if (!omitted) return listed
  return {
    files: listed.files + omitted.files,
    added: listed.added + omitted.added,
    removed: listed.removed + omitted.removed,
  }
}

/**
 * Whether Changes shows its empty state: the whole change has no file. A
 * list that leaves out files has changes, also when it lists none of them.
 */
export function noChanges(
  listed: ChangesResponseSummary,
  omitted?: ChangesResponseSummary,
): boolean {
  return wholeChange(listed, omitted).files === 0
}
