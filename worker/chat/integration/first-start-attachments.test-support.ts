import { expect } from 'vitest'

import { readAttachment as readPublicAttachment } from '../../../src/app/api/read-workspaces'
import { attachmentUploadUrl } from '../../../src/shared/messages'
import type { HttpFetch } from '../../env'
import { readAttachment } from '../attachment-data'
import { attachmentBucket } from '../attachment-record'
import { identifier, record } from '../inputs'
import type { Workspace } from './journey-entry.test-support'
import type { OuterRuntime } from './outer-runtime.test-support'
import { OUTER_ORG } from './outer-seed.test-support'

export const FIRST_START_FILE_BYTES = new Uint8Array([0, 255, 128, 13, 10, 65])

export function firstStartAttachmentTransfer() {
  const copies: Uint8Array[] = []
  const outbound = async (request: Request, fallback: HttpFetch) => {
    const url = new URL(request.url)
    if (
      url.hostname === 'boat.dev' &&
      url.pathname.endsWith('/files/upload-url')
    ) {
      const path = identifier(record(await request.json()).path)
      return Response.json({
        ok: true,
        type: 'file.upload_url',
        method: 'PUT',
        path,
        url: 'https://first-start-files.test/copy',
        expiresAt: '2099-01-01T00:00:00Z',
      })
    }
    if (url.hostname === 'first-start-files.test') {
      copies.push(new Uint8Array(await request.arrayBuffer()))
      return new Response(null, { status: 200 })
    }
    return fallback(request)
  }
  return { copies, outbound }
}

export async function uploadFirstStartFile(
  fixture: OuterRuntime,
  messageId: string,
) {
  const path = attachmentUploadUrl(
    OUTER_ORG,
    { type: 'new-workspace', messageId },
    { name: 'first-task.dat', mediaType: 'application/octet-stream' },
  )
  const response = await fixture.runtime.dispatchFetch(
    `${fixture.env.APP_ORIGIN}${path}`,
    {
      method: 'POST',
      headers: {
        Cookie: fixture.cookies.memberCookie,
        Origin: fixture.env.APP_ORIGIN,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(FIRST_START_FILE_BYTES.byteLength),
      },
      body: FIRST_START_FILE_BYTES,
    },
  )
  expect(response.status).toBe(201)
  return readPublicAttachment(record(await response.json()).attachment)
}

export async function expireAndReadFirstStartFile(
  fixture: OuterRuntime,
  workspaceId: string,
  attachmentId: string,
) {
  await fixture.env.DB.prepare(
    'UPDATE chat_attachments SET expires_at = 0 WHERE id = ?',
  )
    .bind(attachmentId)
    .run()
  const stored = await readAttachment(fixture.env.DB, attachmentId)
  if (stored) {
    const bindings = await fixture.runtime.getBindings<{
      WORKSPACES: DurableObjectNamespace<Workspace>
    }>()
    await bindings.WORKSPACES.getByName(workspaceId).expireChatAttachment(
      OUTER_ORG,
      attachmentId,
      stored.revision,
      Date.now(),
    )
  }
  const claim = await readAttachment(fixture.env.DB, attachmentId)
  const object = stored
    ? await attachmentBucket(fixture.env).get(stored.objectKey)
    : null
  return {
    claim,
    bytes: object ? new Uint8Array(await object.arrayBuffer()) : null,
  }
}
