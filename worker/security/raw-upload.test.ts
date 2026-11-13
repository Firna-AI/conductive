import { afterAll, beforeAll, expect, it } from 'vitest'
import { attachmentUploadUrl } from '../../src/shared/messages'
import { createApp } from '../application'
import {
  streamedBody,
  streamedRequest,
} from '../http/request-body.test-support'
import {
  createHarness,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from '../chat/harness.test-support'
import { gate } from './gate'
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})
it('checks sign-in, Origin, and org access before pulling a raw upload body', async () => {
  const fixture = await createChatFixture(harness)
  const path = attachmentUploadUrl(
    fixture.org.id,
    { type: 'workspace', workspaceId: WORKSPACE_ID },
    { name: 'file.bin', mediaType: 'application/octet-stream' },
  )
  const app = createApp({ now: () => TEST_TIME })
  for (const [cookie, origin, status] of [
    ['', TEST_ORIGIN, 401],
    [fixture.ownerCookie, 'https://elsewhere.test', 403],
    [fixture.ownerCookie, TEST_ORIGIN, 404],
  ] as const) {
    const body = streamedBody([new Uint8Array(100000001)])
    const url =
      status === 404 ? path.replace(fixture.org.id, 'another-org') : path
    const response = await app.fetch(
      streamedRequest(`${TEST_ORIGIN}${url}`, body.body, {
        Cookie: cookie,
        Origin: origin,
        'Content-Type': 'application/octet-stream',
        'Content-Length': '100000001',
      }),
      harness.env,
    )
    expect(response.status).toBe(status)
    expect(body.observed).toEqual({ pulled: 0, bytes: 0, cancelled: 0 })
  }
})
it('requires explicit octet-stream and valid known length while leaving authorized bytes unread in the gate', async () => {
  const ownerCookie = await harness.login()
  const org = await harness.createOrg(ownerCookie)
  const path = attachmentUploadUrl(
    org.id,
    { type: 'new-workspace', messageId: 'raw-first' },
    { name: 'image.png', mediaType: 'image/png' },
  )
  const cases: {
    type: string | null
    length: string | null
    status: number
    code: string
  }[] = [
    {
      type: null,
      length: '6',
      status: 415,
      code: 'file_content_type_required',
    },
    {
      type: 'text/plain',
      length: '6',
      status: 415,
      code: 'file_content_type_required',
    },
    {
      type: 'application/octet-stream; charset=utf-8',
      length: '6',
      status: 415,
      code: 'file_content_type_required',
    },
    {
      type: 'application/octet-stream',
      length: null,
      status: 411,
      code: 'content_length_required',
    },
    {
      type: 'application/octet-stream',
      length: '-1',
      status: 400,
      code: 'invalid_content_length',
    },
    {
      type: 'application/octet-stream',
      length: 'unknown',
      status: 400,
      code: 'invalid_content_length',
    },
    {
      type: 'application/octet-stream',
      length: '100000001',
      status: 413,
      code: 'attachment_too_large',
    },
  ]
  for (const item of cases) {
    const stream = streamedBody([new Uint8Array(6)])
    const headers = new Headers({ Cookie: ownerCookie, Origin: TEST_ORIGIN })
    if (item.type !== null) headers.set('Content-Type', item.type)
    if (item.length !== null) headers.set('Content-Length', item.length)
    await expect(
      gate(
        streamedRequest(`${TEST_ORIGIN}${path}`, stream.body, headers),
        harness.env,
        TEST_TIME,
      ),
    ).rejects.toMatchObject({ status: item.status, code: item.code })
    expect(stream.observed.pulled).toBe(0)
  }
  const stream = streamedBody([new Uint8Array(6)])
  const context = await gate(
    streamedRequest(`${TEST_ORIGIN}${path}`, stream.body, {
      Cookie: ownerCookie,
      Origin: TEST_ORIGIN,
      'Content-Type': 'application/octet-stream',
      'Content-Length': '6',
    }),
    harness.env,
    TEST_TIME,
  )
  expect(context.body).toBeNull()
  expect(context.rawUploadBytes).toBe(6)
  expect(stream.observed.pulled).toBe(0)
})
