import type { Delay } from '../app/events'
import type { Readable } from '../app/store'
import type { GitHubCapabilities } from '../shared/github'
import type { ContinueActions } from './continueActions'
import type { createGitHubActions } from './githubActions'
import type { GitHubState } from './githubStore'

// What the store of the bar actions, `BarActions`, gets from the app.

/** How a fixed prompt ended, as the send of the chat reports it. */
export type PromptResult = 'sent' | 'failed' | 'blocked' | 'unavailable'

/**
 * The last access of the member to the repository of the workspace that
 * this tab read. Another workspace of the same repository shows it at
 * once, while the bar reads the access again.
 */
export interface AccessMemory {
  get: () => GitHubCapabilities | undefined
  /** Keeps a new answer, or forgets the access after a failed read. */
  set: (capabilities: GitHubCapabilities | undefined) => void
}

export interface BarActionsPorts {
  /**
   * The branch of the workspace that the bar shows. Continue starts from it,
   * and a new branch gets a new action state, so no question, run, or
   * outcome of the old branch stays.
   */
  branch: string
  github: ReturnType<typeof createGitHubActions>
  continues: ContinueActions
  /**
   * The send of a fixed prompt to the session of the chat, which keeps the
   * client ID of a prompt that did not send for a second try there.
   */
  sendPrompt: (text: string) => Promise<PromptResult>
  delay: Delay
  /** The GitHub state of the bar. A new state ends the outcome that shows. */
  githubState: Readable<GitHubState>
  /** Reads the shared GitHub state again, as after a merge. */
  refreshGitHub: () => void
  /** The number through which the workspace stream applied its events. */
  streamLast: Readable<number>
  /** Grows with each reconnect of the workspace stream. */
  reconnects: Readable<number>
  /** The access that the tab read last. Without it, the access loads. */
  access?: AccessMemory
}
