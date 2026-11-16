/**
 * The one contract of the notices of a sandbox that is not running. The
 * mockups and the app draw them from these types and this rule, and nothing
 * else defines them.
 */

/**
 * Why the sandbox is not running. `refused` is a start that the app
 * refuses, such as while the owner of the workspace or its org is
 * suspended.
 */
export type SandboxProblem = 'stopped' | 'error' | 'refused' | 'archived'

/**
 * What an archived workspace can get back. `available`: the app keeps its
 * stopped cloud computer, and every member may restore the workspace until
 * the last day of Restore. `refused`: the app keeps it, but a suspended org
 * refuses Restore, so the notice promises no files. `ended`: the last day
 * of Restore passed. The app can still keep the cloud computer while its
 * delete tries again, so the notice says nothing of the cloud computer.
 */
export type ArchiveRestore = 'available' | 'refused' | 'ended'

/**
 * What the bar of a sandbox that is not running shows. A refused start
 * carries the words of the app's refusal, so one notice serves every
 * reason. A start that failed can carry the message that the workspace
 * saved for it, such as the 20-minute limit of a start. `firstStart` marks
 * the failed first start of a new workspace. The workspace keeps its chat
 * and its queued messages, and it has no files yet. An archived workspace
 * without `restore` has no cloud computer left, so nothing comes back.
 */
export type SandboxNoticeState =
  | { problem: 'stopped' }
  | { problem: 'archived'; restore?: ArchiveRestore }
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
