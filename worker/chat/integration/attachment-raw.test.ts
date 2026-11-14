import { expect, it } from 'vitest'

import { attachmentUploadPartPath } from '../../../src/shared/messages'
import { sessionPaths, sessionsPath } from '../../../src/shared/sessions'
import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../security/desktop-contract'
import { SESSION_COOKIE } from '../../security/cookies'
import { attachmentBucket } from '../attachment-record'
import { readAttachment } from '../attachment-data'
import { identifier, record as jsonRecord } from '../inputs'
import { CLAUDE } from '../harness.test-support'
import {
  completeUpload,
  multipartFixture,
  partReceipt,
  sendPart,
  startedUpload,
  startUpload,
  uploadSinglePart,
  WORKSPACE_TARGET,
} from './attachment-multipart.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_WORKSPACE,
} from './outer-seed.test-support'

const createFixture = multipartFixture()

it('passes counted parts through native FixedLengthStream into real R2 with exact binary and empty bytes', async () => {
  const fixture = await createFixture()
  for (const bytes of [
    new Uint8Array([0, 255, 128, 13, 10]),
    new Uint8Array(),
  ]) {
    const response = await uploadSinglePart(fixture, bytes)
    expect(response.status).toBe(201)
    const result = {
      attachment: jsonRecord(jsonRecord(await response.json()).attachment),
    }
    expect(result.attachment).toMatchObject({
      name: 'multipart file.bin',
      kind: 'file',
      mediaType: 'application/octet-stream',
      sizeBytes: bytes.byteLength,
    })
    const record = await readAttachment(
      fixture.env.DB,
      identifier(result.attachment.id),
    )
    if (!record) throw new Error('The file record is missing.')
    const object = await attachmentBucket(fixture.env).get(record.objectKey)
    if (!object) throw new Error('The object is missing.')
    expect(new Uint8Array(await object.arrayBuffer())).toEqual(bytes)
    expect(record.multipartId).toBeNull()
  }
})

it('binds drafts to their org and first-message ID and refuses wrong uploader, target, and archived writes', async () => {
  const fixture = await createFixture()
  const response = await uploadSinglePart(fixture, new Uint8Array([1]), {
    target: { type: 'new-workspace', messageId: 'first-message-parts' },
  })
  expect(response.status).toBe(201)
  const result = {
    attachment: jsonRecord(jsonRecord(await response.json()).attachment),
  }
  expect(
    await readAttachment(fixture.env.DB, identifier(result.attachment.id)),
  ).toMatchObject({
    orgId: OUTER_ORG,
    targetKind: 'new-workspace',
    targetId: 'first-message-parts',
    uploaderUserId: 'owner',
  })
  const sessionReply = await fixture.request(
    sessionsPath(OUTER_ORG, OTHER_WORKSPACE),
    { method: 'POST', body: JSON.stringify({ choice: CLAUDE }) },
  )
  const session = jsonRecord(jsonRecord(await sessionReply.json()).session)
  const send = (cookie: string) =>
    fixture.request(
      sessionPaths.messages(OUTER_ORG, OTHER_WORKSPACE, identifier(session.id)),
      {
        method: 'POST',
        headers: { Cookie: cookie },
        body: JSON.stringify({
          id: 'not-the-first-message',
          text: 'Use it',
          choice: CLAUDE,
          attachmentIds: [identifier(result.attachment.id)],
        }),
      },
    )
  expect((await send(fixture.cookies.memberCookie)).status).toBe(404)
  expect((await send(fixture.cookies.ownerCookie)).status).toBe(404)
  const wrongOrg = await uploadSinglePart(fixture, new Uint8Array([1]), {
    headers: { Cookie: fixture.cookies.outsiderCookie },
  })
  expect(wrongOrg.status).toBe(404)
  await fixture.env.DB.prepare(
    'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
  )
    .bind(OUTER_WORKSPACE)
    .run()
  expect((await uploadSinglePart(fixture, new Uint8Array([1]))).status).toBe(
    409,
  )
})

it('keeps a short or interrupted native part from publishing readiness', async () => {
  const fixture = await createFixture()
  const uploadId = await startedUpload(fixture, 6)
  for (const fault of ['short', 'interrupted', 'after-bytes']) {
    const response = await sendPart(fixture, uploadId, 1, new Uint8Array(6), {
      query: `?fixtureBody=${fault}`,
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'attachment_upload_interrupted',
        message: 'The file upload did not finish. Try again.',
      },
    })
    expect(
      (
        await fixture.env.DB.prepare(
          'SELECT id, state FROM chat_attachments',
        ).all()
      ).results,
    ).toEqual([{ id: uploadId, state: 'uploading' }])
    expect((await attachmentBucket(fixture.env).list()).objects).toEqual([])
  }
})

it('keeps the desktop cookie, origin, and content-type preflight rules for part uploads', async () => {
  const fixture = await createFixture()
  const desktopCookie = fixture.cookies.ownerCookie.replace(
    `${SESSION_COOKIE}=`,
    `${DESKTOP_SESSION_COOKIE}=`,
  )
  const headers = { Origin: DESKTOP_ORIGIN, Cookie: desktopCookie }
  const started = await startUpload(
    fixture,
    4,
    WORKSPACE_TARGET,
    { name: 'desktop.png', mediaType: 'image/png' },
    headers,
  )
  expect(started.status).toBe(201)
  const uploadId = identifier(jsonRecord(await started.json()).uploadId)
  const path = attachmentUploadPartPath(
    OUTER_ORG,
    WORKSPACE_TARGET,
    uploadId,
    1,
  )
  const preflight = await fixture.runtime.dispatchFetch(
    `${fixture.env.APP_ORIGIN}${path}`,
    {
      method: 'OPTIONS',
      headers: {
        Origin: DESKTOP_ORIGIN,
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'content-type',
      },
    },
  )
  expect(preflight.status).toBe(204)
  expect(preflight.headers.get('Access-Control-Allow-Headers')).toBe(
    'Content-Type',
  )
  const part = await sendPart(
    fixture,
    uploadId,
    1,
    new Uint8Array([137, 80, 78, 71]),
    { headers },
  )
  expect(part.status).toBe(200)
  expect(part.headers.get('Access-Control-Allow-Origin')).toBe(DESKTOP_ORIGIN)
  expect(part.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  const response = await completeUpload(
    fixture,
    uploadId,
    [await partReceipt(part)],
    WORKSPACE_TARGET,
    headers,
  )
  expect(response.status).toBe(201)
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
    DESKTOP_ORIGIN,
  )
  expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  const result = {
    attachment: jsonRecord(jsonRecord(await response.json()).attachment),
  }
  expect(result.attachment.kind).toBe('image')
  const denied = await sendPart(fixture, uploadId, 1, new Uint8Array([1]), {
    headers: { Origin: 'https://another.test' },
  })
  expect(denied.status).toBe(403)
})
