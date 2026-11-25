import type { WebSocket } from 'miniflare'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'

import { filePaths } from '../../src/shared/files'
import { FILES_KEY } from '../files/bucket-layout'
import { heldOperation } from '../test-support/held-operation'
import { createHarness } from '../test-support/harness'
import { record, string } from '../chat/inputs'
import { WORKSPACE_ID } from '../chat/harness.test-support'
import { snapshot } from '../chat/runner-fixtures.test-support'
import { captureEnvironment } from '../chat/runner-output.test-support'
import { CHAT_META } from '../chat/storage-keys'
import { READ_STATE_RECOVERY } from '../chat/workspace-read-recovery'
import { failure, readState } from '../chat/workspace-read-state.test-support'
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
import { filesCutoffFixture } from './files-routes.test-support'

let bundle: string
let harness: Awaited<ReturnType<typeof createHarness>>
let fixture: FeatureFixture | undefined
const sockets: WebSocket[] = []
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
  harness = await createHarness()
})
afterEach(async () => {
  await closeSockets(...sockets)
  sockets.length = 0
  await fixture?.dispose()
  fixture = undefined
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
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
  const first = snapshot(1, 1, 2, ['first.txt'])
  runner.emit({ ...first, tree: { ...first.tree, omittedEntryCount: 7 } })
  await runner.inbox.next()
  const incomplete = await active.request(
    filePaths.tree(OUTER_ORG, OUTER_WORKSPACE),
  )
  expect(incomplete.status).toBe(503)
  expect.soft(await incomplete.json()).toEqual({
    error: {
      code: 'file_unavailable',
      message:
        'The file is not available. Try again when the cloud computer is ready.',
    },
    stateRead: { eventNumber: 1, repositoryId: null, failure: null },
  })
  const last = snapshot(1, 2, 2, ['last.txt'])
  runner.emit({ ...last, tree: { ...last.tree, omittedEntryCount: 7 } })
  await runner.inbox.next()
  const tree = await active.request(filePaths.tree(OUTER_ORG, OUTER_WORKSPACE))
  expect(tree.status).toBe(200)
  expect.soft(await tree.json()).toEqual({
    revision: 1,
    omittedEntryCount: 7,
    entries: [
      { path: 'first.txt', name: 'first.txt', kind: 'file', change: null },
      { path: 'last.txt', name: 'last.txt', kind: 'file', change: null },
    ],
    stateRead: { eventNumber: 2, repositoryId: null, failure: null },
  })
  const missingChanges = await active.request(
    filePaths.changes(OUTER_ORG, OUTER_WORKSPACE),
  )
  expect(missingChanges.status).toBe(503)
  expect(await missingChanges.json()).toEqual({
    error: {
      code: 'file_unavailable',
      message:
        'The file is not available. Try again when the cloud computer is ready.',
    },
    stateRead: { eventNumber: 2, repositoryId: null, failure: null },
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

it('keeps the tree, its failure, and its cutoff together beside a runner receipt', async () => {
  const f = await filesCutoffFixture(harness)
  const { runner, treePath } = f
  const old = snapshot(1, 1, 1, ['old.txt'])
  runner.emit({ ...old, tree: { ...old.tree, omittedEntryCount: 17 } })
  runner.emit(snapshot(2, 1, 1, ['duplicate', 'duplicate']))
  runner.emit(snapshot(3, 1, 1, ['duplicate', 'duplicate']))
  await f.drain()
  await readState(f.chat.store, WORKSPACE_ID)

  const held = heldOperation()
  await f.setStorageHooks({
    afterRead: async (key) => {
      if (key === FILES_KEY) await held.wait()
    },
  })
  const reading = f.actor.fetch(f.request(treePath))
  try {
    expect(
      await Promise.race([
        held.entered.then(() => 'tree read started'),
        reading.then(() => 'tree read finished'),
      ]),
    ).toBe('tree read started')
    const observed = await f.observeNextQueued()
    const current = snapshot(4, 1, 1, ['new.txt'])
    runner.emit({ ...current, tree: { ...current.tree, omittedEntryCount: 0 } })
    await observed.queued
    await observed.restore()
    held.release()
    const before = await reading
    expect(before.status).toBe(200)
    expect(await before.json()).toEqual({
      revision: 1,
      omittedEntryCount: 17,
      entries: [
        { path: 'old.txt', name: 'old.txt', kind: 'file', change: null },
      ],
      stateRead: {
        eventNumber: 4,
        repositoryId: 'repo',
        failure: failure('files.snapshot', 4, 1_800_000_000_000, 3),
      },
    })
    await f.drain()
    const after = await f.fetch(treePath)
    expect(after.status).toBe(200)
    expect(await after.json()).toEqual({
      revision: 4,
      omittedEntryCount: 0,
      entries: [
        { path: 'new.txt', name: 'new.txt', kind: 'file', change: null },
      ],
      stateRead: { eventNumber: 5, repositoryId: 'repo', failure: null },
    })
  } finally {
    held.release()
    await reading
  }
})

it('waits for the shared recovery before returning filtered changes and their cutoff', async () => {
  const f = await filesCutoffFixture(harness)
  f.runner.emit({
    type: 'changes.updated',
    changes: {
      revision: 1,
      partNumber: 1,
      partCount: 1,
      baseBranch: 'topic-private-token',
      unpushedCommits: 2,
      uncommittedFileCount: 1,
      files: [
        {
          path: 'private-token.ts',
          change: 'modified',
          added: 1,
          removed: 0,
          uncommitted: true,
        },
      ],
      summary: { files: 1, added: 1, removed: 0 },
      omitted: { files: 3, added: 7, removed: 2 },
    },
  })
  await f.drain()
  await captureEnvironment(f, { TOKEN: 'private-token' })
  const path = f.changesPath
  const refused = await f.actor.fetch(f.request(path, undefined, ''))
  expect(refused.status).toBe(401)
  expect(await refused.json()).not.toHaveProperty('stateRead')
  expect(await f.storage.get(CHAT_META)).not.toHaveProperty('readState')

  const held = heldOperation()
  let starts = 0
  await f.setStorageHooks({
    afterCommit: async ({ writes }) => {
      if (writes.includes(READ_STATE_RECOVERY) && ++starts === 1)
        await held.wait()
    },
  })
  const recovering = readState(f.chat.store, WORKSPACE_ID)
  await held.entered
  const observed = await f.observeNextQueued()
  const reading = f.actor.fetch(f.request(path))
  try {
    expect(
      await Promise.race([
        observed.queued.then(() => 'changes read queued'),
        reading.then(() => 'changes read finished'),
      ]),
    ).toBe('changes read queued')
    held.release()
    await recovering
    const changes = await reading
    expect(changes.status).toBe(200)
    expect(await changes.json()).toMatchObject({
      baseBranch: 'topic-private-token',
      displayBaseBranch: 'topic-[redacted]',
      unpushedCommits: 2,
      uncommittedFileCount: 1,
      files: [{ path: 'private-token.ts', displayPath: '[redacted].ts' }],
      omitted: { files: 3, added: 7, removed: 2 },
      stateRead: { eventNumber: 2, repositoryId: 'repo', failure: null },
    })
    expect(starts).toBe(1)
  } finally {
    held.release()
    await Promise.all([reading, recovering])
    await observed.restore()
  }
})
