import type { AppEnv } from '../env'
import { warnWorker } from '../warnings'
import {
  attachmentBatch,
  readAttachment,
  removeAttachmentRecord,
  setAttachmentState,
} from './attachment-data'
import { attachmentBucket, type AttachmentRecord } from './attachment-record'
import type { ChatStore } from './store'
import { attachmentWorkspaceSurvives } from './attachment-claim-data'

async function removeAttachmentBytes(
  env: AppEnv,
  record: AttachmentRecord,
): Promise<void> {
  const bucket = attachmentBucket(env)
  if (record.multipartId) {
    try {
      await bucket
        .resumeMultipartUpload(record.objectKey, record.multipartId)
        .abort()
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !/(?:10024|NoSuchUpload|specified multipart upload does not exist)/i.test(
          error.message,
        )
      )
        throw error
    }
  }
  await bucket.delete(record.objectKey)
  await removeAttachmentRecord(env.DB, record.id)
}

export async function deleteAttachment(
  env: AppEnv,
  record: AttachmentRecord,
): Promise<boolean> {
  if (
    record.state !== 'deleting' &&
    !(await setAttachmentState(env.DB, record, 'deleting'))
  )
    return false
  await removeAttachmentBytes(env, record)
  return true
}

/** The caller holds the workspace chat queue, including admission. */
export async function expireClaimedAttachment(
  env: AppEnv,
  store: ChatStore,
  workspaceId: string,
  orgId: string,
  id: string,
  revision: number,
  now: number,
): Promise<void> {
  const record = await readAttachment(env.DB, id)
  if (
    !record ||
    record.orgId !== orgId ||
    record.claimedWorkspaceId !== workspaceId ||
    record.revision !== revision ||
    record.expiresAt > now
  )
    return
  if (record.state !== 'deleting') {
    const use = await store.read(workspaceId, (view) => view.attachmentUse(id))
    if (use && (await attachmentWorkspaceSurvives(env.DB, workspaceId, orgId)))
      return
  }
  await deleteAttachment(env, record)
}

export async function purgeWorkspaceAttachments(
  env: AppEnv,
  workspaceId: string,
  renew: () => Promise<void>,
): Promise<void> {
  while (true) {
    const records = await attachmentBatch(env.DB, { workspaceId })
    if (records.length === 0) return
    for (const record of records) {
      await renew()
      await deleteAttachment(env, record)
    }
  }
}

export async function purgeOrgAttachments(
  env: AppEnv,
  orgId: string,
  renew: () => Promise<void>,
): Promise<void> {
  while (true) {
    const records = await attachmentBatch(env.DB, { orgId })
    if (records.length === 0) return
    for (const record of records) {
      await renew()
      await deleteAttachment(env, record)
    }
  }
}

export async function cleanupDraftAttachments(
  env: AppEnv,
  now: number,
): Promise<void> {
  let after = ''
  while (true) {
    const records = await attachmentBatch(env.DB, { now, after })
    for (const record of records) {
      try {
        if (record.state === 'claimed' && record.claimedWorkspaceId) {
          if (env.WORKSPACES)
            await env.WORKSPACES.getByName(
              record.claimedWorkspaceId,
            ).expireChatAttachment(
              record.orgId,
              record.id,
              record.revision,
              now,
            )
        } else await deleteAttachment(env, record)
      } catch {
        warnWorker('An attachment cleanup will retry.')
      }
      after = record.id
    }
    if (records.length < 32) break
  }
  if (!env.CHAT_ATTACHMENTS) return
  let cursor: string | undefined
  do {
    const objects = await env.CHAT_ATTACHMENTS.list({
      prefix: 'attachments/',
      cursor,
      limit: 128,
      include: ['customMetadata'],
    })
    for (const object of objects.objects) {
      const id = object.customMetadata?.attachmentId
      if (id && !(await readAttachment(env.DB, id)))
        await env.CHAT_ATTACHMENTS.delete(object.key)
    }
    cursor = objects.truncated ? objects.cursor : undefined
  } while (cursor)
}
