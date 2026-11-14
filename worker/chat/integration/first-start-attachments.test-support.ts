import { expect } from 'vitest'

import { attachmentCommandTransfer } from '../../test-support/attachment-command'

import { readAttachment as readPublicAttachment } from '../../../src/app/api/read-workspaces'
import {
  attachmentPath,
  ATTACHMENTS_DIRECTORY,
} from '../../../src/shared/attachment-paths'
import type { HttpFetch } from '../../env'
import { readAttachment } from '../attachment-data'
import { attachmentBucket } from '../attachment-record'
import { cleanupTransferredAttachments } from '../attachment-transfer-cleanup'
import { record } from '../inputs'
import type { Workspace } from './journey-entry.test-support'
import type { OuterRuntime } from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_REPOSITORY } from './outer-seed.test-support'
import { uploadSinglePart } from './attachment-multipart.test-support'

export const FIRST_START_FILE_BYTES = new Uint8Array([0, 255, 128, 13, 10, 65])
export const REPAIRED_REPOSITORY_LOCATIONS = [
  {
    repositoryId: OUTER_REPOSITORY,
    directory: '/home/user/code/repaired-repository',
    variable: 'CONDUCTIVE_REPOSITORY_REPAIRED_REPOSITORY_DIR',
  },
]

export function firstStartAttachmentTransfer() {
  let download: HttpFetch | undefined
  const transfer = attachmentCommandTransfer({
    download: (request) => {
      if (!download) throw new Error('The download route is not connected.')
      return download(request)
    },
  })
  return {
    ...transfer,
    connect: (fixture: OuterRuntime) => {
      download = async (request) => {
        const response = await fixture.runtime.dispatchFetch(request.url, {
          method: request.method,
          headers: [...request.headers.entries()],
        })
        return new Response(await response.arrayBuffer(), {
          status: response.status,
          headers: [...response.headers.entries()],
        })
      }
      fixture.boat.beforeCommand = async (command) => {
        await transfer.start('first-start-sandbox', command)
      }
    },
  }
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
  const response = await uploadSinglePart(fixture, FIRST_START_FILE_BYTES, {
    target: { type: 'new-workspace', messageId },
    name: 'first-task.dat',
    headers: { Cookie: fixture.cookies.memberCookie },
  })
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

/** Runs the scheduled sweep of transferred files, then reads the record and its stored bytes. */
async function sweepAndReadFirstStartFile(
  fixture: OuterRuntime,
  attachmentId: string,
) {
  await cleanupTransferredAttachments(fixture.env, Date.now())
  const claim = await readAttachment(fixture.env.DB, attachmentId)
  const object = claim
    ? await attachmentBucket(fixture.env).get(claim.objectKey)
    : null
  return {
    claim,
    bytes: object ? new Uint8Array(await object.arrayBuffer()) : null,
  }
}

/**
 * After a good first start, the expiry keeps the accepted file, and the sweep
 * deletes its stored copy while the record stays.
 */
export async function expectTransferredFirstStartFile(
  fixture: OuterRuntime,
  workspaceId: string,
  attachmentId: string,
) {
  const expired = await expireAndReadFirstStartFile(
    fixture,
    workspaceId,
    attachmentId,
  )
  expect(expired.claim).toMatchObject({
    state: 'claimed',
    claimedWorkspaceId: workspaceId,
  })
  expect(await sweepAndReadFirstStartFile(fixture, attachmentId)).toMatchObject(
    {
      claim: {
        state: 'claimed',
        claimedWorkspaceId: workspaceId,
        transferredSandboxId: expect.any(String),
        bytesDeletedAt: expect.any(Number),
      },
      bytes: null,
    },
  )
}
