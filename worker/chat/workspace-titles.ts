import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import type { AppEnv } from '../env'
import { errorSummary, warnWorker } from '../warnings'
import type { ChatStore } from './store'
import { requestWorkspaceTitle } from './title-model'
import type { ChatDependencies } from './types'
import { projectWorkspaceTitle, storeWorkspaceTitle } from './workspace-title'

export class WorkspaceTitles {
  private pending = false
  private configurationWarned = false
  private readonly env: AppEnv
  private readonly store: ChatStore
  private readonly dependencies: ChatDependencies
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void

  constructor(
    env: AppEnv,
    store: ChatStore,
    dependencies: ChatDependencies,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  ) {
    this.env = env
    this.store = store
    this.dependencies = dependencies
    this.publish = publish
  }

  accepted(events: readonly WorkspaceEventEnvelope[]): void {
    for (const { workspaceId, event } of events) {
      if (
        event.type !== 'message.accepted' ||
        !event.message.text.trim() ||
        this.pending
      )
        continue
      this.pending = true
      this.dependencies.waitUntil(
        this.request(workspaceId, event.message.text).finally(() => {
          this.pending = false
        }),
      )
    }
  }

  private async request(workspaceId: string, text: string): Promise<void> {
    try {
      const source = await this.store.run(() =>
        this.store.read(workspaceId, async (view) => {
          const first = await view.firstSession()
          if (!first?.messageId || (await view.lifecycleRecovery()).title)
            return null
          const message = await view.message(first.messageId)
          if (!message) return null
          return message.text.trim() ? message.text : text
        }),
      )
      if (source === null) return
      if (
        !this.env.CONDUCTIVE_TITLE_MODEL?.trim() ||
        !this.dependencies.runTitleModel
      ) {
        if (this.configurationWarned) return
        this.configurationWarned = true
      }
      const name = await requestWorkspaceTitle(
        this.env.CONDUCTIVE_TITLE_MODEL,
        this.dependencies.runTitleModel,
        source,
      )
      if (!name) return
      await this.store.run(async () => {
        const envelope = await this.store.change(
          workspaceId,
          async (transaction) => {
            if ((await transaction.lifecycleRecovery()).title) return null
            return storeWorkspaceTitle(transaction, {
              type: 'workspace.title',
              name,
            })
          },
          this.publish,
        )
        if (envelope)
          await projectWorkspaceTitle(
            this.env.DB,
            envelope,
            this.dependencies.now(),
          )
      })
    } catch (error) {
      warnWorker(
        `The workspace title could not be saved: ${errorSummary(error)}`,
      )
    }
  }
}
