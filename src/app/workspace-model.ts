import {
  workspacePath,
  workspacePaths,
  type WorkspaceResponse,
} from '../shared/workspaces'
import { ignore } from './api/parse'
import type { ShellEvent } from './api/read-events'
import { readWorkspaceResponse } from './api/read-workspaces'
import { ArchiveModel } from './archive-model'
import { WorkspaceStream, type Delay } from './events'
import type { OrgModel } from './org-model'
import {
  asApiError,
  loading,
  patch,
  ready,
  Store,
  valueOf,
  type Loadable,
} from './store'

const activityInterval = 60_000

/** The open workspace: its state, its start steps, and its Archive question. */
export class WorkspaceModel {
  readonly detail = new Store<Loadable<WorkspaceResponse>>(loading)
  readonly archive: ArchiveModel
  readonly stream: WorkspaceStream
  readonly workspaceId: string
  private readonly org: OrgModel
  private lastActivity = Number.NEGATIVE_INFINITY
  private readonly stops: (() => void)[] = []
  /** Each open and each close counts one up, so an old open knows it is obsolete. */
  private generation = 0
  private reading = false

  constructor(org: OrgModel, workspaceId: string, delay?: Delay) {
    this.org = org
    this.workspaceId = workspaceId
    this.stream = new WorkspaceStream(
      org.services.events,
      { orgId: org.orgId, workspaceId },
      delay,
    )
    this.archive = new ArchiveModel(org, workspaceId, (detail) => {
      this.detail.set(ready(detail))
      this.org.putWorkspace(detail.workspace)
    })
  }

  private get api() {
    return this.org.services.api
  }

  /**
   * Opens the workspace. A stopped sandbox resumes, and the steps stream in.
   * A call to `close` while the request runs makes its answer obsolete, so
   * an old open never starts the stream again.
   */
  async open(): Promise<void> {
    const run = ++this.generation
    const archived = this.org.workspace(this.workspaceId)?.state === 'archived'
    const path = workspacePath(this.org.orgId, this.workspaceId)
    let detail: WorkspaceResponse
    try {
      detail = await (archived
        ? this.api.get(path, readWorkspaceResponse)
        : this.api.send(
            'POST',
            workspacePaths.open(this.org.orgId, this.workspaceId),
            {},
            readWorkspaceResponse,
          ))
    } catch (error) {
      if (run === this.generation) {
        this.detail.set({ state: 'failed', error: asApiError(error) })
      }
      return
    }
    if (run !== this.generation) return
    this.detail.set(ready(detail))
    this.org.putWorkspace(detail.workspace)
    this.stops.push(
      this.stream.subscribe((envelope) => {
        if (envelope.shell) this.apply(envelope.shell)
      }),
      this.stream.last.subscribe(() => void this.markRead()),
    )
    this.stream.start()
  }

  /** Stops the stream. An open that still runs can no longer start it. */
  close(): void {
    this.generation += 1
    this.archive.cancel()
    this.stream.stop()
    for (const stop of this.stops.splice(0)) stop()
  }

  private apply(event: ShellEvent): void {
    patch(this.detail, (detail) => {
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
    })
    const detail = valueOf(this.detail.get())
    if (detail) this.org.putWorkspace(detail.workspace)
  }

  /** Resume of a stopped sandbox, and Try again after a start that failed. */
  async resume(): Promise<void> {
    const detail = await this.api.send(
      'POST',
      workspacePaths.resume(this.org.orgId, this.workspaceId),
      {},
      readWorkspaceResponse,
    )
    this.detail.set(ready(detail))
    this.org.putWorkspace(detail.workspace)
  }

  /** Counts input in the workspace, at most once a minute. */
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
   * Output that the open workspace shows counts as read. The answer changes
   * the state only while the workspace is still unread through the same
   * event, so an older answer never hides a newer update.
   */
  private async markRead(): Promise<void> {
    const detail = valueOf(this.detail.get())
    const through = this.stream.last.get()
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
