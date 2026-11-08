/**
 * The one contract of the notices of a sandbox that is not running. The
 * mockups and the app draw them from these types, and nothing else defines
 * them.
 */

/**
 * Why the sandbox is not running. `refused` is a start that the app
 * refuses, such as while the owner of the workspace or its org is
 * suspended.
 */
export type SandboxProblem = 'stopped' | 'error' | 'refused' | 'archived'

/**
 * What the bar in place of the composer shows. A refused start carries the
 * words of the app's refusal, so one notice serves every reason. A start
 * that failed can carry the message that the workspace saved for it, such
 * as the 20-minute limit of a start.
 */
export type SandboxNoticeState =
  | { problem: 'stopped' | 'archived' }
  | { problem: 'error'; message?: string | null }
  | { problem: 'refused'; reason: string }

/**
 * What a panel of the files or the tools shows in place of its content: the
 * whole notice of the bar, also the words of a refused start, or the wait of
 * a start.
 */
export type SandboxPanelState = SandboxNoticeState | { problem: 'starting' }
