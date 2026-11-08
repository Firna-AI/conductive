import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { filePaths } from '../../src/shared/files'
import { record, string } from '../chat/inputs'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
const sockets: WebSocket[] = []
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await closeSockets(...sockets)
  sockets.length = 0
  await fixture?.dispose()
})

it('serves atomic multipart trees and routes bounded file reads to the physical runner', async () => {
  const active = (fixture = await featureFixture(bundle))
  const connected = await requestRunner(active)
  expect(connected.status).toBe(101)
  if (!connected.webSocket) throw new Error('Missing runner socket')
  sockets.push(connected.webSocket)
  const runner = new OuterFakeRunner(connected.webSocket)
  await runner.inbox.next()
  runner.emit({ type: 'runner.ready' })
  await runner.inbox.next()
  runner.emit({
    type: 'files.snapshot',
    tree: {
      revision: 1,
      partNumber: 1,
      partCount: 2,
      entries: [
        { path: 'first.txt', name: 'first.txt', kind: 'file', change: null },
      ],
    },
  })
  await runner.inbox.next()
  const incomplete = await active.request(
    filePaths.tree(OUTER_ORG, OUTER_WORKSPACE),
  )
  expect(incomplete.status).toBe(503)
  runner.emit({
    type: 'files.snapshot',
    tree: {
      revision: 1,
      partNumber: 2,
      partCount: 2,
      entries: [
        { path: 'last.txt', name: 'last.txt', kind: 'file', change: null },
      ],
    },
  })
  await runner.inbox.next()
  const tree = await active.request(filePaths.tree(OUTER_ORG, OUTER_WORKSPACE))
  expect(tree.status).toBe(200)
  expect(await tree.json()).toEqual({
    revision: 1,
    entries: [
      { path: 'first.txt', name: 'first.txt', kind: 'file', change: null },
      { path: 'last.txt', name: 'last.txt', kind: 'file', change: null },
    ],
  })
  const pending = active.request(
    filePaths.content(OUTER_ORG, OUTER_WORKSPACE, 'first.txt'),
  )
  const command = record(await runner.inbox.next())
  expect(command).toMatchObject({
    type: 'file.read',
    path: 'first.txt',
    maxBytes: 5_242_880,
  })
  runner.socket.send(
    JSON.stringify({
      type: 'file.read.result',
      requestId: string(command.requestId),
      result: {
        ok: true,
        file: {
          path: 'first.txt',
          encoding: 'utf-8',
          mediaType: 'text/plain',
          sizeBytes: 5,
          content: 'hello',
        },
      },
    }),
  )
  const read = await pending
  expect(read.status).toBe(200)
  expect(await read.json()).toMatchObject({
    path: 'first.txt',
    content: 'hello',
  })
  const disconnected = active.request(
    filePaths.content(OUTER_ORG, OUTER_WORKSPACE, 'last.txt'),
  )
  expect(record(await runner.inbox.next()).type).toBe('file.read')
  await closeSockets(runner.socket)
  expect((await disconnected).status).toBe(503)
})

it('reads a sleeping workspace file from its captured checkout and refuses a foreign member', async () => {
  const active = (fixture = await featureFixture(bundle))
  await active.env.DB.batch([
    active.env.DB.prepare(
      "UPDATE workspaces SET sandbox_id = 'bx_files', state = 'stopped' WHERE id = ?",
    ).bind(OUTER_WORKSPACE),
    active.env.DB.prepare(
      'UPDATE workspace_runtime SET repository_locations_json = ? WHERE workspace_id = ?',
    ).bind(
      JSON.stringify([
        {
          repositoryId: 'chat-repository',
          directory: '/home/user/code/captured',
          variable: 'CONDUCTIVE_REPOSITORY_CAPTURED_DIR',
        },
      ]),
      OUTER_WORKSPACE,
    ),
  ])
  const response = await active.request(
    filePaths.content(OUTER_ORG, OUTER_WORKSPACE, 'note.txt'),
  )
  expect(response.status).toBe(200)
  expect(active.boat.fileReads).toEqual(['/home/user/code/captured/note.txt'])
  expect(active.boat.resumeIds).toEqual([])
  const forbidden = await active.request(
    filePaths.tree(OUTER_ORG, OUTER_WORKSPACE),
    { headers: { Cookie: active.cookies.outsiderCookie } },
  )
  expect(forbidden.status).toBe(404)
})
