import { DurableObject } from 'cloudflare:workers'

import { WorkspaceChat } from './chat/backend'
import type { AppEnv } from './env'
import { DeviceRuntime } from './devices/runtime'

interface WorkspaceEnv extends AppEnv {
  WORKSPACES: DurableObjectNamespace
}

export class Workspace extends DurableObject<WorkspaceEnv> {
  private readonly chat: WorkspaceChat
  private readonly devices: DeviceRuntime
  private readonly context: DurableObjectState

  constructor(
    context: DurableObjectState,
    env: WorkspaceEnv,
    now: () => number = Date.now,
  ) {
    super(context, env)
    this.context = context
    this.chat = new WorkspaceChat(context.storage, env, {
      matchesObject: (workspaceId) =>
        env.WORKSPACES.idFromName(workspaceId).equals(context.id),
      runnerEventStored: async (envelope) => {
        const event = envelope.event
        if (
          event.type === 'turn.completed' ||
          event.type === 'turn.failed' ||
          (event.type === 'runner.event-refused' &&
            (event.runnerEventType === 'turn.completed' ||
              event.runnerEventType === 'turn.failed'))
        )
          context.waitUntil(this.devices.reconcile())
      },
    })
    this.devices = new DeviceRuntime(
      env,
      context.storage,
      this.chat,
      (name) => env.WORKSPACES.idFromName(name).equals(context.id),
      (when) => context.storage.setAlarm(when),
      now,
    )
  }

  async fetch(request: Request): Promise<Response> {
    const response = await this.devices.fetch(request)
    if (response) return response
    const chatResponse = await this.chat.fetch(request)
    if (request.method !== 'GET' && request.method !== 'HEAD')
      this.context.waitUntil(this.devices.reconcile())
    return chatResponse
  }

  alarm(): Promise<void> {
    return this.devices.alarm()
  }
}
