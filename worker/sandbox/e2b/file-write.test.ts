import { posix } from 'node:path'

import { expect, it } from 'vitest'

import { e2bFixture } from './client.test-support'
import { pythonRuntime } from './runtime.test-support'
import { fakeE2bFrames } from '../../test-support/fake-e2b-frames'

const fixture = e2bFixture()
const path = '/home/user/repository/.context/attachments/turn-one/note.bin'

function ready() {
  const value = fixture()
  value.server.sandboxes.set('sandbox-one', {
    sandboxID: 'sandbox-one',
    state: 'running',
    metadata: {},
  })
  return value
}

it('stages a nested context upload beside its destination before publishing the complete file', async () => {
  const { client, server } = ready()
  const visible: boolean[] = []
  let chunk = 0
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        visible.push(server.envd.files.has(path))
        if (chunk++ === 0) controller.enqueue(new Uint8Array([1, 2]))
        else controller.close()
      },
    },
    { highWaterMark: 0 },
  )

  await client.writeFile('sandbox-one', path, body, 2)

  const upload = server.requests.find(
    (request) =>
      request.method === 'POST' && new URL(request.url).pathname === '/files',
  )
  const uploadedPath = upload && new URL(upload.url).searchParams.get('path')
  expect(uploadedPath).not.toBe(path)
  expect(posix.dirname(uploadedPath ?? '')).toBe(posix.dirname(path))
  expect(visible).toEqual([false, false])
  expect(server.envd.files.get(path)).toEqual(new Uint8Array([1, 2]))
  expect([...server.envd.files.keys()]).toEqual([path])
  expect(
    server.requests
      .filter(
        (request) => new URL(request.url).pathname === '/process.Process/Start',
      )
      .map((request) => request.headers.get('Authorization')),
  ).toEqual(['Basic dXNlcjo=', 'Basic dXNlcjo='])
})

it('cancels the source without an upload when user preparation fails', async () => {
  const { client, server } = ready()
  let cancelled = 0
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled++
    },
  })
  server.envd.response = () =>
    fakeE2bFrames([
      { event: { start: { pid: 4321 } } },
      { event: { end: { exited: true, exitCode: 1 } } },
    ])

  await expect(
    client.writeFile('sandbox-one', path, body, 2),
  ).rejects.toMatchObject({ kind: 'unavailable', status: 503 })
  expect(cancelled).toBe(1)
  expect(
    server.requests.some(
      (request) =>
        request.method === 'POST' && new URL(request.url).pathname === '/files',
    ),
  ).toBe(false)
})

it('uses the guest helper to preserve an old file on cleanup and atomically replace it on commit', async () => {
  await expect(
    pythonRuntime(
      'file-write.py',
      `
target = os.path.join(directory, "note.bin")
temporary = os.path.join(directory, ".pending-upload")
owner = pwd.getpwuid(os.getuid()).pw_name
config = dict(path=target, temporary=temporary)
with open(target, "wb") as destination: destination.write(bytes([7, 8, 9]))
runtime.operate(dict(config, kind="file_write_prepare"), owner=owner)
with open(temporary, "wb") as source: source.write(bytes([1]))
with open(target, "rb") as destination: during = list(destination.read())
runtime.operate(dict(config, kind="file_write_cleanup"), owner=owner)
with open(target, "rb") as destination: after_failure = list(destination.read())
removed = not os.path.exists(temporary)
temporary = os.path.join(directory, ".replacement-upload")
config = dict(path=target, temporary=temporary)
runtime.operate(dict(config, kind="file_write_prepare"), owner=owner)
with open(temporary, "wb") as source: source.write(bytes([0, 1, 2, 255]))
with open(target, "rb") as old_handle:
    runtime.operate(dict(config, kind="file_write_commit"), owner=owner)
    retained = list(old_handle.read())
with open(target, "rb") as destination: after_success = list(destination.read())
print(json.dumps(dict(during=during, afterFailure=after_failure, removedTemporary=removed,
                     retainedOldHandle=retained, afterSuccess=after_success,
                     finalTemporaryExists=os.path.exists(temporary))))
`,
    ),
  ).resolves.toEqual({
    during: [7, 8, 9],
    afterFailure: [7, 8, 9],
    removedTemporary: true,
    retainedOldHandle: [7, 8, 9],
    afterSuccess: [0, 1, 2, 255],
    finalTemporaryExists: false,
  })
})

it('keeps the old destination and removes staging after every failed upload outcome', async () => {
  for (const failure of [
    'truncated',
    'oversized',
    'reply-path',
    'source-error',
    'unconsumed',
  ] as const) {
    const { client, server } = ready()
    const original = new Uint8Array([7, 8, 9])
    server.envd.files.set(path, original)
    if (failure === 'reply-path') server.envd.uploadPath = '/home/user/wrong'
    if (failure === 'unconsumed') server.envd.uploadEarly = true
    const body =
      failure === 'source-error'
        ? new ReadableStream<Uint8Array>({
            start(controller) {
              controller.error(new Error('private upload failure'))
            },
          })
        : new Blob([
            new Uint8Array(failure === 'oversized' ? [1, 2, 3] : [1, 2]),
          ]).stream()

    await expect(
      client.writeFile(
        'sandbox-one',
        path,
        body,
        failure === 'truncated' ? 3 : 2,
      ),
      failure,
    ).rejects.toMatchObject({
      kind: failure === 'reply-path' ? 'invalid_response' : 'unavailable',
      status: failure === 'reply-path' ? 502 : 503,
    })
    expect(server.envd.files.get(path), failure).toEqual(original)
    expect([...server.envd.files.keys()], failure).toEqual([path])
  }
})

it('prepares nested guest folders and a private user-owned file without publishing the destination', async () => {
  await expect(
    pythonRuntime(
      'file-write.py',
      `
target = os.path.join(directory, "repository", ".context", "attachments", "turn-one", "note.bin")
temporary = os.path.join(os.path.dirname(target), ".pending-upload")
runtime.operate(dict(kind="file_write_prepare", path=target, temporary=temporary), owner=pwd.getpwuid(os.getuid()).pw_name)
exists = os.path.isfile(temporary)
print(json.dumps(dict(parentExists=os.path.isdir(os.path.dirname(target)),
                     temporaryExists=exists, destinationExists=os.path.exists(target),
                     mode=os.stat(temporary).st_mode & 0o777 if exists else None,
                     ownedByUser=os.stat(temporary).st_uid == os.getuid() if exists else False)))
`,
    ),
  ).resolves.toEqual({
    parentExists: true,
    temporaryExists: true,
    destinationExists: false,
    mode: 0o600,
    ownedByUser: true,
  })
})
