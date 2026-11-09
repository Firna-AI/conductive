import type { RunnerAttachment } from '../../src/shared/runner'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError } from '../http'
import { sandboxProvider } from '../sandbox/client'
import { attachmentWorkspace } from './attachment-claim-data'
import { readAttachment } from './attachment-data'
import {
  attachmentBucket,
  attachmentNotFound,
  attachmentPath,
} from './attachment-record'

export async function prepareMessageAttachments(
  env: AppEnv,
  workspaceId: string,
  userId: string,
  messageId: string,
  attachments: readonly RunnerAttachment[],
  sandboxId: string | null,
  httpFetch: HttpFetch = (request) => fetch(request),
): Promise<string | null> {
  if (attachments.length === 0) return null
  const workspace = await attachmentWorkspace(env.DB, workspaceId, userId)
  if (!workspace?.sandboxId)
    throw new HttpError(
      503,
      'attachment_copy_failed',
      'The attached files could not reach the cloud computer. Try again.',
    )
  if (workspace.sandboxId !== sandboxId) throw attachmentNotFound()
  const bucket = attachmentBucket(env)
  const provider = sandboxProvider(env, httpFetch)
  for (const attachment of attachments) {
    const current = await attachmentWorkspace(env.DB, workspaceId, userId)
    if (current?.sandboxId !== workspace.sandboxId) throw attachmentNotFound()
    const record = await readAttachment(env.DB, attachment.attachmentId)
    if (
      !record ||
      record.orgId !== workspace.orgId ||
      record.uploaderUserId !== userId ||
      record.state !== 'claimed' ||
      record.claimedWorkspaceId !== workspaceId ||
      attachment.path !== (await attachmentPath(record, messageId))
    )
      throw attachmentNotFound()
    const object = await bucket.get(record.objectKey)
    if (!object || object.size !== record.sizeBytes) throw attachmentNotFound()
    await provider.writeFile(
      workspace.sandboxId,
      attachment.path,
      object.body,
      record.sizeBytes,
    )
  }
  if (
    (await attachmentWorkspace(env.DB, workspaceId, userId))?.sandboxId !==
    workspace.sandboxId
  )
    throw attachmentNotFound()
  return workspace.sandboxId
}
