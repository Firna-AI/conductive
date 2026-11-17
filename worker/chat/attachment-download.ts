import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import { hash } from '../security/crypto'
import { attachmentWorkspace } from './attachment-claim-data'
import { readAttachment } from './attachment-data'
import { claimAttachmentDownload } from './attachment-download-data'
import { attachmentBucket } from './attachment-record'

export const ATTACHMENT_DOWNLOAD_PATH = '/v1/internal/attachments/download'

function refused(status = 401) {
  return new HttpError(
    status,
    'attachment_download_refused',
    'The attached file is not available.',
  )
}

export async function handleAttachmentDownload(
  request: Request,
  env: AppEnv,
  now = Date.now(),
): Promise<Response> {
  const url = new URL(request.url)
  if (
    !env.MACHINE_ORIGIN ||
    url.origin !== env.MACHINE_ORIGIN ||
    url.protocol !== 'https:' ||
    request.headers.has('Cookie') ||
    request.headers.has('Origin')
  )
    throw refused(403)
  if (url.pathname !== ATTACHMENT_DOWNLOAD_PATH || request.method !== 'POST')
    throw new HttpError(404, 'not_found', 'The page is not available.')
  const authorization = request.headers.get('Authorization')
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : ''
  const grant = token
    ? await claimAttachmentDownload(env.DB, await hash(token), now)
    : null
  if (!grant) throw refused()
  const record = await readAttachment(env.DB, grant.attachmentId)
  if (
    !record ||
    record.orgId !== grant.orgId ||
    record.state !== 'claimed' ||
    record.claimedWorkspaceId !== grant.workspaceId
  )
    throw refused()
  const workspace = await attachmentWorkspace(
    env.DB,
    grant.workspaceId,
    record.uploaderUserId,
  )
  if (
    !workspace ||
    workspace.orgId !== grant.orgId ||
    workspace.sandboxId !== grant.sandboxId ||
    workspace.providerAccount !== grant.providerAccount
  )
    throw refused()
  const object = await attachmentBucket(env).get(record.objectKey)
  if (!object || object.size !== record.sizeBytes) throw refused()
  return privateResponse(
    new Response(object.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(record.sizeBytes),
      },
    }),
  )
}
