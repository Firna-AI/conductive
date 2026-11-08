import { ATTACHMENT_MAX_BYTES } from '../../src/shared/messages'
import { HttpError } from '../http'
import { attachmentTooLarge } from '../chat/attachment-record'

const RAW_UPLOAD_ROUTES = [
  {
    method: 'POST',
    pattern: /^\/api\/orgs\/[^/]+\/attachments$/,
    maxBytes: ATTACHMENT_MAX_BYTES,
  },
  {
    method: 'POST',
    pattern: /^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)\/attachments$/,
    maxBytes: ATTACHMENT_MAX_BYTES,
  },
]

/** The gate, entry budget, and feature dispatch use this same exact POST registry. */
export function rawUploadRoute(
  request: Pick<Request, 'url' | 'method'>,
): { workspaceIdSegment: string | null; maxBytes: number } | null {
  const path = new URL(request.url).pathname
  for (const route of RAW_UPLOAD_ROUTES) {
    const match =
      request.method === route.method ? path.match(route.pattern) : null
    if (match)
      return { workspaceIdSegment: match[1] ?? null, maxBytes: route.maxBytes }
  }
  return null
}

export function rawUploadLength(request: Request, maxBytes: number): number {
  if (
    request.headers.get('Content-Type')?.trim().toLowerCase() !==
    'application/octet-stream'
  )
    throw new HttpError(
      415,
      'file_content_type_required',
      'Send the file as application/octet-stream.',
    )
  const declared = request.headers.get('Content-Length')
  if (declared === null)
    throw new HttpError(
      411,
      'content_length_required',
      'Send the file with its byte length.',
    )
  const length = Number(declared)
  if (!/^[0-9]+$/.test(declared))
    throw new HttpError(
      400,
      'invalid_content_length',
      'The file byte length is not valid.',
    )
  if (length > maxBytes) throw attachmentTooLarge()
  if (!Number.isSafeInteger(length))
    throw new HttpError(
      400,
      'invalid_content_length',
      'The file byte length is not valid.',
    )
  return length
}
