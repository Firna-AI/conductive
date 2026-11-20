import { errorMessage } from '../../../app/api/client'
import type { Delay } from '../../../app/events'
import type { Readable } from '../../../app/store'
import { pendingJobWait, streamReaches, waitFor } from '../../../github/barRuns'
import type {
  ChangeRepositoryRequest,
  RepositoryChangeWork,
} from '../../../shared/workspaces'
import type { RepositoryActions } from './repository-api'

/** A repository of the org, as the menu and the question name it. */
export interface RepositoryChoice {
  id: string
  fullName: string
}

/** The question of a repository change after its check found work. */
export interface RepositoryQuestion {
  /** The request that asked, which Change repository sends again. */
  request: ChangeRepositoryRequest
  /** The name of the old repository. */
  from: string
  to: RepositoryChoice
  work: RepositoryChangeWork
}

export interface RepositoryChangeSnapshot {
  /** The new repository of the change that runs, or null. */
  changing: RepositoryChoice | null
  question: RepositoryQuestion | null
  /** The newest failure. Each failure is a new object. */
  failure: { message: string } | null
}

export interface RepositoryChangePorts {
  actions: RepositoryActions
  delay: Delay
  /** The number through which the workspace stream applied its events. */
  streamLast: Readable<number>
}

/**
 * The repository change of one workspace, for the repository button in
 * its header. It runs one change at a time, and reads a pending job again
 * until it ends, as Continue does. Work that the workspace stops following
 * ends the run with the question. The run ends when the stream shows the
 * new repository. A refusal ends it with a failure. The stop of `connect`
 * ends the run, and the question goes.
 */
export class RepositoryChange {
  private snapshot: RepositoryChangeSnapshot = {
    changing: null,
    question: null,
    failure: null,
  }
  private readonly listeners = new Set<() => void>()
  private readonly ports: RepositoryChangePorts
  private run: AbortController | null = null

  constructor(ports: RepositoryChangePorts) {
    this.ports = ports
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = (): RepositoryChangeSnapshot => this.snapshot

  readonly connect = (): (() => void) => () => {
    this.run?.abort()
    this.run = null
    if (this.snapshot.changing || this.snapshot.question)
      this.update({ changing: null, question: null })
  }

  /**
   * Moves the workspace to `to`. The request names the repository and the
   * branch that the header shows. A press while a change runs does
   * nothing.
   */
  async change(
    request: ChangeRepositoryRequest,
    from: string,
    to: RepositoryChoice,
  ): Promise<void> {
    if (this.run) return
    const run = new AbortController()
    this.run = run
    this.update({ changing: to, question: null })
    const { signal } = run
    const { actions, delay, streamLast } = this.ports
    try {
      let reply = await actions.start(request)
      while (reply.state === 'pending') {
        await waitFor(delay, pendingJobWait, signal)
        reply = await actions.result(reply.changeId)
      }
      if (signal.aborted) return
      if (reply.state === 'confirmation-required') {
        const { repository, work } = reply
        this.end(run, { question: { request, from, to: repository, work } })
        return
      }
      await streamReaches(streamLast, reply.eventNumber, signal)
      this.end(run, {})
    } catch (error) {
      if (signal.aborted) return
      this.end(run, { failure: { message: errorMessage(error) } })
    }
  }

  /** Change repository in the question: the change goes on with the work. */
  confirm(): void {
    const { question } = this.snapshot
    if (!question) return
    const request = { ...question.request, allowWork: true }
    void this.change(request, question.from, question.to)
  }

  /** Cancel of the question, which sends nothing. */
  cancel(): void {
    this.update({ question: null })
  }

  private end(
    run: AbortController,
    change: Partial<RepositoryChangeSnapshot>,
  ): void {
    if (this.run !== run) return
    this.run = null
    this.update({ changing: null, ...change })
  }

  private update(change: Partial<RepositoryChangeSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...change }
    for (const listener of this.listeners) listener()
  }
}
