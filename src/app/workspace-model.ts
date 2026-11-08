import {
  workspacePath,
  workspacePaths,
  type Workspace,
  type WorkspaceResponse,
} from '../shared/workspaces'
import type { ApiError } from './api/client'
import { ignore } from './api/parse'
import type { ShellEvent } from './api/read-events'
import { readWorkspaceResponse } from './api/read-workspaces'
import { ArchiveModel } from './archive-model'
import { WorkspaceStream, type Delay } from './events'
import type { OrgModel } from './org-model'
import type { Change } from './resource'
import {
  asApiError,
  loading,
  ready,
  Store,
  valueOf,
  type Loadable,
} from './store'

const activityInterval = 60_000

/** The open workspace: its state, its start steps, and its Archive question. */
export class WorkspaceModel {
  readonly detail = new Store<Loadable<WorkspaceResponse>>(loading)
  readonly startError = new Store<ApiError | null>(null)
  readonly archive: ArchiveModel
  readonly stream: WorkspaceStream
  readonly workspaceId: string
  private readonly org: OrgModel
  private lastActivity = Number.NEGATIVE_INFINITY
  private readonly stops: (() => void)[] = []
  /** Each open and each close counts one up, so an old open knows it is obsolete. */
  private generation = 0
  private reading = false
  private refusedOwnerId: string | null = null
  /** Newer field changes to replay over each pending Resume answer. */
  private readonly resuming = new Set<Change<WorkspaceResponse>[]>()

  constructor(org: OrgModel, workspaceId: string, delay?: Delay) {
    this.org = org
    this.workspaceId = workspaceId
    this.stream = new WorkspaceStream(
      org.services.events,
      { orgId: org.orgId, workspaceId },
      delay ?? org.services.delay,
    )
    this.archive = new ArchiveModel(org, workspaceId, (detail) => {
      this.setDetail(detail)
    })
  }

  private get api() {
    return this.org.services.api
  }

  /**
   * Opens the workspace. A stopped sandbox resumes, and the steps stream in.
   * The input of the user on the page counts as activity until `close`. A
   * call to `close` while the request runs makes its answer obsolete, so an
   * old open never starts the stream again.
   */
  async open(): Promise<void> {
    const run = ++this.generation
    const path = workspacePath(this.org.orgId, this.workspaceId)
    let detail: WorkspaceResponse
    try {
      detail = await this.api.get(path, readWorkspaceResponse)
    } catch (error) {
      if (run === this.generation) {
        this.detail.set({ state: 'failed', error: asApiError(error) })
      }
      return
    }
    if (run !== this.generation) return
    this.setDetail(detail)
    // The read mark follows all its inputs, so their order does not count:
    // the number of an event changes before the event applies, and a page
    // that shows again marks the output that arrived while it was hidden.
    const markRead = () => void this.markRead()
    this.stops.push(
      this.stream.subscribe((envelope) => {
        if (envelope.shell) this.apply(envelope.shell)
      }),
      this.stream.last.subscribe(markRead),
      this.detail.subscribe(markRead),
      this.org.services.visible.subscribe(markRead),
      // Input anywhere on the page counts, also in a field that stops it.
      this.org.services.onInput(() => this.reportActivity()),
    )
    this.stream.start()
    if (run !== this.generation) return
    const state = valueOf(this.detail.get())?.workspace.state
    if (state === 'stopped' || state === 'error')
      await this.resume().catch(() => undefined)
  }

  /** Stops the stream. An open that still runs can no longer start it. */
  close(): void {
    this.generation += 1
    this.resuming.clear()
    this.archive.cancel()
    this.stream.stop()
    for (const stop of this.stops.splice(0)) stop()
  }

  private apply(event: ShellEvent): void {
    const change: Change<WorkspaceResponse> = (detail) => {
      switch (event.type) {
        case 'workspace.updated':
          return { ...detail, workspace: event.workspace }
        case 'start.updated':
          return { ...detail, start: event.start }
        case 'workspace.title':
          return {
            ...detail,
            workspace: { ...detail.workspace, name: event.name },
          }
      }
    }
    const detail = valueOf(this.detail.get())
    if (detail) this.setDetail(change(detail), change)
  }

  private setDetail(
    detail: WorkspaceResponse,
    change: Change<WorkspaceResponse> = () => detail,
  ): void {
    for (const changes of this.resuming) changes.push(change)
    if (
      this.refusedOwnerId !== null &&
      this.refusedOwnerId !== detail.workspace.owner.id
    ) {
      this.refusedOwnerId = null
      this.startError.set(null)
    }
    this.detail.set(ready(detail))
    this.org.putWorkspace(detail.workspace)
  }

  reassigned(workspace: Workspace): void {
    const detail = valueOf(this.detail.get())
    if (!detail) return
    const change: Change<WorkspaceResponse> = (current) => ({
      ...current,
      workspace: { ...current.workspace, owner: workspace.owner },
    })
    this.setDetail(change(detail), change)
  }

  /** Resume of a stopped sandbox, and Try again after a start that failed. */
  async resume(): Promise<void> {
    const run = this.generation
    const ownerId = valueOf(this.detail.get())?.workspace.owner.id
    if (this.startError.get()?.code !== 'user_suspended')
      this.startError.set(null)
    const changes: Change<WorkspaceResponse>[] = []
    this.resuming.add(changes)
    let detail: WorkspaceResponse
    try {
      detail = await this.api.send(
        'POST',
        workspacePaths.resume(this.org.orgId, this.workspaceId),
        {},
        readWorkspaceResponse,
      )
    } catch (error) {
      const problem = asApiError(error)
      const sameOwner =
        ownerId !== undefined &&
        ownerId === valueOf(this.detail.get())?.workspace.owner.id
      if (
        run === this.generation &&
        (problem.code !== 'user_suspended' || sameOwner)
      ) {
        this.refusedOwnerId =
          problem.code === 'user_suspended' ? (ownerId ?? null) : null
        this.startError.set(problem)
      }
      throw error
    } finally {
      this.resuming.delete(changes)
    }
    if (run !== this.generation) return
    this.refusedOwnerId = null
    this.startError.set(null)
    this.setDetail(changes.reduce((value, change) => change(value), detail))
  }

  /** Counts input in the open workspace, at most once a minute. */
  reportActivity(): void {
    const state = valueOf(this.detail.get())?.workspace.state
    if (state === undefined || state === 'stopped' || state === 'error') return
    if (state === 'archived') return
    const now = this.org.services.now()
    if (now - this.lastActivity < activityInterval) return
    this.lastActivity = now
    void this.api
      .send(
        'POST',
        workspacePaths.activity(this.org.orgId, this.workspaceId),
        { source: 'input' },
        ignore,
      )
      .catch(() => {
        this.lastActivity = Number.NEGATIVE_INFINITY
      })
  }

  /**
   * Output that the open workspace shows counts as read. It runs when the
   * applied state, the number of the newest event, or the visibility of the
   * page changes. A hidden page shows no output, so it sends no read mark.
   * The answer changes the state only while the workspace is still unread
   * through the same event, so an older answer never hides a newer update.
   */
  private async markRead(): Promise<void> {
    const detail = valueOf(this.detail.get())
    const through = this.stream.last.get()
    if (!this.org.services.visible.get()) return
    if (this.reading || !detail || through === 0) return
    if (detail.workspace.state !== 'unread') return
    const run = this.generation
    this.reading = true
    try {
      await this.api.send(
        'PUT',
        workspacePaths.read(this.org.orgId, this.workspaceId),
        { throughEventNumber: through },
        ignore,
      )
    } catch {
      return
    } finally {
      this.reading = false
    }
    const current = valueOf(this.detail.get())
    if (run !== this.generation || current?.workspace.state !== 'unread') return
    if (this.stream.last.get() !== through) {
      void this.markRead()
      return
    }
    this.apply({
      type: 'workspace.updated',
      workspace: { ...current.workspace, state: 'ready' },
    })
  }
}
