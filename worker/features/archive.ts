import type { AppDependencies, AppEnv } from '../env'
import type { WorkspaceChat } from '../chat/backend'
import type { WorkspaceController } from '../lifecycle/workspace-controller-types'
import type { ReceiverStorage } from '../members/receiver-storage'
import { readArchiveCheck } from '../app-api/archive'
import { archiveWorkspace } from '../lifecycle/archive-workspace'
import { continueBusy } from '../lifecycle/continue-admission'
import { pendingContinue } from '../lifecycle/continue-types'
import { featureResult } from './result'

interface ArchiveContext {
  storage: ReceiverStorage
  chat: WorkspaceChat
  controller: WorkspaceController
  run<T>(work: () => Promise<T>): Promise<T>
  revoke(workspaceId: string): Promise<void>
}

export class WorkspaceArchive {
  private readonly env: AppEnv
  private readonly dependencies: AppDependencies
  private readonly context: ArchiveContext
  constructor(
    env: AppEnv,
    dependencies: AppDependencies,
    context: ArchiveContext,
  ) {
    this.env = env
    this.dependencies = dependencies
    this.context = context
  }

  check(orgId: string, workspaceId: string, userId: string) {
    return featureResult(() =>
      this.context.run(() =>
        readArchiveCheck(
          this.env,
          this.dependencies,
          orgId,
          workspaceId,
          userId,
        ),
      ),
    )
  }

  archive(
    orgId: string,
    workspaceId: string,
    userId: string,
    discard: boolean,
    origin: string,
  ) {
    const { chat, storage, controller } = this.context
    return featureResult(() =>
      this.context.run(async () => {
        if (await pendingContinue(storage)) throw continueBusy()
        return archiveWorkspace(
          this.env,
          this.dependencies,
          orgId,
          workspaceId,
          userId,
          discard,
          origin,
          {
            revokePreviews: () => this.context.revoke(workspaceId),
            stopChat: () => chat.stopWorkspace(workspaceId),
            clearLifecycle: async () => {
              await storage.delete([
                'lifecycle:start-job',
                'lifecycle:create-publication',
              ])
              controller.cancelLifecycleWaiters()
              await controller.clearLifecycle()
            },
            publish: (workspace) =>
              chat.commitWorkspaceEvent(workspaceId, {
                type: 'workspace.updated',
                workspace,
              }),
          },
        )
      }),
    )
  }
}
