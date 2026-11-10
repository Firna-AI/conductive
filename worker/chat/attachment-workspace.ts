import { WorkspaceLifecycle } from '../workspace-lifecycle'
import { readAttachment } from './attachment-data'
import { expireClaimedAttachment } from './attachment-cleanup'

/** Keeps attachment RPCs separate from the workspace lifecycle and archive methods. */
export class AttachmentWorkspace extends WorkspaceLifecycle {
  expireChatAttachment(
    orgId: string,
    id: string,
    revision: number,
    now: number,
  ) {
    return this.chat.runLifecycle(async () => {
      const record = await readAttachment(this.env.DB, id)
      const workspaceId = record?.claimedWorkspaceId
      if (
        !workspaceId ||
        !this.env.WORKSPACES.idFromName(workspaceId).equals(this.ctx.id)
      )
        return
      await expireClaimedAttachment(
        this.env,
        this.chat.store,
        workspaceId,
        orgId,
        id,
        revision,
        now,
      )
    })
  }
}
