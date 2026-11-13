import { afterAll, beforeAll, expect, it } from 'vitest'

import { attachmentUploadUrl } from '../../src/shared/messages'
import {
  createHarness,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import { requestBodyEntry } from './request-body'
import { streamedBody, streamedRequest } from './request-body.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('counts the exact raw file cap and cancels its first excess byte despite a false declared length', async () => {
  const path = attachmentUploadUrl(
    'org',
    { type: 'new-workspace', messageId: 'first' },
    { name: 'file.bin', mediaType: 'application/octet-stream' },
  )
  const entry = requestBodyEntry(async (request) =>
    Response.json({ sizeBytes: (await request.arrayBuffer()).byteLength }),
  )
  for (const extra of [false, true]) {
    const stream = streamedBody([
      new Uint8Array(100_000_000),
      ...(extra ? [new Uint8Array(1), new Uint8Array(1)] : []),
    ])
    const response = await entry(
      streamedRequest(`${TEST_ORIGIN}${path}`, stream.body, {
        'Content-Length': '1',
      }),
      harness.env,
    )
    expect(response.status).toBe(extra ? 413 : 200)
    expect(await response.json()).toEqual(
      extra
        ? {
            error: {
              code: 'attachment_too_large',
              message: 'Each file can be up to 100 MB.',
            },
          }
        : { sizeBytes: 100_000_000 },
    )
    expect(stream.observed).toEqual({
      pulled: extra ? 2 : 1,
      bytes: extra ? 100_000_001 : 100_000_000,
      cancelled: extra ? 1 : 0,
    })
  }
})

it('keeps the ordinary JSON limit on other methods and routes beside raw uploads', async () => {
  const path = attachmentUploadUrl(
    'org',
    { type: 'workspace', workspaceId: 'workspace' },
    { name: 'file', mediaType: 'application/octet-stream' },
  )
  const entry = requestBodyEntry(async (request) =>
    Response.json({ bytes: (await request.arrayBuffer()).byteLength }),
  )
  for (const [route, method] of [
    [path, 'PUT'],
    ['/api/orgs/org/sections', 'POST'],
    [path.replace('/attachments?', '/attachments/complete?'), 'POST'],
  ]) {
    const stream = streamedBody([new Uint8Array(1_000_001)])
    const response = await entry(
      streamedRequest(
        `${TEST_ORIGIN}${route}`,
        stream.body,
        { 'Content-Type': 'application/json' },
        method,
      ),
      harness.env,
    )
    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      error: {
        code: 'body_too_large',
        message: 'The request is too large. Send less data.',
      },
    })
  }
})
