import {
  workspacePath,
  workspacePaths,
  type OrderedWorkspaceResponse,
  type Workspace,
  type WorkspaceResponse,
} from '../shared/workspaces'
import type { ApiError } from './api/client'
import type { ShellEvent } from './api/read-events'
import { readOrderedWorkspaceResponse } from './api/read-workspaces'
import { ArchiveModel } from './archive-model'
import { WorkspaceStream, type Delay } from './events'
import { resumesAtOpen } from './first-start'
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
import {
  archivedDetail,
  archiveReplyDetail,
  detailAfterListArchive,
  workspaceAfterEvent,
  workspaceMetadata,
} from './workspace-detail'
import { WorkspaceActivity } from './workspace-activity'

/** The open workspace: its state, its start steps, and its Archive question. */
export class WorkspaceModel {
  readonly detail = new Store<Loadable<WorkspaceResponse>>(loading)
  readonly startError = new Store<ApiError | null>(null)
  readonly archive: ArchiveModel
  readonly stream: WorkspaceStream
  readonly workspaceId: string
  private readonly org: OrgModel
  private readonly activity: WorkspaceActivity
  private readonly stops: (() => void)[] = []
  /** Each open and each close counts one up, so an old open knows it is obsolete. */
  private generation = 0
  private readonly readMarks: WorkspaceReadMarks
  private refusedOwnerId: string | null = null
  private stopArchiveFollow: (() => void) | null = null
  /**
   * The workspace event number whose state the detail shows, from its read,
   * a Resume reply, or an event of the stream. A reply or an event that is
   * older changes nothing, whatever order they arrive in.
   */
  private through = 0
  /**
   * The local changes that carry no number, such as a new owner, an Archive,
   * or a read mark, that came while an open or Resume waits. They stay over
   * its reply.
   */
  private readonly pendingReplies = new Set<Change<WorkspaceResponse>[]>()

  constructor(org: OrgModel, workspaceId: string, delay?: Delay) {
    this.org = org
    this.workspaceId = workspaceId
    this.activity = new WorkspaceActivity(org, workspaceId)
    this.stream = new WorkspaceStream(
      org.services.events,
      { orgId: org.orgId, workspaceId },
      delay ?? org.services.delay,
    )
    this.archive = new ArchiveModel(org, workspaceId, (detail) => {
      this.local((current) => archiveReplyDetail(current, detail), false)
      org.workspaceActions.archived(detail.workspace)
    })
    this.readMarks = new WorkspaceReadMarks(
      org.services,
      workspacePaths.read(org.orgId, workspaceId),
      {
        detail: this.detail,
        last: this.stream.last,
        suspended: org.suspension.suspended,
        clearUnread: () => this.clearUnread(),
      },
    )
  }

  private get api() {
    return this.org.services.api
  }

  /**
   * Opens the workspace. A stopped sandbox, or one whose later start failed,
   * resumes, and the steps stream in. A failed first start waits for Try
   * again.
   * The input of the user on the page counts as activity until `close`. A
   * call to `close` while the request runs makes its answer obsolete, so an
   * old open never starts the stream again. A suspended org refuses each
   * write, so its workspace sends no Resume, read mark, or activity.
   */
  async open(): Promise<void> {
    const run = ++this.generation
    this.stopArchiveFollow ??= this.org.workspaces.subscribe(() =>
      this.syncArchive(),
    )
    this.syncArchive()
    const path = workspacePath(this.org.orgId, this.workspaceId)
    const changes: Change<WorkspaceResponse>[] = []
    this.pendingReplies.add(changes)
    let detail: OrderedWorkspaceResponse
    try {
      detail = await this.api.get(path, readOrderedWorkspaceResponse)
    } catch (error) {
      if (
        run === this.generation &&
        valueOf(this.detail.get())?.workspace.state !== 'archived'
      ) {
        this.detail.set({ state: 'failed', error: asApiError(error) })
      }
      return
    } finally {
      this.pendingReplies.delete(changes)
    }
    if (run !== this.generation) return
    this.confirm(detail, changes)
    this.stops.push(
      this.stream.subscribe((envelope) => {
        if (envelope.shell) this.apply(envelope.shell, envelope.eventNumber)
      }),
      // Input anywhere on the page counts, also in a field that stops it.
      this.org.services.onInput(() => this.reportActivity()),
    )
    this.readMarks.open()
    this.stream.start()
    if (run !== this.generation || this.suspended) return
    const shown = valueOf(this.detail.get())
    if (shown && resumesAtOpen(shown))
      await this.resume().catch(() => undefined)
  }

  private get suspended(): boolean {
    return this.org.suspension.suspended.get()
  }

  /** Stops the stream. An open that still runs can no longer start it. */
  close(): void {
    this.generation += 1
    this.stopArchiveFollow?.()
    this.stopArchiveFollow = null
    this.pendingReplies.clear()
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
    const next = workspaceAfterEvent(detail, event)
    if (next !== detail) this.setDetail(next)
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
    if (
      valueOf(this.detail.get())?.workspace.state === 'archived' &&
      reply.workspace.state !== 'archived'
    )
      return
    const { workspace, start, error } = reply
    this.setDetail(
      local.reduce((value, change) => change(value), {
        workspace,
        start,
        error,
      }),
    )
  }

  /** A local change with no number, which stays over pending detail replies. */
  private local(change: Change<WorkspaceResponse>, updateList = true): void {
    for (const changes of this.pendingReplies) changes.push(change)
    const detail = valueOf(this.detail.get())
    if (!detail) return
    this.setDetail(change(detail), updateList)
  }

  private setDetail(detail: WorkspaceResponse, updateList = true): void {
    const next = detailAfterListArchive(
      valueOf(this.detail.get()),
      detail,
      this.archivedFromList(),
    )
    if (
      this.refusedOwnerId !== null &&
      this.refusedOwnerId !== next.workspace.owner.id
    ) {
      this.refusedOwnerId = null
      this.startError.set(null)
    }
    this.detail.set(ready(next))
    if (updateList && next === detail) this.org.putWorkspace(next.workspace)
  }

  private archivedFromList(): Workspace | undefined {
    const workspace = this.org.workspace(this.workspaceId)
    return workspace?.state === 'archived' ? workspace : undefined
  }

  private syncArchive(): void {
    const archived = this.archivedFromList()
    const current = valueOf(this.detail.get())
    if (!archived || current?.workspace.state === 'archived') return
    const detail = archivedDetail(archived)
    if (current) this.local(() => detail, false)
    else this.setDetail(detail, false)
  }

  reassigned(workspace: Workspace): void {
    this.org.workspaceActions.reassigned(workspace)
    this.local(workspaceMetadata({ owner: workspace.owner }), false)
  }

  /** Takes the name that the list's Rename action already confirmed. */
  renamed(workspace: Workspace): void {
    this.local(workspaceMetadata({ name: workspace.name }), false)
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
    this.pendingReplies.add(changes)
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
      this.pendingReplies.delete(changes)
    }
    if (run !== this.generation) return
    this.refusedOwnerId = null
    this.startError.set(null)
    this.confirm(detail, changes)
  }

  /** Counts input in the open workspace, at most once a minute. */
  reportActivity(): void {
    this.activity.report(valueOf(this.detail.get())?.workspace.state)
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
