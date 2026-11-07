import { vi } from 'vitest'

import {
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../../test-support/harness'
import { createFilesHandler } from '../handlers'
import { WorkspaceFiles } from '../workspace'
import type { FilesStorageHarness } from './storage'

let storageSequence = 0

export async function setupFilesHttp(
  harness: TestHarness,
  runtime: FilesStorageHarness,
  maxFileBytes = 1024,
) {
  const session = await harness.login()
  const org = await harness.createOrg(session)
  const userId = await harness.env.DB.prepare(
    'SELECT creator_user_id FROM orgs WHERE id = ?',
  )
    .bind(org.id)
    .first<string>('creator_user_id')
  const workspaceId = 'workspace-1'
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      `INSERT INTO repositories
      (id, org_id, github_repository_id, full_name, default_branch) VALUES (?, ?, ?, ?, ?)`,
    ).bind('repository-1', org.id, 1, 'acme/storefront', 'trunk'),
    harness.env.DB.prepare(
      `INSERT INTO workspaces
      (id, org_id, repository_id, owner_user_id, name, branch, sandbox_id, state, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      workspaceId,
      org.id,
      'repository-1',
      userId,
      'Example',
      'octocat/example',
      'bx_one',
      'stopped',
      TEST_TIME,
      TEST_TIME,
    ),
  ])
  let requestSequence = 0
  const files = new WorkspaceFiles(
    runtime.storage(`http-${++storageSequence}`),
    () => `request-${++requestSequence}`,
  )
  const workspaceFiles = vi.fn(() => files)
  const handler = createFilesHandler({
    maxFileBytes,
    workspaceFiles,
    repositoryRoot: () => '/home/user/repos/storefront',
    fetch: harness.boat.fetch,
    now: () => TEST_TIME,
  })
  const request = (path: string, init: RequestInit = {}) => {
    const headers = new Headers({ Cookie: session, ...init.headers })
    return handler(
      new Request(`${TEST_ORIGIN}${path}`, { ...init, headers }),
      harness.env,
    )
  }
  return {
    session,
    org,
    workspaceId,
    files,
    handler,
    request,
    workspaceFiles,
  }
}
