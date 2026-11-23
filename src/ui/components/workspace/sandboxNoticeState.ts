/**
 * The one contract of the notices of a sandbox that is not running. The
 * mockups and the app draw them from these types and this rule, and nothing
 * else defines them.
 */

import type { ArchivedComputerState } from '../../../shared/generated/ArchivedComputerState'

/**
 * Why the sandbox is not running. `refused` is a start that the app
 * refuses, such as while the owner of the workspace or its org is
 * suspended.
 */
export type SandboxProblem = 'stopped' | 'error' | 'refused' | 'archived'

/**
 * What an archived workspace can get back. `available`: the workspace names
 * its stopped cloud computer, and every member may restore it until the
 * last day of Restore. `refused`: the workspace names it, but a suspended
 * org refuses Restore, so the notice promises no files. `ended`: the last
 * day of Restore passed, so the workspace is removed too. Restore alone
 * does not say whether a cloud computer can still exist.
 */
export type ArchiveRestore = 'available' | 'refused' | 'ended'

/**
 * What the bar of a sandbox that is not running shows. A refused start
 * carries the words of the app's refusal, so one notice serves every
 * reason. A start that failed can carry the message that the workspace
 * saved for it, such as the 20-minute limit of a start. `firstStart` marks
 * the failed first start of a new workspace. The workspace keeps its chat
 * and its queued messages, and it has no files yet. An archived workspace
 * says what it can get back, and what the app knows of its cloud computer
 * apart from Restore, as `archiveStage` reads them: `may-exist` while the
 * workspace names it or a create or a delete of one is still open,
 * `deleted` after a confirmed delete, and `unknown` when no record says
 * either. A reply of an older Worker has no `computer`. `removed` marks an
 * archived workspace whose 14 days ended: it left the list, and only a link
 * opens it. Until then, the notice gives the day when it leaves the list.
 */
export type SandboxNoticeState =
  | { problem: 'stopped' }
  | {
      problem: 'archived'
      restore?: ArchiveRestore
      removed?: boolean
      computer?: ArchivedComputerState
    }
  | { problem: 'error'; message?: string | null; firstStart?: boolean }
  | { problem: 'refused'; reason: string }

/**
 * What a panel of the files or the tools shows in place of its content: the
 * whole notice of the bar, also the words of a refused start, or the wait of
 * a start.
 */
export type SandboxPanelState = SandboxNoticeState | { problem: 'starting' }

/**
 * Whether the bar takes the place of the composer. After a failed first
 * start, the composer stays under the bar, so that members can still queue
 * messages until Try again starts the sandbox.
 */
export function replacesComposer(state: SandboxNoticeState): boolean {
  return state.problem !== 'error' || state.firstStart !== true
}

/**
 * Whether the panel takes the place of a file or a diff that a tab already
 * shows: while the start is refused, with the words of the refusal, and
 * after a failed first start, with Try again. While the sandbox starts, and
 * while it is stopped or after a later failed start, the tab keeps it.
 */
export function replacesShownFile(panel: SandboxPanelState): boolean {
  switch (panel.problem) {
    case 'refused':
      return true
    case 'error':
      return panel.firstStart === true
    case 'starting':
    case 'stopped':
    case 'archived':
      return false
  }
}

/**
 * Whether the panel takes the place of All files or Changes. `saved` says
 * that the workspace keeps a copy of the list. While the sandbox starts, a
 * list shows its saved copy, and the wait takes the place of a list without
 * one, as on the first start of a new workspace. A refused start and a
 * failed first start take the place of the list, as of a shown file. A
 * stopped sandbox, and one whose later start failed, keep the list.
 */
export function replacesList(
  panel: SandboxPanelState,
  saved: boolean,
): boolean {
  return panel.problem === 'starting' ? !saved : replacesShownFile(panel)
}

type ArchivedNotice = Extract<SandboxNoticeState, { problem: 'archived' }>

/**
 * How far an archived workspace is, for its words. In its 14 days:
 * `available`, with Restore until its last day, `history`, which promises
 * only the chat history, or `deleted`, whose cloud computer is deleted.
 * After them it is removed: `deleting`, while its cloud computer can still
 * exist, or `removed`, after the delete. Restore ends with the 14 days, so
 * a removed workspace has none.
 */
type ArchiveStage = 'available' | 'history' | 'deleted' | 'deleting' | 'removed'

/**
 * Whether the 14 days of an archived workspace ended: it left the list, or
 * its last day of Restore passed. Restore gives only that day here, and
 * never what the app knows of the cloud computer.
 */
function daysEnded(notice: ArchivedNotice): boolean {
  return notice.removed === true || notice.restore === 'ended'
}

/**
 * The stage of an archived workspace. What the app knows of the cloud
 * computer decides what the words say of it. Restore decides only what a
 * cloud computer that can still exist gives back. Without Restore, such as
 * in a suspended org, or while an unresolved create request can still hold
 * a cloud computer that the workspace does not name, the notice promises
 * only the chat history. After the 14 days, it says that such a cloud
 * computer is being deleted.
 */
export function archiveStage(notice: ArchivedNotice): ArchiveStage {
  switch (notice.computer) {
    case 'may-exist':
      if (daysEnded(notice)) return 'deleting'
      return notice.restore === 'available' ? 'available' : 'history'
    case 'deleted':
      return daysEnded(notice) ? 'removed' : 'deleted'
    case 'unknown':
    case undefined:
      return restoreStage(notice)
  }
}

/**
 * The stage from Restore alone, as the notice read it before it knew the
 * cloud computer: without Restore, it says that the cloud computer is
 * deleted. An unknown cloud computer, and a reply without `computer` from
 * an older Worker, keep this reading until
 * `plans/follow-ups/archived-computer-unknown-outcome.md` settles their
 * words.
 */
function restoreStage(notice: ArchivedNotice): ArchiveStage {
  if (notice.restore === 'ended') return 'deleting'
  if (notice.removed === true) return 'removed'
  switch (notice.restore) {
    case 'available':
      return 'available'
    case 'refused':
      return 'history'
    case undefined:
      return 'deleted'
  }
}
