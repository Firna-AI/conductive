import { afterEach, beforeAll, expect, it } from 'vitest'

import { chatHistoryPath } from '../../../src/shared/events'
import { sessionPaths, sessionsPath } from '../../../src/shared/sessions'
import { claimAttachment } from '../attachment-claim-data'
import { readAttachment } from '../attachment-data'
import { attachmentBucket } from '../attachment-record'
import { CLAUDE } from '../harness.test-support'
import { identifier, record } from '../inputs'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import { uploadSinglePart } from './attachment-multipart.test-support'

const FILE_BYTES = new Uint8Array([0, 255, 128, 13, 10, 65])
let bundle: string
let active: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await active?.dispose()
  active = undefined
})

async function upload(fixture: OuterRuntime, name: string) {
  const response = await uploadSinglePart(fixture, FILE_BYTES, { name })
  expect(response.status).toBe(201)
  const attachment = record(record(await response.json()).attachment)
  const stored = await readAttachment(fixture.env.DB, identifier(attachment.id))
  if (!stored) throw new Error('The file record is missing.')
  return stored
}

async function expireClaims(
  db: D1Database,
  acceptedId: string,
  unacceptedId: string,
) {
  await db
    .prepare('UPDATE chat_attachments SET expires_at = 0 WHERE id IN (?, ?)')
    .bind(acceptedId, unacceptedId)
    .run()
}

it('expires an unaccepted claim through the scheduled native RPC and retains accepted queued files and bytes', async () => {
  const fixture = (active = await createOuterRuntime(bundle))
  const accepted = await upload(fixture, 'accepted.bin')
  const unaccepted = await upload(fixture, 'unaccepted.bin')
  const created = await fixture.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: JSON.stringify({ choice: CLAUDE }) },
  )
  expect(created.status).toBe(201)
  const sessionId = identifier(record(record(await created.json()).session).id)
  const sent = await fixture.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, sessionId),
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'accepted-file',
        text: 'Keep the file queued',
        choice: CLAUDE,
        attachmentIds: [accepted.id],
      }),
    },
  )
  expect(sent.status).toBe(202)
  expect(await sent.json()).toMatchObject({
    message: { id: 'accepted-file', state: 'queued' },
  })
  expect(
    await claimAttachment(
      fixture.env.DB,
      unaccepted,
      OUTER_WORKSPACE,
      'unaccepted-message',
    ),
  ).toBe(true)
  await expireClaims(fixture.env.DB, accepted.id, unaccepted.id)

  const cleanup = await fixture.runtime.dispatchFetch(
    `${fixture.env.APP_ORIGIN}/__test/scheduled`,
  )
  expect(cleanup.status).toBe(200)
  expect(await readAttachment(fixture.env.DB, unaccepted.id)).toBeNull()
  const bucket = attachmentBucket(fixture.env)
  expect(await bucket.get(unaccepted.objectKey)).toBeNull()
  expect(await readAttachment(fixture.env.DB, accepted.id)).toMatchObject({
    state: 'claimed',
    claimedWorkspaceId: OUTER_WORKSPACE,
    claimedMessageId: 'accepted-file',
  })
  const retained = await bucket.get(accepted.objectKey)
  if (!retained) throw new Error('The accepted file object is missing.')
  expect(new Uint8Array(await retained.arrayBuffer())).toEqual(FILE_BYTES)
  const history = await fixture.request(
    chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, sessionId),
  )
  expect(history.status).toBe(200)
  expect(await history.json()).toMatchObject({
    events: expect.arrayContaining([
      expect.objectContaining({
        event: expect.objectContaining({
          type: 'message.accepted',
          message: expect.objectContaining({
            id: 'accepted-file',
            state: 'queued',
          }),
        }),
      }),
    ]),
  })
})
