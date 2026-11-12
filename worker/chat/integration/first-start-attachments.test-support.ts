import { expect } from 'vitest'

import { readAttachment as readPublicAttachment } from '../../../src/app/api/read-workspaces'
import { attachmentUploadUrl } from '../../../src/shared/messages'
import {
  attachmentPath,
  ATTACHMENTS_DIRECTORY,
} from '../../../src/shared/attachment-paths'
import type { HttpFetch } from '../../env'
import { readAttachment } from '../attachment-data'
import { attachmentBucket } from '../attachment-record'
import { identifier, record } from '../inputs'
import type { Workspace } from './journey-entry.test-support'
import type { OuterRuntime } from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_REPOSITORY } from './outer-seed.test-support'

export const FIRST_START_FILE_BYTES = new Uint8Array([0, 255, 128, 13, 10, 65])
export const REPAIRED_REPOSITORY_LOCATIONS = [
  {
    repositoryId: OUTER_REPOSITORY,
    directory: '/home/user/code/repaired-repository',
    variable: 'CONDUCTIVE_REPOSITORY_REPAIRED_REPOSITORY_DIR',
  },
]

export function firstStartAttachmentTransfer() {
  const copies: Uint8Array[] = []
  const paths: string[] = []
  const outbound = async (request: Request, fallback: HttpFetch) => {
    const url = new URL(request.url)
    if (
      url.hostname === 'boat.dev' &&
      url.pathname.endsWith('/files/upload-url')
    ) {
      const path = identifier(record(await request.json()).path)
      paths.push(path)
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
  return { copies, paths, outbound }
}

export async function expectFirstStartCopies(
  fixture: OuterRuntime,
  transfer: ReturnType<typeof firstStartAttachmentTransfer>,
  command: Record<string, unknown>,
  attachmentId: string,
) {
  const stored = await readAttachment(fixture.env.DB, attachmentId)
  if (!stored) throw new Error('The file record is missing.')
  const directory = REPAIRED_REPOSITORY_LOCATIONS[0].directory
  const path = `${directory}/${await attachmentPath(stored)}`
  expect(transfer.copies).toEqual([
    new Uint8Array([42]),
    FIRST_START_FILE_BYTES,
  ])
  expect(transfer.paths).toEqual([
    `${directory}/${ATTACHMENTS_DIRECTORY}/.gitignore`,
    path,
  ])
  expect(command.attachments).toEqual([{ attachmentId, path }])
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
