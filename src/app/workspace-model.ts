import {
  workspacePath,
  workspacePaths,
  type OrderedWorkspaceResponse,
  type Workspace,
  type WorkspaceResponse,
} from '../shared/workspaces'
import type { ApiError } from './api/client'
import { ignore } from './api/parse'
import type { ShellEvent } from './api/read-events'
import { readOrderedWorkspaceResponse } from './api/read-workspaces'
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
import { WorkspaceReadMarks } from './workspace-read-marks'

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
  private readonly readMarks: WorkspaceReadMarks
  private refusedOwnerId: string | null = null
  /**
   * The workspace event number whose state the detail shows, from its read,
   * a Resume reply, or an event of the stream. A reply or an event that is
   * older changes nothing, whatever order they arrive in.
   */
  private through = 0
  /**
   * The local changes that carry no number, such as a new owner, an Archive,
   * or a read mark, that came while a Resume waits. They stay over its reply.
   */
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
      this.local(() => detail)
    })
    this.readMarks = new WorkspaceReadMarks(
      org.services,
      workspacePaths.read(org.orgId, workspaceId),
      {
        detail: this.detail,
        last: this.stream.last,
        clearUnread: () => this.clearUnread(),
      },
    )
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
    let detail: OrderedWorkspaceResponse
    try {
      detail = await this.api.get(path, readOrderedWorkspaceResponse)
    } catch (error) {
      if (run === this.generation) {
        this.detail.set({ state: 'failed', error: asApiError(error) })
      }
      return
    }
    if (run !== this.generation) return
    this.confirm(detail)
    this.stops.push(
      this.stream.subscribe((envelope) => {
        if (envelope.shell) this.apply(envelope.shell, envelope.eventNumber)
      }),
      // Input anywhere on the page counts, also in a field that stops it.
      this.org.services.onInput(() => this.reportActivity()),
    )
    this.readMarks.open()
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
    this.readMarks.close()
    this.stream.stop()
    for (const stop of this.stops.splice(0)) stop()
  }

  /** Applies an event of the stream that is newer than the detail. */
  private apply(event: ShellEvent, eventNumber: number): void {
    const detail = valueOf(this.detail.get())
    if (!detail || eventNumber <= this.through) return
    this.through = eventNumber
    this.setDetail(changed(detail, event))
  }

  /**
   * Shows a read or a Resume reply when no newer state has shown, with the
   * local changes that came after it. The first read shows in any case,
   * because no detail shows before it.
   */
  private confirm(
    reply: OrderedWorkspaceResponse,
    local: readonly Change<WorkspaceResponse>[] = [],
  ): void {
    const shown = valueOf(this.detail.get()) !== undefined
    if (shown && reply.eventNumber < this.through) return
    this.through = reply.eventNumber
    const { workspace, start, error } = reply
    this.setDetail(
      local.reduce((value, change) => change(value), {
        workspace,
        start,
        error,
      }),
    )
  }

  /** A local change with no number, which also stays over a pending Resume. */
  private local(change: Change<WorkspaceResponse>): void {
    const detail = valueOf(this.detail.get())
    if (!detail) return
    for (const changes of this.resuming) changes.push(change)
    this.setDetail(change(detail))
  }

  private setDetail(detail: WorkspaceResponse): void {
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
    this.local((current) => ({
      ...current,
      workspace: { ...current.workspace, owner: workspace.owner },
    }))
  }

  /**
   * Resume of a stopped sandbox, and Try again after a start that failed. Its
   * reply shows only when no newer state of the workspace came first.
   */
  async resume(): Promise<void> {
    const run = this.generation
    const ownerId = valueOf(this.detail.get())?.workspace.owner.id
    if (this.startError.get()?.code !== 'user_suspended')
      this.startError.set(null)
    const changes: Change<WorkspaceResponse>[] = []
    this.resuming.add(changes)
    let detail: OrderedWorkspaceResponse
    try {
      detail = await this.api.send(
        'POST',
        workspacePaths.resume(this.org.orgId, this.workspaceId),
        {},
        readOrderedWorkspaceResponse,
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
    this.confirm(detail, changes)
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

  private clearUnread(): void {
    if (valueOf(this.detail.get())?.workspace.state !== 'unread') return
    // A read that is newer than the stream can name output that no read mark
    // covers yet. It clears after the stream and a mark reach its number.
    if (this.through > this.stream.last.get()) return
    this.local((current) =>
      current.workspace.state === 'unread'
        ? { ...current, workspace: { ...current.workspace, state: 'ready' } }
        : current,
    )
  }
}

/**
 * The detail after an event of the stream. A workspace record applies its
 * saved public error with its state: a record without the error keeps the
 * current error, and null clears it. An event error carries no log, so the
 * detail keeps a null log for it.
 */
function changed(
  detail: WorkspaceResponse,
  event: ShellEvent,
): WorkspaceResponse {
  switch (event.type) {
    case 'workspace.updated':
      return {
        ...detail,
        workspace: event.workspace,
        ...(event.error === undefined
          ? {}
          : {
              error:
                event.error === null ? null : { ...event.error, log: null },
            }),
      }
    case 'start.updated':
      return { ...detail, start: event.start }
    case 'workspace.title':
      return { ...detail, workspace: { ...detail.workspace, name: event.name } }
  }
}
