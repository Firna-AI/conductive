import type { AppEnv, HttpFetch } from '../env'
import { attachmentPath } from '../../src/shared/attachment-paths'
import { HttpError } from '../http'
import { machineChannel } from '../machines/channel'
import { workspaceMachineOwner } from '../machines/client'
import { providerForAccount } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import { attachmentWorkspace } from './attachment-claim-data'
import { readAttachment } from './attachment-data'
import { attachmentRepositoryDirectory } from './attachment-paths'
import { attachmentNotFound } from './attachment-record'
import { createAttachmentDownload } from './attachment-download-data'
import { attachmentDownloadCommand } from './attachment-download-command'
import { attachmentDownloadProcess } from './attachment-download-process'
import { AttachmentMissing } from './attachment-missing'
import { markAttachmentTransferred } from './attachment-transfer-data'
import {
  ATTACHMENT_COPY_FAILED_MESSAGE,
  AttachmentTransferFailed,
  retryUnanswered,
} from './attachment-transfer-failure'
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
  const destination = workspace?.sandboxId
  if (!workspace || !destination)
    throw new HttpError(
      503,
      'attachment_copy_failed',
      ATTACHMENT_COPY_FAILED_MESSAGE,
    )
  if (destination !== sandboxId) throw attachmentNotFound()
  const provider = providerForAccount(env, httpFetch, workspace.providerAccount)
  const channel = machineChannel(
    env,
    workspaceMachineOwner(workspace.orgId, workspaceId),
    provider,
    destination,
  )
  const requireDestination = async () => {
    const current = await attachmentWorkspace(env.DB, workspaceId, userId)
    if (
      current?.sandboxId !== destination ||
      current.orgId !== workspace.orgId ||
      current.providerAccount !== workspace.providerAccount
    )
      throw attachmentNotFound()
  }
  const downloadChannel: Pick<
    ReturnType<typeof machineChannel>,
    'startCommand' | 'getCommandStatus'
  > = {
    async startCommand(command) {
      await requireDestination()
      return channel.startCommand(command)
    },
    getCommandStatus: channel.getCommandStatus,
  }
  const directory = await attachmentRepositoryDirectory(env.DB, workspace)
  const missing: string[] = []
  for (const attachment of attachments) {
    await requireDestination()
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
    if (record.transferredSandboxId === destination) {
      const path = `${directory}/${attachment.relativePath}`
      const present = await retryUnanswered(workspaceId, async () => {
        try {
          const info = await provider.fileInfo(destination, path)
          return !info.isDirectory && info.sizeBytes === record.sizeBytes
        } catch (error) {
          if (
            error instanceof ProviderError &&
            error.kind === 'not_found' &&
            error.status === 404
          )
            return false
          throw new AttachmentTransferFailed('check', error)
        }
      })
      if (!present) missing.push(record.name)
      continue
    }
    if (record.bytesDeletedAt !== null) {
      missing.push(record.name)
      continue
    }
    const origin = env.MACHINE_ORIGIN
    if (!origin) throw attachmentNotFound()
    const download = attachmentDownloadProcess(downloadChannel, async () => {
      const token = await createAttachmentDownload(env.DB, {
        attachmentId: record.id,
        workspaceId,
        orgId: workspace.orgId,
        sandboxId: destination,
        providerAccount: workspace.providerAccount,
      })
      return attachmentDownloadCommand({
        directory,
        relativePath: attachment.relativePath,
        origin,
        token,
        sizeBytes: record.sizeBytes,
      })
    })
    await retryUnanswered(workspaceId, download)
    if (
      !(await markAttachmentTransferred(
        env.DB,
        record.id,
        workspaceId,
        destination,
        workspace.providerAccount,
      ))
    )
      throw attachmentNotFound()
  }
  await requireDestination()
  if (missing.length > 0) throw new AttachmentMissing(missing)
  return destination
}
