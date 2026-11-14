import { attachmentFiles } from '../../app/dev/attachment-files'
import { DevPartUploads, uploadRoutes } from '../../app/dev/attachment-parts'
import { match } from '../../app/dev/router'
import { attachmentPath } from '../../shared/attachment-paths'
import type { Attachment } from '../../shared/messages'
import { readAttachment } from '../api/read-chat'
import type { DevBackend } from './dev-backend'

const stores = new WeakMap<DevBackend, DevPartUploads>()

function uploadsOf(backend: DevBackend): DevPartUploads {
  let uploads = stores.get(backend)
  if (!uploads) {
    uploads = new DevPartUploads()
    stores.set(backend, uploads)
  }
  return uploads
}

/** The JSON body of a request, or null when it holds no JSON. */
async function jsonOf(request: Request): Promise<unknown> {
  try {
    const body: unknown = await request.clone().json()
    return body
  } catch {
    return null
  }
}

/**
 * The upload routes of the page for the files of its workspace: the start
 * call, each part, and the complete call, with the checks of the Worker, as
 * the dev fake of the app has them. Each completed file goes into
 * `attachments`, so a send can name it, and its bytes stay in the page for
 * its copy. Another request gets null.
 */
export async function handleUpload(
  backend: DevBackend,
  request: Request,
  attachments: Map<string, Attachment>,
): Promise<Response | null> {
  const { orgId, workspaceId } = backend.target
  const routes = uploadRoutes(orgId, { type: 'workspace', workspaceId })
  const path = new URL(request.url).pathname
  const uploads = uploadsOf(backend)
  if (request.method === 'POST' && path === routes.start) {
    return uploads.start('workspace', await jsonOf(request))
  }
  const part = request.method === 'PUT' ? match(routes.part, path) : null
  if (part) {
    const bytes = await request.arrayBuffer()
    return uploads.part('workspace', part.upload, part.part, bytes)
  }
  const done = request.method === 'POST' ? match(routes.complete, path) : null
  if (!done) return null
  const body = await jsonOf(request)
  return uploads.complete('workspace', done.upload, body, async (file) => {
    const named = { id: `dev-file-${attachments.size + 1}`, name: file.name }
    const attachment = readAttachment({
      ...named,
      path: await attachmentPath(named),
      kind: file.mediaType.startsWith('image/') ? 'image' : 'file',
      mediaType: file.mediaType,
      sizeBytes: file.bytes.byteLength,
    })
    attachments.set(attachment.id, attachment)
    attachmentFiles(backend).retain(attachment, file.bytes)
    return attachment
  })
}
