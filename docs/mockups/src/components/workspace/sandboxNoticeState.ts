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
 * the app deletes it. `refused`: the app keeps it, but a suspended org
 * refuses Restore, so the notice promises no files.
 */
export type ArchiveRestore = 'available' | 'refused'

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
 * Whether the panel takes the place of All files and Changes: while the
 * sandbox starts, while its start is refused, and after a failed first
 * start, which leaves no saved lists. A stopped sandbox, and one whose
 * later start failed, keep the lists that the workspace saved.
 */
export function replacesLists(panel: SandboxPanelState): boolean {
  switch (panel.problem) {
    case 'starting':
    case 'refused':
      return true
    case 'error':
      return panel.firstStart === true
    case 'stopped':
    case 'archived':
      return false
  }
}
