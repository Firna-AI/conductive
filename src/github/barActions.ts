import type { Delay } from '../app/events'
import type { Readable } from '../app/store'
import type { LocalWork } from '../shared/workspaces'
import {
  continueOutcome,
  mergeOutcome,
  pendingJobWait,
  streamReaches,
  waitFor,
} from './barRuns'
import type { BarOutcome, CapabilityState } from './barView'
import type { ContinueActions } from './continueActions'
import type { createGitHubActions } from './githubActions'
import type { GitHubSnapshot } from './githubClient'
import type { GitHubState } from './githubStore'

/** How a fixed prompt ended, as the send of the chat reports it. */
export type PromptResult = 'sent' | 'failed' | 'blocked' | 'unavailable'

/** The question of Continue after its check found local work. */
interface ContinueQuestion {
  branch: string
  baseBranch: string
  localWork: LocalWork
}

export interface BarActionsSnapshot {
  capabilities: CapabilityState
  outcome: BarOutcome | null
  question: ContinueQuestion | null
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
}

/**
 * The actions of the pull request bar of one workspace and one member, for
 * the desktop bar and the top of the phone Checks tab alike. It keeps the
 * member's own GitHub access out of the shared GitHub state. It runs one
 * merge or one Continue at a time, and reads a pending job again until it
 * ends. An outcome, such as a refusal, shows until the bar shows a newer
 * GitHub state. The stop of `connect` ends each read and each run.
 */
export class BarActions {
  private snapshot: BarActionsSnapshot = {
    capabilities: { status: 'loading' },
    outcome: null,
    question: null,
  }
  private readonly listeners = new Set<() => void>()
  private readonly ports: BarActionsPorts
  /** The GitHub state of an ended outcome, or null while its run goes on. */
  private outcomeAt: GitHubState | null = null
  private run: AbortController | null = null
  private reading: AbortController | null = null
  /** A prompt sends now, so a second press does nothing. */
  private prompting = false

  constructor(ports: BarActionsPorts) {
    this.ports = ports
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = (): BarActionsSnapshot => this.snapshot

  /** Reads the access now and after each reconnect, until the stop. */
  readonly connect = (): (() => void) => {
    const stops = [
      this.ports.reconnects.subscribe(() => this.readCapabilities()),
      this.ports.githubState.subscribe(() => this.githubChanged()),
    ]
    this.readCapabilities()
    return () => {
      for (const stop of stops) stop()
      this.reading?.abort()
      this.reading = null
      if (this.run) {
        this.run.abort()
        this.run = null
        this.update({ outcome: null })
      }
      if (this.snapshot.question) this.update({ question: null })
    }
  }

  /** Merges the head that the bar shows, with the member's method. */
  async merge(snapshot: GitHubSnapshot): Promise<void> {
    const pullRequest = snapshot.banner.pullRequest
    const access = this.snapshot.capabilities
    const method =
      access.status === 'ready' ? access.capabilities.mergeMethod : null
    if (pullRequest === null || method === null) return
    const run = this.begin({ kind: 'merging' })
    if (!run) return
    const { signal } = run
    const { github } = this.ports
    try {
      let reply = await github.merge(
        { headSha: pullRequest.headSha, method },
        signal,
      )
      while (reply.state === 'pending') {
        await waitFor(this.ports.delay, pendingJobWait, signal)
        reply = await github.mergeResult(reply.mergeId, signal)
      }
      // Merging shows until the bar reads the merged state.
      if (this.end(run, { kind: 'merging' })) this.ports.refreshGitHub()
    } catch (error) {
      if (signal.aborted) return
      const outcome = mergeOutcome(error)
      const noRight =
        outcome.kind === 'merge-refused' && outcome.reason === 'merge-no-right'
      // GitHub took the right away, so the access is read again.
      if (this.end(run, outcome) && noRight) this.readCapabilities()
    }
  }

  /**
   * Continues on a new branch from the branch of the bar. Local work ends
   * the run with the question. The run ends when the stream shows the new
   * branch and the notes.
   */
  async continueWorkspace(allowLocalWork = false): Promise<void> {
    const run = this.begin({ kind: 'continuing' })
    if (!run) return
    const { signal } = run
    const { continues } = this.ports
    try {
      let reply = await continues.start({
        expectedBranch: this.ports.branch,
        ...(allowLocalWork ? { allowLocalWork } : {}),
      })
      while (reply.state === 'pending') {
        await waitFor(this.ports.delay, pendingJobWait, signal)
        reply = await continues.result(reply.continueId)
      }
      if (signal.aborted) return
      if (reply.state === 'confirmation-required') {
        const { branch: from, baseBranch, localWork } = reply
        if (this.end(run, null)) {
          this.update({ question: { branch: from, baseBranch, localWork } })
        }
        return
      }
      await streamReaches(this.ports.streamLast, reply.eventNumber, signal)
      this.end(run, null)
    } catch (error) {
      if (signal.aborted) return
      this.end(run, continueOutcome(error))
    }
  }

  /** Continue anyway, after the question listed the local work. */
  confirmContinue(): void {
    if (this.snapshot.question) void this.continueWorkspace(true)
  }

  /** Cancel of the question, which sends nothing. */
  cancelContinue(): void {
    this.update({ question: null })
  }

  /** Sends a fixed prompt through the chat. A press while it sends does nothing. */
  async sendPrompt(text: string): Promise<PromptResult | null> {
    if (this.prompting) return null
    this.prompting = true
    try {
      return await this.ports.sendPrompt(text)
    } finally {
      this.prompting = false
    }
  }

  private readCapabilities(): void {
    this.reading?.abort()
    const reading = new AbortController()
    this.reading = reading
    const done = (capabilities: CapabilityState) => {
      if (this.reading !== reading) return
      this.reading = null
      this.update({ capabilities })
    }
    this.ports.github.capabilities(reading.signal).then(
      (capabilities) => done({ status: 'ready', capabilities }),
      () => done({ status: 'failed' }),
    )
  }

  private githubChanged(): void {
    const at = this.outcomeAt
    if (at === null || this.ports.githubState.get() === at) return
    this.outcomeAt = null
    this.update({ outcome: null })
  }

  /** Starts a run of the app, unless one runs. */
  private begin(outcome: BarOutcome): AbortController | null {
    if (this.run) return null
    const run = new AbortController()
    this.run = run
    this.outcomeAt = null
    this.update({ outcome, question: null })
    return run
  }

  /** Ends a run with an outcome that shows until a newer GitHub state. */
  private end(run: AbortController, outcome: BarOutcome | null): boolean {
    if (this.run !== run) return false
    this.run = null
    this.outcomeAt = outcome ? this.ports.githubState.get() : null
    this.update({ outcome })
    return true
  }

  private update(change: Partial<BarActionsSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...change }
    for (const listener of this.listeners) listener()
  }
}
