import type { RunnerFileEvent } from '../../../src/shared/generated/RunnerFileEvent'
import {
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../../test-support/harness'
import { createFilesHandler } from '../handlers'
import { WorkspaceFiles } from '../workspace'
import { setupFilesHttp } from './http'
import { standaloneFileLists } from './list-reads'
import { connectWorkspaceFiles } from './runner'
import type { FilesStorageHarness } from './storage'

export async function setupRenamedDefaultFiles(
  h: TestHarness,
  storage: FilesStorageHarness,
  runnerKind: 'current' | 'older',
) {
  const { org, session, workspaceId, files, evict } = await setupFilesHttp(
    h,
    storage,
  )
  const continuedId = 'workspace-2'
  await h.env.DB.batch([
    h.env.DB.prepare(
      `UPDATE repositories SET default_branch = 'main'
      WHERE id = (SELECT repository_id FROM workspaces WHERE id = ?)`,
    ).bind(workspaceId),
    h.env.DB.prepare(
      `INSERT INTO workspaces
      (id, org_id, repository_id, owner_user_id, name, branch, sandbox_id,
        state, created_at, updated_at)
      SELECT ?, org_id, repository_id, owner_user_id, 'Continued',
        'octocat/continued', 'bx_two', state, created_at, updated_at
      FROM workspaces WHERE id = ?`,
    ).bind(continuedId, workspaceId),
  ])
  const continuedFiles = new WorkspaceFiles(
    storage.storage(`continued-${runnerKind}`),
    () => 'request-1',
  )
  const retained = await connectWorkspaceFiles(files, workspaceId)
  const continued = await connectWorkspaceFiles(continuedFiles, continuedId)
  const initialReport = {
    type: 'changes.updated',
    changes: {
      baseBranch: 'main',
      revision: 1,
      partNumber: 1,
      partCount: 1,
      ...(runnerKind === 'current'
        ? { unpushedCommits: 1, uncommittedFileCount: 1 }
        : {}),
      files: [
        {
          path: 'note.txt',
          change: 'modified',
          added: 1,
          removed: 1,
          uncommitted: true,
        },
      ],
      summary: { files: 1, added: 1, removed: 1 },
    },
  } satisfies RunnerFileEvent
  retained.runner.emit(initialReport)
  continued.runner.emit(initialReport)
  await Promise.all([retained.flush(), continued.flush()])
  await h.env.DB.batch([
    h.env.DB.prepare(
      `UPDATE repositories SET default_branch = 'trunk'
      WHERE id = (SELECT repository_id FROM workspaces WHERE id = ?)`,
    ).bind(continuedId),
    h.env.DB.prepare(
      "UPDATE workspaces SET base_branch = 'trunk' WHERE id = ?",
    ).bind(continuedId),
  ])
  continued.runner.emit({
    ...initialReport,
    changes: {
      ...initialReport.changes,
      baseBranch: 'trunk',
      revision: 2,
    },
  })
  await continued.flush()
  await evict()
  const workspaceFiles = (id: string) =>
    id === workspaceId ? files : continuedFiles
  const handler = createFilesHandler({
    maxFileBytes: 1024,
    fileLists: standaloneFileLists(workspaceFiles),
    workspaceFiles: (workspace) => workspaceFiles(workspace.id),
    repositoryRoot: () => '/home/user/repos/storefront',
    fetch: h.boat.fetch,
    now: () => TEST_TIME,
  })
  const request = (path: string) =>
    handler(
      new Request(`${TEST_ORIGIN}${path}`, {
        headers: { Cookie: session },
      }),
      h.env,
    )
  return { org, workspaceId, continuedId, retained, continued, request }
}
