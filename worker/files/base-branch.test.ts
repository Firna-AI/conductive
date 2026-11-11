import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { filePaths } from '../../src/shared/files'
import { createHarness, type TestHarness } from '../test-support/harness'
import { setupFilesHttp } from './test-support/http'
import { connectWorkspaceFiles } from './test-support/runner'
import {
  createFilesStorage,
  type FilesStorageHarness,
} from './test-support/storage'

let h: TestHarness
let storage: FilesStorageHarness
beforeAll(async () => {
  h = await createHarness()
  storage = await createFilesStorage()
})
beforeEach(async () => {
  await h.reset()
})
afterAll(async () => {
  await storage.dispose()
  await h.dispose()
})

it('sends the stored workspace base to the runner for a diff', async () => {
  const { org, workspaceId, files, request } = await setupFilesHttp(h, storage)
  await h.env.DB.prepare('UPDATE workspaces SET base_branch = ? WHERE id = ?')
    .bind('feature/review', workspaceId)
    .run()
  const connected = await connectWorkspaceFiles(files)
  const response = request(filePaths.diff(org.id, workspaceId, 'note.txt'))
  const command = await connected.nextCommand()
  connected.runner.reply({
    type: 'file.diff.result',
    requestId: 'request-1',
    result: {
      ok: true,
      diff: {
        path: 'note.txt',
        baseBranch: 'feature/review',
        oldContent: 'old\n',
        newContent: 'new\n',
        patch: '-old\n+new\n',
        binary: false,
      },
    },
  })
  expect(command).toEqual({
    type: 'file.diff',
    requestId: 'request-1',
    path: 'note.txt',
    defaultBranch: 'feature/review',
  })
  expect((await response).status).toBe(200)
  expect(await (await response).json()).toMatchObject({
    baseBranch: 'feature/review',
  })
})
