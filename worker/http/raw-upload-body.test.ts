import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  attachmentUploadCompletePath,
  attachmentUploadPartPath,
  attachmentUploadStartPath,
} from '../../src/shared/messages'
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

it('keeps the ordinary JSON limit on other methods and routes beside raw uploads', async () => {
  const entry = requestBodyEntry(async (request) =>
    Response.json({ bytes: (await request.arrayBuffer()).byteLength }),
  )
  for (const [route, method] of [
    ['/api/orgs/org/sections', 'POST'],
    [
      attachmentUploadStartPath('org', {
        type: 'workspace',
        workspaceId: 'workspace',
      }),
      'POST',
    ],
    [
      attachmentUploadCompletePath(
        'org',
        { type: 'workspace', workspaceId: 'workspace' },
        'upload',
      ),
      'POST',
    ],
    [
      attachmentUploadPartPath(
        'org',
        { type: 'new-workspace', messageId: 'first' },
        'upload',
        1,
      ),
      'POST',
    ],
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

it('counts a raw part up to 64 MiB and rejects its first excess byte on both targets', async () => {
  const entry = requestBodyEntry(async (request) => {
    const reader = request.body?.getReader()
    if (!reader) throw new Error('The part body is missing.')
    let sizeBytes = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) return Response.json({ sizeBytes })
      sizeBytes += value.byteLength
    }
  })
  for (const target of [
    { type: 'new-workspace' as const, messageId: 'first' },
    { type: 'workspace' as const, workspaceId: 'workspace' },
  ]) {
    const path = attachmentUploadPartPath('org', target, 'upload', 1)
    for (const extra of [false, true]) {
      const stream = streamedBody([
        new Uint8Array(67_108_864),
        ...(extra ? [new Uint8Array(1), new Uint8Array(1)] : []),
      ])
      const response = await entry(
        streamedRequest(
          `${TEST_ORIGIN}${path}`,
          stream.body,
          {
            'Content-Length': '1',
          },
          'PUT',
        ),
        harness.env,
      )
      expect(response.status).toBe(extra ? 413 : 200)
      expect(await response.json()).toEqual(
        extra
          ? {
              error: {
                code: 'attachment_too_large',
                message: 'Each file can be up to 1 GB.',
              },
            }
          : { sizeBytes: 67_108_864 },
      )
      expect(stream.observed).toEqual({
        pulled: extra ? 2 : 1,
        bytes: extra ? 67_108_865 : 67_108_864,
        cancelled: extra ? 1 : 0,
      })
    }
  }
})
