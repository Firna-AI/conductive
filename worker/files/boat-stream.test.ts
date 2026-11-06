import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { filePaths } from '../../src/shared/files'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  fileInfoResponse,
  oversizedFileStream,
  STREAM_FILE_PATH,
} from './test-support/boat-stream'
import { setupFilesHttp } from './test-support/http'
import {
  createFilesStorage,
  type FilesStorageHarness,
} from './test-support/storage'

let harness: TestHarness
let runtime: FilesStorageHarness
beforeAll(async () => {
  harness = await createHarness()
  runtime = await createFilesStorage()
})
beforeEach(async () => {
  harness.boat.responseFactories = []
  await harness.reset()
})
afterEach(() => {
  harness.boat.responseFactories = []
})
afterAll(async () => {
  await runtime.dispose()
  await harness.dispose()
})

it('cancels oversized fallback bodies early and returns the exact file metadata size', async () => {
  const { org, workspaceId, request, saveKey } = await setupFilesHttp(
    harness,
    runtime,
    3,
  )
  await saveKey()
  const stream = oversizedFileStream()
  harness.boat.responseFactories = [stream.response, () => fileInfoResponse()]
  const response = await request(
    filePaths.content(org.id, workspaceId, 'note.txt'),
  )
  console.info('Bounded file stream:', {
    ...stream.observed,
    totalChunks: stream.totalChunks,
    totalBytes: stream.totalBytes,
  })
  expect(stream.observed.cancelled).toBe(1)
  expect(stream.observed.chunks).toBe(2)
  expect(stream.observed.bytes).toBe(stream.firstChunkBytes + 4096)
  expect(response.status).toBe(413)
  expect(await response.json()).toEqual({
    error: {
      code: 'file_too_large',
      message: 'The file is too large to open.',
      sizeBytes: 123_456,
      limitBytes: 3,
    },
  })
  expect(
    harness.boat.requests.map((upstream) => {
      const url = new URL(upstream.url)
      return [url.pathname, [...url.searchParams]]
    }),
  ).toEqual([
    [
      '/api/v1/sandboxes/bx_one/files',
      [
        ['path', STREAM_FILE_PATH],
        ['encoding', 'base64'],
      ],
    ],
    ['/api/v1/sandboxes/bx_one/files/info', [['path', STREAM_FILE_PATH]]],
  ])
  for (const upstream of harness.boat.requests) {
    expect(upstream.method).toBe('GET')
    expect(new URL(upstream.url).origin).toBe('https://boat.dev')
    expect(upstream.headers.get('Authorization')).toBe('Bearer boat-first')
    expect(upstream.headers.get('X-Boat-Org')).toBe('team-one')
    expect(upstream.headers.get('Cookie')).toBe(null)
    expect(upstream.redirect).toBe('error')
  }
})

it('keeps file metadata failures safe after cancelling an oversized fallback body', async () => {
  const { org, workspaceId, request, saveKey } = await setupFilesHttp(
    harness,
    runtime,
    3,
  )
  await saveKey()
  const cases = [
    {
      name: 'refused metadata',
      status: 503,
      response: () =>
        Response.json(
          {
            ok: false,
            code: 'forbidden',
            message: 'private boat-first credential',
          },
          { status: 403 },
        ),
    },
    {
      name: 'malformed metadata',
      status: 502,
      response: () =>
        Response.json({
          ok: true,
          type: 'file.info',
          success: true,
          file: { path: STREAM_FILE_PATH, size: 123_456 },
        }),
    },
    {
      name: 'different metadata path',
      status: 502,
      response: () => fileInfoResponse('/home/user/another-file.txt'),
    },
  ]
  for (const scenario of cases) {
    const stream = oversizedFileStream()
    harness.boat.responseFactories = [stream.response, scenario.response]
    const response = await request(
      filePaths.content(org.id, workspaceId, 'note.txt'),
    )
    expect(stream.observed.cancelled, scenario.name).toBe(1)
    expect(stream.observed.chunks, scenario.name).toBe(2)
    expect(response.status, scenario.name).toBe(scenario.status)
    const value: unknown = await response.json()
    expect(value, scenario.name).toMatchObject({
      error: { code: 'file_unavailable' },
    })
    expect(JSON.stringify(value), scenario.name).not.toContain('boat-first')
  }
})
