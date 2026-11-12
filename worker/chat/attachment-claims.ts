import type { AppEnv } from '../env'
import { readAttachment } from './attachment-data'
import {
  attachmentWorkspace,
  claimAttachment,
  failedAttachmentWorkspace,
} from './attachment-claim-data'
import { attachmentNotFound, publicAttachment } from './attachment-record'
import type { ResolvedAttachments } from './types'

export async function resolveMessageAttachments(
  env: AppEnv,
  userId: string,
  workspaceId: string,
  ids: readonly string[],
  messageId: string,
  usedIds: readonly string[],
  now: number,
): Promise<ResolvedAttachments> {
  if (ids.length === 0) return { attachments: [], paths: [] }
  const workspace = await attachmentWorkspace(env.DB, workspaceId, userId)
  if (!workspace) throw attachmentNotFound()
  const attachments: ResolvedAttachments['attachments'][number][] = []
  const paths: ResolvedAttachments['paths'][number][] = []
  for (const id of ids) {
    const record = await readAttachment(env.DB, id)
    if (
      !record ||
      record.orgId !== workspace.orgId ||
      record.uploaderUserId !== userId ||
      !['ready', 'claimed'].includes(record.state)
    )
      throw attachmentNotFound()
    if (record.expiresAt <= now && !usedIds.includes(id)) {
      throw attachmentNotFound()
    }
    if (record.targetKind === 'workspace') {
      if (record.targetId !== workspaceId) throw attachmentNotFound()
    } else if (record.claimedWorkspaceId !== workspaceId) {
      if (
        record.targetId !== messageId ||
        workspace.firstMessageId !== messageId ||
        workspace.creatorId !== userId ||
        (record.claimedWorkspaceId !== null &&
          !(await failedAttachmentWorkspace(env.DB, record.claimedWorkspaceId)))
      )
        throw attachmentNotFound()
    }
    if (
      record.state !== 'claimed' ||
      record.claimedWorkspaceId !== workspaceId
    ) {
      if (!(await claimAttachment(env.DB, record, workspaceId, messageId)))
        throw attachmentNotFound()
    }
    const attachment = await publicAttachment(record)
    attachments.push(attachment)
    paths.push({
      attachmentId: id,
      relativePath: attachment.path,
    })
  }
  return { attachments, paths }
}
