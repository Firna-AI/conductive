import { AgentSessionReadWorkspace } from './session-read-workspace'
import { featureResult } from '../features/result'
import { findChatWorkspace } from '../chat/queries'
import { activeStoredTurn } from '../devices/access'
import { HttpError } from '../http'
import { toolSessionWorkspace } from './session-access'
import { toolUser } from './composition-data'
import type { ToolSessionWrite, ToolSessionManagement } from './services'

export class AgentSessionWorkspace extends AgentSessionReadWorkspace {
  async callingToolTurn(workspaceId: string, turnId: string) {
    if (!this.env.WORKSPACES.idFromName(workspaceId).equals(this.ctx.id))
      return null
    return this.chat.runLifecycle(async () => {
      const turn = await activeStoredTurn(this.chat, workspaceId, turnId)
      return turn
        ? {
            workspaceId,
            turnId,
            senderUserId: turn.senderId,
            sessionId: turn.sessionId,
          }
        : null
    })
  }

  writeAgentSession(input: ToolSessionWrite) {
    return featureResult(() =>
      this.chat.acceptToolWrite(input, () => this.writeAccess(input)),
    )
  }

  manageAgentSession(input: ToolSessionManagement, origin: string) {
    return featureResult(() =>
      this.chat.manageToolSession(input, origin, () =>
        this.writeAccess(input, origin),
      ),
    )
  }

  private async writeAccess(
    input: {
      orgId: string
      workspaceId: string
      senderUserId: string
    },
    origin = this.env.APP_ORIGIN,
  ) {
    const target = await toolSessionWorkspace(
      this.env.DB,
      input.orgId,
      input.workspaceId,
      origin,
    )
    const workspace = await findChatWorkspace(
      this.env.DB,
      input.orgId,
      input.workspaceId,
    )
    if (!workspace)
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    if (workspace.archivedAt !== null)
      throw new HttpError(
        409,
        'workspace_archived',
        'The archived chat is read-only.',
      )
    return {
      workspace: target,
      user: await toolUser(this.env.DB, input.orgId, input.senderUserId),
    }
  }
}
