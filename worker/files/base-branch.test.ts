import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { filePaths } from '../../src/shared/files'
import { createHarness, type TestHarness } from '../test-support/harness'
import { setupFilesHttp } from './test-support/http'
import { setupRenamedDefaultFiles } from './test-support/renamed-default'
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

it.each(['current', 'older'] as const)(
  'keeps each workspace diff on its reported base after a default rename with %s runner replies',
  async (runnerKind) => {
    const { org, workspaceId, continuedId, retained, continued, request } =
      await setupRenamedDefaultFiles(h, storage, runnerKind)
    expect(
      (
        await h.env.DB.prepare(
          `SELECT w.id, w.repository_id AS repositoryId,
            w.base_branch AS baseBranch, r.default_branch AS defaultBranch
          FROM workspaces w JOIN repositories r ON r.id = w.repository_id
          ORDER BY w.id`,
        ).all()
      ).results,
    ).toEqual([
      {
        id: workspaceId,
        repositoryId: 'repository-1',
        baseBranch: null,
        defaultBranch: 'trunk',
      },
      {
        id: continuedId,
        repositoryId: 'repository-1',
        baseBranch: 'trunk',
        defaultBranch: 'trunk',
      },
    ])
    for (const { id, connected, baseBranch, oldContent, newContent, patch } of [
      {
        id: workspaceId,
        connected: retained,
        baseBranch: 'main',
        oldContent: 'main before\n',
        newContent: 'retained edit\n',
        patch: '-main before\n+retained edit\n',
      },
      {
        id: continuedId,
        connected: continued,
        baseBranch: 'trunk',
        oldContent: 'trunk before\n',
        newContent: 'continued edit\n',
        patch: '-trunk before\n+continued edit\n',
      },
    ]) {
      const changes = await request(filePaths.changes(org.id, id))
      expect(changes.status).toBe(200)
      expect(await changes.json()).toMatchObject({ baseBranch })
      const pending = request(filePaths.diff(org.id, id, 'note.txt'))
      const command = await connected.nextCommand()
      connected.runner.reply({
        type: 'file.diff.result',
        requestId: command.requestId,
        result:
          runnerKind === 'older' &&
          command.type === 'file.diff' &&
          command.defaultBranch !== baseBranch
            ? {
                ok: false,
                error: {
                  code: 'file_unavailable',
                  message: 'The requested base does not exist locally.',
                },
              }
            : {
                ok: true,
                diff: {
                  path: 'note.txt',
                  baseBranch,
                  oldContent,
                  newContent,
                  patch,
                  binary: false,
                },
              },
      })
      const response = await pending
      expect.soft(command).toEqual({
        type: 'file.diff',
        requestId: 'request-1',
        path: 'note.txt',
        defaultBranch: baseBranch,
      })
      expect.soft(response.status).toBe(200)
      expect.soft(await response.json()).toEqual({
        path: 'note.txt',
        baseBranch,
        oldContent,
        newContent,
        patch,
        binary: false,
      })
    }
  },
)
