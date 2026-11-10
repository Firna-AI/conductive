import { expect, it } from 'vitest'

import { e2bFixture } from './client.test-support'

const fixture = e2bFixture()
const path = '/home/user/note.bin'

function ready() {
  const value = fixture()
  value.server.sandboxes.set('sandbox-one', {
    sandboxID: 'sandbox-one',
    state: 'running',
    metadata: {},
  })
  return value
}

it('reads raw binary bytes as base64 and returns the exact size above the file limit', async () => {
  const { client, server } = ready()
  server.envd.files.set(path, new Uint8Array([0, 255, 0xc3, 0xa9]))
  await expect(client.readFile('sandbox-one', path, 4)).resolves.toEqual({
    kind: 'file',
    file: { path, encoding: 'base64', content: 'AP/DqQ==', sizeBytes: 4 },
  })
  await expect(client.readFile('sandbox-one', path, 3)).resolves.toEqual({
    kind: 'too_large',
    sizeBytes: 4,
    limitBytes: 3,
  })
})

it('rechecks file metadata when content grows beyond its earlier reported size', async () => {
  const { client, server } = ready()
  server.envd.files.set(path, new Uint8Array([1, 2, 3, 4]))
  server.envd.sizes.set(path, 2)
  server.envd.afterRead = () => server.envd.sizes.set(path, 4)
  await expect(client.readFile('sandbox-one', path, 3)).resolves.toEqual({
    kind: 'too_large',
    sizeBytes: 4,
    limitBytes: 3,
  })
})

it('streams an exact upload without sending the API key to envd', async () => {
  const { client, server } = ready()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([0, 255, 1]))
      controller.close()
    },
  })
  await client.writeFile('sandbox-one', path, body, 3)
  expect(server.envd.files.get(path)).toEqual(new Uint8Array([0, 255, 1]))
  const upload = server.requests.find(
    (request) =>
      request.method === 'POST' && new URL(request.url).pathname === '/files',
  )
  expect(upload?.headers.get('X-API-Key')).toBeNull()
  expect(upload?.headers.get('X-Access-Token')).toBe(server.envdToken)
  expect(upload?.headers.get('Content-Type')).toBe('application/octet-stream')
  expect(upload?.redirect).toBe('manual')
})

it('refuses truncated uploads and a successful reply for another path', async () => {
  const { client, server } = ready()
  await expect(
    client.writeFile(
      'sandbox-one',
      path,
      new Blob([new Uint8Array([1, 2])]).stream(),
      3,
    ),
  ).rejects.toMatchObject({ kind: 'unavailable', status: 503 })
  server.envd.uploadPath = '/home/user/other.bin'
  await expect(
    client.writeFile(
      'sandbox-one',
      path,
      new Blob([new Uint8Array([1, 2])]).stream(),
      2,
    ),
  ).rejects.toMatchObject({ kind: 'invalid_response', status: 502 })
})
