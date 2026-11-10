import type {
  AttachmentUploadTarget,
  UploadAttachmentResponse,
} from '../../src/shared/messages'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { fixedUploadBody } from '../http/fixed-upload-body'
import { rawUploadRoute } from '../http/raw-upload-routes'
import { gate } from '../security/gate'
import { randomToken } from '../security/crypto'
import { identifier } from './inputs'
import { attachmentNotFound } from './attachment-record'
import { storeAttachment } from './attachment-storage'
import { findChatWorkspace } from './queries'

export async function attachmentRoute(
  request: Request,
  env: AppEnv,
  now: () => number,
  newId: () => string = randomToken,
): Promise<Response | null> {
  const route = rawUploadRoute(request)
  if (!route) return null
  const context = await gate(request, env, now())
  if (!context.org || context.rawUploadBytes === undefined)
    throw attachmentNotFound()
  const query = new URL(request.url).searchParams
  const name = identifier(query.get('name'))
  const mediaType = identifier(query.get('mediaType'))
  let target: AttachmentUploadTarget
  if (route.workspaceIdSegment !== null) {
    let workspaceId: string
    try {
      workspaceId = decodeURIComponent(route.workspaceIdSegment)
    } catch {
      throw attachmentNotFound()
    }
    const workspace = await findChatWorkspace(
      env.DB,
      context.org.id,
      workspaceId,
    )
    if (!workspace) throw attachmentNotFound()
    if (workspace.archivedAt !== null)
      throw new HttpError(
        409,
        'workspace_archived',
        'The archived chat is read-only.',
      )
    target = { type: 'workspace', workspaceId }
  } else
    target = {
      type: 'new-workspace',
      messageId: identifier(query.get('messageId')),
    }
  const transfer = fixedUploadBody(request, context.rawUploadBytes)
  try {
    const attachment = await storeAttachment(
      env,
      {
        orgId: context.org.id,
        uploaderUserId: context.user.id,
        target,
        name,
        mediaType,
        kind: mediaType.startsWith('image/') ? 'image' : 'file',
      },
      transfer.body,
      {
        now,
        newId,
        byteLength: context.rawUploadBytes,
        bodyComplete: transfer.finished,
      },
    )
    return Response.json({ attachment } satisfies UploadAttachmentResponse, {
      status: 201,
    })
  } catch (error) {
    const interrupted = transfer.failed()
    await transfer.cancel(error)
    if (error instanceof HttpError) throw error
    throw new HttpError(
      interrupted ? 400 : 503,
      interrupted
        ? 'attachment_upload_interrupted'
        : 'attachment_upload_failed',
      'The file upload did not finish. Try again.',
    )
  }
}
