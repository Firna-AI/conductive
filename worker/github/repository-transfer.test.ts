import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { recordedPush } from './recorded-webhooks'
import type { RepositoryChange } from './repository-change'
import { createGitHubHarness, type GitHubTestHarness } from './test-harness'

// The repository moves from the Codertocat install 1 to the Octo-Org install 2.
const moved = { fullName: 'Octo-Org/Hello-World', defaultBranch: 'main' }

let harness: GitHubTestHarness
let reads: RepositoryChange[]
let changed: RepositoryChange[]
beforeAll(async () => {
  harness = await createGitHubHarness()
})
beforeEach(async () => {
  await harness.reset()
  reads = []
  changed = []
  harness.repositoryChange = {
    read: async (change) => {
      reads.push(change)
      return moved
    },
    changed: async (change) => {
      changed.push(change)
    },
  }
})
afterAll(async () => {
  await harness.base.dispose()
})

const transferred = {
  action: 'transferred',
  changes: { owner: { from: { user: { login: 'Codertocat' } } } },
  repository: { id: 186853002, full_name: moved.fullName },
  installation: { id: 2 },
}

/** Gives the org another repository of install 2, so the org trusts it. */
async function useNewInstall(orgId: string) {
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      "INSERT OR IGNORE INTO github_installations (id, account_login, account_type, created_at) VALUES (2, 'Octo-Org', 'Organization', ?)",
    ).bind(TEST_TIME),
    harness.env.DB.prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id) VALUES (?, ?, 99, 'Octo-Org/Other', 'main', 2)",
    ).bind(`other-${orgId}`, orgId),
  ])
}

async function saved(): Promise<string[]> {
  const { results } = await harness.env.DB.prepare(
    `SELECT org_id AS orgId, full_name AS fullName, installation_id AS installationId
     FROM repositories WHERE github_repository_id = 186853002 ORDER BY org_id`,
  ).all<{ orgId: string; fullName: string; installationId: number }>()
  return results.map(
    (row) => `${row.orgId}:${row.fullName}#${row.installationId}`,
  )
}

it('follows a move only in an org that already uses the new install', async () => {
  const trusting = await harness.seed()
  const other = await harness.seed('changes', 'workspace-2')
  await useNewInstall(trusting.orgId)
  const response = await harness.webhook('repository', transferred, 'move')
  expect(response.status).toBe(204)
  const expected = [
    `${trusting.orgId}:Octo-Org/Hello-World#2`,
    `${other.orgId}:Codertocat/Hello-World#1`,
  ].sort()
  expect(await saved()).toEqual(expected)
  expect(reads[0]).toEqual({ repositoryId: 186853002, installationId: 2 })
  expect(changed).toEqual([{ repositoryId: 186853002, installationId: 2 }])
})

it('changes nothing when no org uses the new install', async () => {
  const { orgId } = await harness.seed()
  const response = await harness.webhook('repository', transferred, 'move')
  expect(response.status).toBe(204)
  expect(await saved()).toEqual([`${orgId}:Codertocat/Hello-World#1`])
  expect(reads).toEqual([])
  expect(changed).toEqual([])
})

it('repairs a missed move from a push of the new install and refreshes the workspace', async () => {
  const { orgId, workspace } = await harness.seed()
  await useNewInstall(orgId)
  harness.api.fullName = moved.fullName
  const push = {
    ...recordedPush,
    repository: { ...recordedPush.repository, full_name: moved.fullName },
    installation: { id: 2 },
  }
  expect((await harness.webhook('push', push, 'push')).status).toBe(204)
  expect(await saved()).toEqual([`${orgId}:Octo-Org/Hello-World#2`])
  expect(changed).toEqual([{ repositoryId: 186853002, installationId: 2 }])
  expect(
    harness.memory(workspace.id).events.map((envelope) => envelope.event.type),
  ).toEqual(['github.updated'])
})
