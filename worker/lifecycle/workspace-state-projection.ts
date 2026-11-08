import type { AgentChoice } from '../../src/shared/agents'
import type { WorkspaceResponse } from '../../src/shared/workspaces'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import type { DurableLifecycleState, LifecyclePublisher } from './durable-types'
import type { WorkspaceEventJournal } from './durable-journal'
import {
  persistLifecycleState,
  readWorkspace,
  workspaceView,
} from './workspace-data'

interface ProjectionOptions {
  env: AppEnv
  dependencies: AppDependencies
  journal: WorkspaceEventJournal
  readLifecycle(): Promise<DurableLifecycleState | undefined>
  deviceWaiting(workspaceId: string): Promise<boolean>
}

/** Both callers already own the workspace chat queue. This class adds no queue. */
export class WorkspaceStateProjection {
  private readonly options: ProjectionOptions
  constructor(options: ProjectionOptions) {
    this.options = options
  }

  private async write(
    now: number,
    workspaceId?: string,
  ): Promise<WorkspaceResponse | undefined> {
    const { env, readLifecycle, deviceWaiting } = this.options
    const current = await readLifecycle()
    if (!current) return undefined
    if (workspaceId !== undefined && current.workspaceId !== workspaceId)
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    const waiting = await deviceWaiting(current.workspaceId)
    const state =
      waiting && !['stopped', 'error', 'archived'].includes(current.state)
        ? 'input'
        : current.state
    const before = await readWorkspace(
      env.DB,
      current.orgId,
      current.workspaceId,
    )
    const updatedAt = Math.max(
      now,
      this.options.dependencies.now(),
      before.updatedAt,
    )
    await persistLifecycleState(env.DB, { ...current, state }, updatedAt)
    const row = await readWorkspace(env.DB, current.orgId, current.workspaceId)
    return {
      workspace: workspaceView(row),
      start: current.start,
      error: current.error,
    }
  }

  async changed(publish?: LifecyclePublisher): Promise<void> {
    const now = this.options.dependencies.now()
    const response = await this.write(now)
    if (response)
      await this.options.journal.publishLifecycle(response, now, publish)
  }

  async deviceChanged(
    workspaceId: string,
    choice: AgentChoice | undefined,
    now: number,
    publish: LifecyclePublisher,
  ): Promise<boolean> {
    const response = await this.write(now, workspaceId)
    if (!response) return false
    await publish({
      workspaceId,
      occurredAt: now,
      event: {
        type: 'workspace.updated',
        workspace: {
          ...response.workspace,
          choice: choice ?? response.workspace.choice,
        },
      },
    })
    return true
  }
}
