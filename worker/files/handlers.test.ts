import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { filePaths } from '../../src/shared/files'
import { toolFixtures } from '../../src/test-support/fixtures/tools'
import { recordedRunnerFileEvents } from '../../src/test-support/recorded-files'
import { file } from '../chat/runner-fixtures.test-support'
import {
  createHarness,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import { setupFilesHttp } from './test-support/http'
import { FILES_KEY } from './bucket-layout'
import { connectWorkspaceFiles } from './test-support/runner'
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

it('serves the last stored file tree and changes while the sandbox sleeps', async () => {
  const { org, workspaceId, files, request, evict } = await setupFilesHttp(
    harness,
    runtime,
  )
  const connected = await connectWorkspaceFiles(files)
  for (const event of structuredClone(recordedRunnerFileEvents)) {
    if (event.type === 'changes.updated') {
      event.changes.uncommittedFileCount = 4
      event.changes.omitted = { files: 32, added: 81, removed: 5 }
    }
    if (event.type === 'files.snapshot') event.tree.omittedEntryCount = 9
    connected.runner.emit(event)
  }
  connected.runner.emit({ type: 'files.unavailable' })
  await connected.flush()
  connected.runner.disconnect()
  await evict()
  const tree = await request(filePaths.tree(org.id, workspaceId))
  const changes = await request(filePaths.changes(org.id, workspaceId))
  expect(tree.status).toBe(200)
  expect(await tree.json()).toEqual({
    revision: 2,
    omittedEntryCount: 9,
    entries: [
      ...toolFixtures().files.entries.filter(
        (entry) => !['README.md', '.env.example'].includes(entry.path),
      ),
      { ...file('notes.txt'), change: 'untracked' },
      { ...file('docs'), kind: 'directory' },
      { ...file('docs/README.md'), change: 'renamed' },
    ],
    unavailable: true,
    stateRead: { eventNumber: 0, repositoryId: null, failure: null },
  })
  expect(changes.status).toBe(200)
  expect(await changes.json()).toMatchObject({
    unpushedCommits: 2,
    uncommittedFileCount: 4,
    summary: { files: 7, added: 161, removed: 50 },
    omitted: { files: 32, added: 81, removed: 5 },
  })
  expect(tree.headers.get('Cache-Control')).toBe('no-store')
  expect(harness.boat.requests).toHaveLength(0)
})

it('reads runner content and downloads bytes and uses the repository default branch for diffs', async () => {
  const { org, workspaceId, files, request } = await setupFilesHttp(
    harness,
    runtime,
    8,
  )
  const connected = await connectWorkspaceFiles(files)
  const content = request(filePaths.content(org.id, workspaceId, 'note.txt'))
  expect(await connected.nextCommand()).toEqual({
    type: 'file.read',
    requestId: 'request-1',
    path: 'note.txt',
    maxBytes: 8,
  })
  connected.runner.reply({
    type: 'file.read.result',
    requestId: 'request-1',
    result: {
      ok: true,
      file: {
        path: 'note.txt',
        mediaType: 'text/plain',
        sizeBytes: 3,
        encoding: 'utf-8',
        content: 'hi\n',
      },
    },
  })
  expect(await (await content).json()).toEqual({
    path: 'note.txt',
    mediaType: 'text/plain',
    sizeBytes: 3,
    encoding: 'utf-8',
    content: 'hi\n',
  })
  const diff = request(filePaths.diff(org.id, workspaceId, 'note.txt'))
  expect(await connected.nextCommand()).toEqual({
    type: 'file.diff',
    requestId: 'request-2',
    path: 'note.txt',
    defaultBranch: 'trunk',
  })
  connected.runner.reply({
    type: 'file.diff.result',
    requestId: 'request-2',
    result: {
      ok: true,
      diff: {
        path: 'note.txt',
        baseBranch: 'trunk',
        oldContent: null,
        newContent: 'hi\n',
        patch: '+hi\n',
        binary: false,
      },
    },
  })
  expect(await (await diff).json()).toEqual({
    path: 'note.txt',
    baseBranch: 'trunk',
    oldContent: null,
    newContent: 'hi\n',
    patch: '+hi\n',
    binary: false,
  })
  const downloadName = "O'Reilly(1)*.bin"
  const download = request(
    filePaths.download(org.id, workspaceId, downloadName),
  )
  await connected.nextCommand()
  connected.runner.reply({
    type: 'file.read.result',
    requestId: 'request-3',
    result: {
      ok: true,
      file: {
        path: downloadName,
        mediaType: 'application/octet-stream',
        sizeBytes: 3,
        encoding: 'base64',
        content: 'AAH/',
      },
    },
  })
  const response = await download
  expect(response.status).toBe(200)
  expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([0, 1, 255])
  expect(response.headers.get('Content-Disposition')).toBe(
    "attachment; filename*=UTF-8''O%27Reilly%281%29%2A.bin",
  )
  expect(await files.tree()).toBe(null)
  expect(await files.changes()).toBe(null)
  expect(harness.boat.requests).toHaveLength(0)
})

it('checks the request gate and org workspace relationship before reaching file resources', async () => {
  const { org, workspaceId, request, handler, session, workspaceFiles } =
    await setupFilesHttp(harness, runtime)
  const routes = [
    filePaths.tree(org.id, workspaceId),
    filePaths.changes(org.id, workspaceId),
    filePaths.content(org.id, workspaceId, 'file.txt'),
    filePaths.download(org.id, workspaceId, 'file.txt'),
    filePaths.diff(org.id, workspaceId, 'file.txt'),
  ]
  for (const path of routes) {
    const anonymous = await handler(
      new Request(`${TEST_ORIGIN}${path}`),
      harness.env,
    )
    expect(anonymous.status).toBe(401)
    expect(await anonymous.json()).not.toHaveProperty('stateRead')
    expect(
      (await request(path, { headers: { Origin: 'https://preview.example' } }))
        .status,
    ).toBe(403)
  }
  const otherOrg = await harness.createOrg(session, 'Other org')
  expect((await request(filePaths.tree(otherOrg.id, workspaceId))).status).toBe(
    404,
  )
  await harness.env.DB.prepare(
    'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
  )
    .bind(workspaceId)
    .run()
  expect((await request(filePaths.tree(org.id, workspaceId))).status).toBe(404)
  await harness.env.DB.prepare(
    'UPDATE workspaces SET archived_at = NULL WHERE id = ?',
  )
    .bind(workspaceId)
    .run()
  harness.github.profile = {
    id: 8,
    login: 'outsider',
    name: null,
    avatar_url: null,
  }
  const outsiderSession = await harness.login()
  expect(
    (
      await request(filePaths.tree(org.id, workspaceId), {
        headers: { Cookie: outsiderSession },
      })
    ).status,
  ).toBe(404)
  await harness.env.DB.prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
    .bind(org.id)
    .run()
  expect(
    (await request(filePaths.content(org.id, workspaceId, 'file.txt'))).status,
  ).toBe(403)
  await harness.env.DB.prepare(
    'UPDATE orgs SET suspended_at = NULL WHERE id = ?',
  )
    .bind(org.id)
    .run()
  await harness.env.DB.prepare('UPDATE orgs SET deleted_at = 1 WHERE id = ?')
    .bind(org.id)
    .run()
  expect((await request(filePaths.tree(org.id, workspaceId))).status).toBe(404)
  expect(workspaceFiles).toHaveBeenCalledTimes(0)
  expect(harness.boat.requests).toHaveLength(0)
})

it('returns a cutoff only for a missing list and confines reads to repository paths', async () => {
  const { org, workspaceId, request, files, storage, evict } =
    await setupFilesHttp(harness, runtime)
  for (const path of [
    filePaths.tree(org.id, workspaceId),
    filePaths.changes(org.id, workspaceId),
  ]) {
    const response = await request(path)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: {
        code: 'file_unavailable',
        message:
          'The file is not available. Try again when the cloud computer is ready.',
      },
      stateRead: { eventNumber: 0, repositoryId: null, failure: null },
    })
  }
  const connected = await connectWorkspaceFiles(files)
  connected.runner.emit({ type: 'files.unavailable' })
  await connected.flush()
  await evict()
  const tree = await request(filePaths.tree(org.id, workspaceId))
  expect(tree.status).toBe(200)
  expect(await tree.json()).toEqual({
    revision: 0,
    entries: [],
    unavailable: true,
    stateRead: { eventNumber: 0, repositoryId: null, failure: null },
  })
  const response = await request(
    filePaths.content(org.id, workspaceId, '../other-repository/secret.txt'),
  )
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({
    error: {
      code: 'invalid_input',
      message: 'Choose a file in this repository.',
    },
  })
  await storage.transaction((data) => data.put(FILES_KEY, null))
  const damaged = await request(filePaths.tree(org.id, workspaceId))
  expect(damaged.status).toBe(502)
  expect(await damaged.json()).toEqual({
    error: {
      code: 'file_unavailable',
      message: 'The file could not be read. Try again.',
    },
  })
  expect(connected.runner.commands).toHaveLength(0)
  expect(harness.boat.requests).toHaveLength(0)
})
