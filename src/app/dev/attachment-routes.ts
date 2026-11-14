import type { Attachment } from '../../shared/messages'
import { attachmentPath } from '../../shared/attachment-paths'
import { PART_RETRIES } from '../upload-parts'
import type { DevBackend } from './backend'
import { attachmentFiles } from './attachment-files'
import {
  DevPartUploads,
  uploadRoutes,
  type DevUploadedFile,
} from './attachment-parts'
import { ID, type Route } from './router'

/**
 * What an upload of the dev fake does: `ready` answers at once, `wait`
 * never answers a part, so the file keeps uploading, and `fail` refuses the
 * first part of the page at each of its sends, so its chip fails once and
 * Try again then works.
 */
export type DevUploadMode = 'ready' | 'wait' | 'fail'

/** The refusal of a part that storage could not keep, as the Worker's. */
function failedPart(): Response {
  return Response.json(
    {
      error: {
        code: 'attachment_upload_failed',
        message: 'The file upload did not finish. Try again.',
      },
    },
    { status: 503 },
  )
}

/**
 * The upload routes of the dev fake, for the files of a workspace message
 * and of the first message of a new workspace: the start call, each part,
 * and the complete call, with the checks of the Worker. The state keeps
 * each completed upload, so a create or a send can name its files.
 */
export function attachmentRoutes(
  backend: DevBackend,
  mode: DevUploadMode,
): Route[] {
  const uploads = new DevPartUploads()
  let failures = 0
  const publish = async (uploaded: DevUploadedFile): Promise<Attachment> => {
    const { name, mediaType, bytes } = uploaded
    const file = { id: backend.newId(), name }
    const attachment: Attachment = {
      ...file,
      path: await attachmentPath(file),
      kind: mediaType.startsWith('image/') ? 'image' : 'file',
      mediaType,
      sizeBytes: bytes.byteLength,
    }
    backend.state.attachments.set(attachment.id, attachment)
    attachmentFiles(backend).retain(attachment, bytes)
    return attachment
  }
  const targets = [
    { type: 'workspace', workspaceId: ID.workspace },
    { type: 'new-workspace', messageId: '' },
  ] as const
  return targets.flatMap((target): Route[] => {
    const paths = uploadRoutes(ID.org, target)
    return [
      {
        method: 'POST',
        path: paths.start,
        answer: ({ body }) => uploads.start(target.type, body),
      },
      {
        method: 'PUT',
        path: paths.part,
        answer: ({ params, body }) => {
          if (mode === 'wait') return new Promise<Response>(() => {})
          if (mode === 'fail' && failures <= PART_RETRIES) {
            failures += 1
            return failedPart()
          }
          return uploads.part(target.type, params.upload, params.part, body)
        },
      },
      {
        method: 'POST',
        path: paths.complete,
        answer: ({ params, body }) =>
          uploads.complete(target.type, params.upload, body, publish),
      },
    ]
  })
}
