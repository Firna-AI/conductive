import type { LocalWork } from '../shared/workspaces'
import type { GitHubStoredResponse } from '../shared/github'
import type { BarActionsPorts, PromptResult } from './barPorts'
import {
  continueOutcome,
  mergeOutcome,
  pendingJobWait,
  readyOutcome,
  runBarMerge,
  streamReaches,
  waitFor,
} from './barRuns'
import type { BarOutcome, CapabilityState } from './barView'
import type { GitHubSnapshot } from './githubClient'
import type { GitHubState } from './githubStore'

/**
 * The question of Continue after its check found local work. The optional
 * label of the base branch, and of each changed file, hides each secret
 * value. The real names stay for the requests.
 */
interface ContinueQuestion {
  branch: string
  baseBranch: string
  displayBaseBranch?: string
  localWork: LocalWork
}

export interface BarActionsSnapshot {
  capabilities: CapabilityState
  outcome: BarOutcome | null
  question: ContinueQuestion | null
}

/**
 * The actions of the pull request bar of one workspace and one member, for
 * the desktop bar and the top of the phone Checks tab alike. It keeps the
 * member's own GitHub access out of the shared GitHub state. It runs one
 * merge or one Continue at a time, and reads a pending job again until it
 * ends. An outcome, such as a refusal, shows until the bar shows a newer
 * GitHub state. The stop of `connect` ends each read and each run, and the
 * result of each prompt that still sends, as `sendPrompt` says.
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
  private prompting: AbortController | null = null
  /**
   * The current connection, or null while disconnected. Its stop aborts
   * it, so results from a stopped connection never reach the next one.
   */
  private connection: AbortController | null = null

  constructor(ports: BarActionsPorts) {
    this.ports = ports
    const remembered = ports.access?.get()
    if (remembered)
      this.snapshot = {
        ...this.snapshot,
        capabilities: { status: 'ready', capabilities: remembered },
      }
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = (): BarActionsSnapshot => this.snapshot

  /**
   * Reads the access now and after each reconnect, until the stop. A
   * remembered access shows until the first answer.
   */
  readonly connect = (): (() => void) => {
    const connection = new AbortController()
    this.connection = connection
    const stops = [
      this.ports.reconnects.subscribe(() => this.readCapabilities()),
      this.ports.githubState.subscribe(() => this.githubChanged()),
    ]
    this.readCapabilities()
    return () => {
      connection.abort()
      if (this.connection === connection) this.connection = null
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
    const { queue, mergeStack } = snapshot
    if (queue && (queue.mergeAhead === undefined || queue.state === 'merging'))
      return
    if (!queue && mergeStack?.queue === 'other-org') return
    const run = this.begin({ kind: 'merging' })
    if (!run) return
    const { signal } = run
    try {
      await runBarMerge(
        this.ports,
        snapshot,
        {
          pullNumber: pullRequest.number,
          headSha: pullRequest.headSha,
          method,
        },
        signal,
      )
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

  /** Marks the draft that the bar shows ready for review, as the member. */
  async markReady(snapshot: GitHubSnapshot): Promise<void> {
    const pullRequest = snapshot.banner.pullRequest
    if (pullRequest === null) return
    const run = this.begin({ kind: 'marking-ready' })
    if (!run) return
    const { signal } = run
    try {
      await this.ports.github.ready({ pullNumber: pullRequest.number }, signal)
      // Marking ready shows until the bar reads the new state.
      if (this.end(run, { kind: 'marking-ready' })) this.ports.refreshGitHub()
    } catch (error) {
      if (signal.aborted) return
      const outcome = readyOutcome(error)
      const noRight =
        outcome.kind === 'ready-refused' && outcome.reason === 'ready-no-right'
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
        const { branch: from, baseBranch, displayBaseBranch, localWork } = reply
        const label =
          displayBaseBranch === undefined ? {} : { displayBaseBranch }
        if (this.end(run, null)) {
          this.update({
            question: { branch: from, baseBranch, ...label, localWork },
          })
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

  /** Sends one fixed prompt at a time. A queued action reads state at the press. */
  async sendPrompt(
    prompt: string | ((stored: GitHubStoredResponse) => string),
  ): Promise<PromptResult | null> {
    const connection = this.connection
    if (!connection || this.prompting === connection) return null
    this.prompting = connection
    try {
      const text =
        typeof prompt === 'string'
          ? prompt
          : await this.ports.github
              .stored(connection.signal)
              .then(prompt, () => null)
      if (connection.signal.aborted) return null
      if (text === null) {
        this.outcomeAt = this.ports.githubState.get()
        this.update({ outcome: { kind: 'prompt-read-failed' } })
        return null
      }
      if (this.snapshot.outcome?.kind === 'prompt-read-failed')
        this.update({ outcome: null })
      const result = await this.ports.sendPrompt(text)
      return connection.signal.aborted ? null : result
    } finally {
      if (this.prompting === connection) this.prompting = null
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
      (capabilities) => {
        if (this.reading === reading) this.ports.access?.set(capabilities)
        done({ status: 'ready', capabilities })
      },
      () => {
        if (this.reading === reading) this.ports.access?.set(undefined)
        done({ status: 'failed' })
      },
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
