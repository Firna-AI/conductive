import { formatCount } from '../common/counts'

/**
 * The words of the file lists that leave out entries: the notices of All
 * files and Changes, and the line of the list of `@` when nothing that it
 * lists matches. The words name the files that the list does not show and
 * where the member finds them. They use the counts of the lists, never the
 * limits of the reports.
 */

/** The lists that can leave out entries. */
export const omittedLists = ['all-files', 'changes'] as const

export type OmittedList = (typeof omittedLists)[number]

/**
 * The notice of All files, which counts files and folders together,
 * because the limit counts each folder too.
 */
function treeText(entries: number): string {
  if (entries === 1) {
    return '1 file or folder is not listed. Find it in the terminal, or ask the agent.'
  }
  return `${formatCount(entries)} files and folders are not listed. Find them in the terminal, or ask the agent.`
}

/**
 * The notice under the summary of Changes. The summary counts the whole
 * change, so the notice says that its totals hold the files that the list
 * does not show.
 */
function changesText(files: number): string {
  if (files === 1) {
    return 'The totals include 1 file that is not listed. Review it in the terminal, or ask the agent.'
  }
  return `The totals include ${formatCount(files)} files that are not listed. Review them in the terminal, or ask the agent.`
}

/** The words of the notice of a list that leaves out `count` entries. */
export function omittedText(list: OmittedList, count: number): string {
  return list === 'all-files' ? treeText(count) : changesText(count)
}

/**
 * The line of the list of `@` when nothing that it lists matches the query,
 * while All files leaves out entries. A path that the list does not offer
 * stays text in the message, so the member types it or asks the agent.
 */
export function omittedMentionLine(query: string): string {
  return `Nothing matches “${query}”. Some files are not listed, so type the path or ask the agent.`
}
