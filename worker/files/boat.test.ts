import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { filePaths } from '../../src/shared/files'
import { readBoatKey } from '../data/boat-keys'
import { createHarness, type TestHarness } from '../test-support/harness'
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
  await harness.reset()
})
afterAll(async () => {
  await runtime.dispose()
  await harness.dispose()
})

function recordedBoatFile(content: string, size: number, path = 'note.txt') {
  return Response.json({
    ok: true,
    type: 'file.read',
    success: true,
    path: `/home/user/repos/storefront/${path}`,
    encoding: 'base64',
    size,
    content,
  })
}

it('falls back to the fixed Boat file route with the saved account and server-side key', async () => {
  const { org, workspaceId, request, saveKey } = await setupFilesHttp(
    harness,
    runtime,
  )
  await saveKey()
  harness.boat.responseOverride = recordedBoatFile('aGkK', 3)
  const response = await request(
    filePaths.content(org.id, workspaceId, 'note.txt'),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    path: 'note.txt',
    mediaType: 'text/plain',
    sizeBytes: 3,
    encoding: 'utf-8',
    content: 'hi\n',
  })
  expect(harness.boat.requests).toHaveLength(1)
  const upstream = harness.boat.requests[0]
  const url = new URL(upstream.url)
  expect(upstream.method).toBe('GET')
  expect(url.origin).toBe('https://boat.dev')
  expect(url.pathname).toBe('/api/v1/sandboxes/bx_one/files')
  expect([...url.searchParams]).toEqual([
    ['path', '/home/user/repos/storefront/note.txt'],
    ['encoding', 'base64'],
  ])
  expect(upstream.headers.get('Authorization')).toBe('Bearer boat-first')
  expect(upstream.headers.get('X-Boat-Org')).toBe('team-one')
  expect(upstream.headers.get('Cookie')).toBe(null)
  expect((await readBoatKey(harness.env.DB, org.id))?.ciphertext).not.toContain(
    'boat-first',
  )
})

it('returns actual fallback binary bytes on download under a personal account', async () => {
  const { org, workspaceId, request, saveKey } = await setupFilesHttp(
    harness,
    runtime,
    3,
  )
  await saveKey('boat-personal')
  harness.boat.responseOverride = recordedBoatFile('AAH/', 3, 'image.bin')
  const response = await request(
    filePaths.download(org.id, workspaceId, 'image.bin'),
  )
  expect(response.status).toBe(200)
  expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([0, 1, 255])
  expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
  expect(response.headers.get('Content-Length')).toBe('3')
  expect(harness.boat.requests[0].headers.get('X-Boat-Org')).toBe('personal')
})

it('enforces the fallback byte limit and hides malformed responses and provider secrets', async () => {
  const { org, workspaceId, request, saveKey } = await setupFilesHttp(
    harness,
    runtime,
    3,
  )
  await saveKey()
  harness.boat.responseOverride = recordedBoatFile('w6nDqQ==', 4)
  const large = await request(
    filePaths.content(org.id, workspaceId, 'note.txt'),
  )
  expect(large.status).toBe(413)
  expect(await large.json()).toEqual({
    error: {
      code: 'file_too_large',
      message: 'The file is too large to open.',
      sizeBytes: 4,
      limitBytes: 3,
    },
  })
  harness.boat.responseOverride = recordedBoatFile('!!!!', 1)
  const invalid = await request(
    filePaths.content(org.id, workspaceId, 'note.txt'),
  )
  expect(invalid.status).toBe(502)
  expect(await invalid.json()).toEqual({
    error: {
      code: 'file_unavailable',
      message: 'The file could not be read. Try again.',
    },
  })
  harness.boat.responseOverride = recordedBoatFile('aGkK', 3, 'different.txt')
  const different = await request(
    filePaths.content(org.id, workspaceId, 'note.txt'),
  )
  expect(different.status).toBe(502)
  expect(await different.json()).toEqual({
    error: {
      code: 'file_unavailable',
      message: 'The file could not be read. Try again.',
    },
  })
  harness.boat.responseOverride = null
  harness.boat.failure = { status: 403, code: 'key-permission-refused' }
  const refused = await request(
    filePaths.content(org.id, workspaceId, 'note.txt'),
  )
  expect(refused.status).toBe(503)
  expect(await refused.json()).toEqual({
    error: {
      code: 'file_unavailable',
      message:
        'The file is not available. Try again when the cloud computer is ready.',
    },
  })
})

it('keeps disconnected diffs unavailable and avoids Boat when no sandbox or key exists', async () => {
  const { org, workspaceId, request, saveKey } = await setupFilesHttp(
    harness,
    runtime,
  )
  const noKey = await request(
    filePaths.content(org.id, workspaceId, 'note.txt'),
  )
  expect(noKey.status).toBe(503)
  expect(harness.boat.requests).toHaveLength(0)
  await saveKey()
  const diff = await request(filePaths.diff(org.id, workspaceId, 'note.txt'))
  expect(diff.status).toBe(503)
  expect(await diff.json()).toMatchObject({
    error: { code: 'file_unavailable' },
  })
  await harness.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = NULL WHERE id = ?',
  )
    .bind(workspaceId)
    .run()
  expect(
    (await request(filePaths.content(org.id, workspaceId, 'note.txt'))).status,
  ).toBe(503)
  expect(harness.boat.requests).toHaveLength(0)
})
