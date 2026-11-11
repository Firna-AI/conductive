import type { AppEnv, HttpFetch } from '../env'
import {
  attachmentPath,
  ATTACHMENTS_DIRECTORY,
} from '../../src/shared/attachment-paths'
import { HttpError } from '../http'
import { providerForAccount } from '../sandbox/client'
import { attachmentWorkspace } from './attachment-claim-data'
import { readAttachment } from './attachment-data'
import { attachmentRepositoryDirectory } from './attachment-paths'
import { attachmentBucket, attachmentNotFound } from './attachment-record'
import type { StoredAttachment } from './types'

export async function prepareMessageAttachments(
  env: AppEnv,
  workspaceId: string,
  userId: string,
  _messageId: string,
  attachments: readonly StoredAttachment[],
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
  const provider = providerForAccount(env, httpFetch, workspace.providerAccount)
  const directory = await attachmentRepositoryDirectory(env.DB, workspace)
  await provider.writeFile(
    workspace.sandboxId,
    `${directory}/${ATTACHMENTS_DIRECTORY}/.gitignore`,
    new Blob(['*']).stream(),
    1,
  )
  for (const attachment of attachments) {
    const current = await attachmentWorkspace(env.DB, workspaceId, userId)
    if (
      current?.sandboxId !== workspace.sandboxId ||
      current.providerAccount !== workspace.providerAccount
    )
      throw attachmentNotFound()
    const record = await readAttachment(env.DB, attachment.attachmentId)
    if (
      !record ||
      record.orgId !== workspace.orgId ||
      record.uploaderUserId !== userId ||
      record.state !== 'claimed' ||
      record.claimedWorkspaceId !== workspaceId ||
      attachment.relativePath !== (await attachmentPath(record))
    )
      throw attachmentNotFound()
    const object = await bucket.get(record.objectKey)
    if (!object || object.size !== record.sizeBytes) throw attachmentNotFound()
    await provider.writeFile(
      workspace.sandboxId,
      `${directory}/${attachment.relativePath}`,
      object.body,
      record.sizeBytes,
    )
  }
  const current = await attachmentWorkspace(env.DB, workspaceId, userId)
  if (
    current?.sandboxId !== workspace.sandboxId ||
    current.providerAccount !== workspace.providerAccount
  )
    throw attachmentNotFound()
  return workspace.sandboxId
}
