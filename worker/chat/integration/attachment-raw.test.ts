import { Buffer } from 'node:buffer'
import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  attachmentUploadUrl,
  type AttachmentUploadTarget,
} from '../../../src/shared/messages'
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
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_WORKSPACE,
} from './outer-seed.test-support'

let bundle: string
let active: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/chat/integration/attachment-entry.test-support.ts',
  )
})
afterEach(async () => {
  await active?.dispose()
  active = undefined
})

async function createFixture() {
  active = await createOuterRuntime(bundle)
  return active
}

function upload(
  fixture: OuterRuntime,
  bytes: Uint8Array,
  options: {
    target?: AttachmentUploadTarget
    headers?: HeadersInit
    path?: string
    length?: string
    type?: string
  } = {},
) {
  const path =
    options.path ??
    attachmentUploadUrl(
      OUTER_ORG,
      options.target ?? { type: 'workspace', workspaceId: OUTER_WORKSPACE },
      { name: 'raw file.bin', mediaType: 'application/octet-stream' },
    )
  const headers = new Headers({
    Cookie: fixture.cookies.ownerCookie,
    Origin: fixture.env.APP_ORIGIN,
    'Content-Type': options.type ?? 'application/octet-stream',
    'Content-Length': options.length ?? String(bytes.byteLength),
  })
  new Headers(options.headers).forEach((value, key) => headers.set(key, value))
  return fixture.runtime.dispatchFetch(`${fixture.env.APP_ORIGIN}${path}`, {
    method: 'POST',
    headers: [...headers],
    body: bytes,
  })
}

it('passes the counted raw body through native FixedLengthStream into real R2 with exact binary and empty bytes', async () => {
  const fixture = await createFixture()
  for (const bytes of [
    new Uint8Array([0, 255, 128, 13, 10]),
    new Uint8Array(),
  ]) {
    const response = await upload(fixture, bytes)
    expect(response.status).toBe(201)
    const result = {
      attachment: jsonRecord(jsonRecord(await response.json()).attachment),
    }
    expect(result.attachment).toMatchObject({
      name: 'raw file.bin',
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

it('accepts exactly 25,000,000 raw bytes and rejects a larger declared file', async () => {
  const fixture = await createFixture()
  const bytes = new Uint8Array(25_000_000)
  bytes[0] = 255
  bytes[24_999_999] = 128
  const response = await upload(fixture, bytes)
  expect(response.status).toBe(201)
  const result = {
    attachment: jsonRecord(jsonRecord(await response.json()).attachment),
  }
  const record = await readAttachment(
    fixture.env.DB,
    identifier(result.attachment.id),
  )
  if (!record) throw new Error('The file record is missing.')
  const stored = await attachmentBucket(fixture.env).get(record.objectKey)
  if (!stored) throw new Error('The file object is missing.')
  expect(
    Buffer.compare(Buffer.from(await stored.arrayBuffer()), Buffer.from(bytes)),
  ).toBe(0)
  const oversized = await upload(fixture, new Uint8Array(25_000_001))
  expect(oversized.status).toBe(413)
  expect(await oversized.json()).toEqual({
    error: {
      code: 'attachment_too_large',
      message: 'Each file can be up to 25 MB.',
    },
  })
  expect((await attachmentBucket(fixture.env).list()).objects).toHaveLength(1)
  const path = attachmentUploadUrl(
    OUTER_ORG,
    { type: 'workspace', workspaceId: OUTER_WORKSPACE },
    { name: 'overflow.bin', mediaType: 'application/octet-stream' },
  )
  const overflowing = await upload(fixture, bytes, {
    path: `${path}&fixtureBody=overflow`,
  })
  expect(overflowing.status).toBe(413)
  expect(await overflowing.json()).toEqual({
    error: {
      code: 'attachment_too_large',
      message: 'Each file can be up to 25 MB.',
    },
  })
  expect((await attachmentBucket(fixture.env).list()).objects).toHaveLength(1)
})

it('binds raw drafts to their org and first-message ID and refuses wrong uploader, target, and archived writes', async () => {
  const fixture = await createFixture()
  const response = await upload(fixture, new Uint8Array([1]), {
    target: { type: 'new-workspace', messageId: 'first-message-raw' },
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
    targetId: 'first-message-raw',
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
  const wrongOrg = await upload(fixture, new Uint8Array([1]), {
    headers: { Cookie: fixture.cookies.outsiderCookie },
  })
  expect(wrongOrg.status).toBe(404)
  await fixture.env.DB.prepare(
    'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
  )
    .bind(OUTER_WORKSPACE)
    .run()
  expect((await upload(fixture, new Uint8Array([1]))).status).toBe(409)
})

it('cleans a short or interrupted native raw body before it can publish readiness', async () => {
  const fixture = await createFixture()
  const base = attachmentUploadUrl(
    OUTER_ORG,
    { type: 'workspace', workspaceId: OUTER_WORKSPACE },
    { name: 'partial.bin', mediaType: 'application/octet-stream' },
  )
  for (const fault of ['short', 'interrupted', 'after-bytes']) {
    const response = await upload(fixture, new Uint8Array(6), {
      path: `${base}&fixtureBody=${fault}`,
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'attachment_upload_interrupted',
        message: 'The file upload did not finish. Try again.',
      },
    })
    expect(
      (await fixture.env.DB.prepare('SELECT id FROM chat_attachments').all())
        .results,
    ).toEqual([])
    expect((await attachmentBucket(fixture.env).list()).objects).toEqual([])
  }
})

it('keeps the desktop cookie, origin, and content-type preflight rules for raw uploads', async () => {
  const fixture = await createFixture()
  const path = attachmentUploadUrl(
    OUTER_ORG,
    { type: 'workspace', workspaceId: OUTER_WORKSPACE },
    { name: 'desktop.png', mediaType: 'image/png' },
  )
  const preflight = await fixture.runtime.dispatchFetch(
    `${fixture.env.APP_ORIGIN}${path}`,
    {
      method: 'OPTIONS',
      headers: {
        Origin: DESKTOP_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    },
  )
  expect(preflight.status).toBe(204)
  expect(preflight.headers.get('Access-Control-Allow-Headers')).toBe(
    'Content-Type',
  )
  const desktopCookie = fixture.cookies.ownerCookie.replace(
    `${SESSION_COOKIE}=`,
    `${DESKTOP_SESSION_COOKIE}=`,
  )
  const response = await upload(fixture, new Uint8Array([137, 80, 78, 71]), {
    path,
    headers: { Origin: DESKTOP_ORIGIN, Cookie: desktopCookie },
  })
  expect(response.status).toBe(201)
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
    DESKTOP_ORIGIN,
  )
  expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  const result = {
    attachment: jsonRecord(jsonRecord(await response.json()).attachment),
  }
  expect(result.attachment.kind).toBe('image')
  const denied = await upload(fixture, new Uint8Array([1]), {
    headers: { Origin: 'https://another.test' },
  })
  expect(denied.status).toBe(403)
})
