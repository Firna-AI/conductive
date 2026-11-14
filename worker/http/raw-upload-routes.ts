import { ATTACHMENT_PART_BYTES } from '../../src/shared/messages'
import { HttpError } from '../http'
import { attachmentTooLarge } from '../chat/attachment-record'

const ATTACHMENT_RAW_MAX_BYTES = 100_000_000

const RAW_UPLOAD_ROUTES = [
  {
    method: 'POST',
    kind: 'file',
    pattern: /^\/api\/orgs\/[^/]+\/attachments$/,
    maxBytes: ATTACHMENT_RAW_MAX_BYTES,
  },
  {
    method: 'POST',
    kind: 'file',
    pattern:
      /^\/api\/orgs\/[^/]+\/workspaces\/(?<workspaceId>[^/]+)\/attachments$/,
    maxBytes: ATTACHMENT_RAW_MAX_BYTES,
  },
  {
    method: 'PUT',
    kind: 'part',
    pattern:
      /^\/api\/orgs\/[^/]+\/attachments\/uploads\/(?<uploadId>[^/]+)\/parts\/(?<partNumber>[^/]+)$/,
    maxBytes: ATTACHMENT_PART_BYTES,
  },
  {
    method: 'PUT',
    kind: 'part',
    pattern:
      /^\/api\/orgs\/[^/]+\/workspaces\/(?<workspaceId>[^/]+)\/attachments\/uploads\/(?<uploadId>[^/]+)\/parts\/(?<partNumber>[^/]+)$/,
    maxBytes: ATTACHMENT_PART_BYTES,
  },
] as const

export type RawUploadRoute = {
  workspaceIdSegment: string | null
  maxBytes: number
} & (
  | { kind: 'file' }
  | { kind: 'part'; uploadIdSegment: string; partNumberSegment: string }
)

/** The gate, entry budget, and feature dispatch use this same exact registry. */
export function rawUploadRoute(
  request: Pick<Request, 'url' | 'method'>,
): RawUploadRoute | null {
  const path = new URL(request.url).pathname
  for (const route of RAW_UPLOAD_ROUTES) {
    const match =
      request.method === route.method ? path.match(route.pattern) : null
    if (!match) continue
    const base = {
      workspaceIdSegment: match.groups?.workspaceId ?? null,
      maxBytes: route.maxBytes,
    }
    if (route.kind === 'file') return { ...base, kind: 'file' }
    if (match.groups?.uploadId && match.groups.partNumber)
      return {
        ...base,
        kind: 'part',
        uploadIdSegment: match.groups.uploadId,
        partNumberSegment: match.groups.partNumber,
      }
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
