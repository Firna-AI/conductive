import type { WorkspaceStorage } from './platform-storage'
import type { WorkspaceResponse } from '../../src/shared/workspaces'
import type { WorkspacePlatform } from './workspace-platform'
import type { WorkspaceSnapshot } from '../data/workspace-link'

export interface LifecyclePublication extends Omit<
  WorkspaceResponse,
  'workspace'
> {
  workspace: WorkspaceSnapshot
}

const LAST_PUBLISHED = 'lifecycle:last-published'

/** Publishes lifecycle changes in order. WorkspaceChat owns the only event history. */
export class WorkspaceEventJournal {
  private readonly storage: WorkspaceStorage
  private readonly publish: WorkspacePlatform['publish']
  private pending: Promise<unknown> = Promise.resolve()

  constructor(
    storage: WorkspaceStorage,
    publish: WorkspacePlatform['publish'],
  ) {
    this.storage = storage
    this.publish = publish
  }

  publishLifecycle(
    response: LifecyclePublication,
    now: number,
    publish = this.publish,
  ): Promise<void> {
    return this.serial(async () => {
      const signature = JSON.stringify({
        state: response.workspace.state,
        start: response.start,
        error: response.error,
      })
      if ((await this.storage.get('text', LAST_PUBLISHED)) === signature) return
      const start = response.start
      const failedCreate =
        response.workspace.state === 'error' &&
        start?.kind === 'create' &&
        start.steps.some((step) => step.state === 'failed')
      const publishStart = async () => {
        if (start)
          await publish({
            workspaceId: response.workspace.id,
            event: { type: 'start.updated', start },
            occurredAt: now,
          })
      }
      if (failedCreate) await publishStart()
      await publish({
        workspaceId: response.workspace.id,
        event: {
          type: 'workspace.updated',
          workspace: response.workspace,
          error: response.error
            ? { code: response.error.code, message: response.error.message }
            : null,
        },
        occurredAt: now,
      })
      if (!failedCreate) await publishStart()
      await this.storage.put('text', LAST_PUBLISHED, signature)
    })
  }

  clearFailedCreate(): Promise<void> {
    return this.serial(async () => {
      await this.storage.delete(LAST_PUBLISHED)
    })
  }

  private serial(operation: () => Promise<void>): Promise<void> {
    const next = this.pending.then(operation)
    this.pending = next.catch(() => undefined)
    return next
  }
}
