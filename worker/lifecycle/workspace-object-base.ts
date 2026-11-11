import { DurableObject } from 'cloudflare:workers'

import { WorkspaceChat } from '../chat/backend'
import {
  createWorkspaceIntegration,
  type WorkspaceCompositionEnv,
  type WorkspaceChatResolvers,
} from '../chat/workspace-integration'
import { DeviceRuntime } from '../devices/runtime'
import type { ConnectionScheduler } from '../security/connection-access'
import { createWorkspaceInputActivity } from './create-input-activity'
import { lifecycleDependencies } from './runtime'
import type { WorkspaceController } from './workspace-controller-types'

export class WorkspaceObjectBase extends DurableObject<WorkspaceCompositionEnv> {
  protected readonly chat: WorkspaceChat
  protected readonly controller: WorkspaceController
  protected readonly devices: DeviceRuntime
  protected readonly context: DurableObjectState
  protected readonly activity: ReturnType<typeof createWorkspaceInputActivity>
  protected readonly activityNow: () => number

  protected readonly integration: ReturnType<typeof createWorkspaceIntegration>

  constructor(
    context: DurableObjectState,
    env: WorkspaceCompositionEnv,
    now: () => number = Date.now,
    resolvers: WorkspaceChatResolvers = {},
    activitySchedule?: ConnectionScheduler,
  ) {
    super(context, env)
    this.context = context
    this.activityNow = now
    const integration = createWorkspaceIntegration(context, env, now, resolvers)
    this.integration = integration
    this.chat = integration.chat
    this.devices = integration.devices
    this.controller = integration.controller
    context.blockConcurrencyWhile(() => integration.sockets.restore())
    this.activity = createWorkspaceInputActivity(
      context,
      env,
      { ...lifecycleDependencies(), now },
      integration,
      (operation) =>
        this.chat.runLifecycle(() => integration.withGeneration(operation)),
      activitySchedule,
    )
  }

  protected run<T>(operation: () => Promise<T>): Promise<T> {
    return this.chat.runLifecycle(() =>
      this.integration.withGeneration(async () => {
        const result = await operation()
        await this.chat.flushRunner()
        return result
      }),
    )
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    return this.integration.sockets.message(socket, message)
  }

  webSocketClose(socket: WebSocket) {
    return this.integration.sockets.close(socket)
  }

  webSocketError(socket: WebSocket) {
    return this.integration.sockets.close(socket)
  }
}
