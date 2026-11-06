import { DurableObject } from 'cloudflare:workers'

import { WorkspaceChat } from './chat/backend'
import type { AppEnv } from './env'

interface WorkspaceEnv extends AppEnv {
  WORKSPACES: DurableObjectNamespace
}

export class Workspace extends DurableObject<WorkspaceEnv> {
  private readonly chat: WorkspaceChat

  constructor(context: DurableObjectState, env: WorkspaceEnv) {
    super(context, env)
    this.chat = new WorkspaceChat(context.storage, env, {
      matchesObject: (workspaceId) =>
        env.WORKSPACES.idFromName(workspaceId).equals(context.id),
    })
  }

  fetch(request: Request): Promise<Response> {
    return this.chat.fetch(request)
  }
}
