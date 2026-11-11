import type { Attachment } from '../../src/shared/messages'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { hash } from '../security/crypto'

export const ATTACHMENT_DRAFT_MS = 7 * 24 * 60 * 60 * 1_000
export const ATTACHMENTS_DIRECTORY = '.context/attachments'

export interface AttachmentRecord {
  id: string
  orgId: string
  uploaderUserId: string
  targetKind: 'workspace' | 'new-workspace'
  targetId: string
  name: string
  kind: 'image' | 'file'
  mediaType: string
  sizeBytes: number
  objectKey: string
  multipartId: string | null
  state: 'uploading' | 'ready' | 'claimed' | 'deleting'
  createdAt: number
  expiresAt: number
  claimedWorkspaceId: string | null
  claimedMessageId: string | null
  revision: number
}

export function attachmentNotFound(): HttpError {
  return new HttpError(
    404,
    'attachment_not_found',
    'The attached file is not available. Upload it again.',
  )
}

export function attachmentTooLarge(): HttpError {
  return new HttpError(
    413,
    'attachment_too_large',
    'Each file can be up to 25 MB.',
  )
}

export function attachmentBucket(env: AppEnv): R2Bucket {
  if (!env.CHAT_ATTACHMENTS)
    throw new HttpError(
      503,
      'attachments_unavailable',
      'Attachments are not available. Try again.',
    )
  return env.CHAT_ATTACHMENTS
}

export function publicAttachment(record: AttachmentRecord): Attachment {
  return {
    id: record.id,
    name: record.name,
    kind: record.kind,
    mediaType: record.mediaType,
    sizeBytes: record.sizeBytes,
  }
}

export function attachmentCopyKey(
  messageId: string,
  sandboxId: string | null,
): Promise<string> {
  return hash(JSON.stringify([messageId, sandboxId]))
}

export async function attachmentPath(
  record: AttachmentRecord,
  messageId: string,
): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify([messageId, record.id])),
    ),
  )
  const directory = Array.from(digest.slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return `${ATTACHMENTS_DIRECTORY}/${directory}/${safeName(record.name)}`
}

function safeName(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]+/gu, '-')
  if (!safe || /^\.+$/u.test(safe)) return 'file'
  const dot = safe.lastIndexOf('.')
  const extension = dot < 0 ? '' : safe.slice(dot).toLowerCase().slice(0, 96)
  const stem = (dot < 0 ? safe : safe.slice(0, dot)) || 'file'
  return `${stem.slice(0, 100 - extension.length)}${extension}`
}
