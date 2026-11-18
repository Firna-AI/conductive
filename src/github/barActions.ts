import type { LocalWork } from '../shared/workspaces'
import type { BarActionsPorts, PromptResult } from './barPorts'
import {
  continueOutcome,
  mergeOutcome,
  pendingJobWait,
  readyOutcome,
  streamReaches,
  waitFor,
} from './barRuns'
import type { BarOutcome, CapabilityState } from './barView'
import type { GitHubSnapshot } from './githubClient'
import type { GitHubState } from './githubStore'

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
  /**
   * The connection that `connect` started last, or null before the first
   * connect. Its stop aborts it, and the next connect starts a new one, so
   * a connection that ended stays ended.
   */
  private connection: AbortController | null = null
  /** A prompt sends now, so a second press does nothing. */
  private prompting = false

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

  /**
   * Sends a fixed prompt through the chat. A press while it sends does
   * nothing. The result goes only to the connection of the press. After the
   * stop of that connection, the result is null, also when the store
   * connects again. So the caller moves no page and selects no session for
   * a screen that the member left. The stop does not cancel the send, so
   * the chat still keeps its notice and the client ID of a failed send.
   */
  async sendPrompt(text: string): Promise<PromptResult | null> {
    if (this.prompting) return null
    this.prompting = true
    const connection = this.connection
    try {
      const result = await this.ports.sendPrompt(text)
      const ended = connection === null || connection.signal.aborted
      return ended ? null : result
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
