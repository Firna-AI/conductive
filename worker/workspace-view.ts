import { AgentSessionWorkspace } from './tools/workspace'
import { readChatWorkspaceResponse } from './chat/workspace-response'
import { workspaceUpdate } from './chat/workspace-update'

export class WorkspaceView extends AgentSessionWorkspace {
  readChatWorkspaceResponse(
    orgId: string,
    workspaceId: string,
    origin: string,
  ) {
    return this.chat.runLifecycle(() =>
      readChatWorkspaceResponse(
        this.env,
        this.chat.store,
        orgId,
        workspaceId,
        origin,
        () => this.controller.readLifecycle(),
        () => this.controller.readLifecycleStartLog(),
      ),
    )
  }

  async publishWorkspaceMetadata(
    orgId: string,
    workspaceId: string,
  ): Promise<void> {
    if (!this.env.WORKSPACES.idFromName(workspaceId).equals(this.ctx.id)) return
    await this.chat.runLifecycle(async () => {
      await this.chat.commitWorkspaceEvent(
        workspaceId,
        await workspaceUpdate(this.env.DB, orgId, workspaceId),
      )
    })
  }
}
