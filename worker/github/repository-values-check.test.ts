import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { recordedPush } from './recorded-webhooks'
import type { RepositoryChange } from './repository-change'
import { createGitHubHarness, type GitHubTestHarness } from './test-harness'

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
      return { fullName: 'Codertocat/Greetings', defaultBranch: 'trunk' }
    },
    changed: async (change) => {
      changed.push(change)
    },
  }
})
afterAll(async () => {
  await harness.base.dispose()
})

function push(repository: Record<string, unknown>) {
  return {
    ...recordedPush,
    repository: { ...recordedPush.repository, ...repository },
  }
}

async function saved(): Promise<string[]> {
  const { results } = await harness.env.DB.prepare(
    'SELECT full_name AS fullName, default_branch AS branch FROM repositories',
  ).all<{ fullName: string; branch: string }>()
  return results.map((row) => `${row.fullName}@${row.branch}`)
}

const repository = { repositoryId: 186853002, installationId: 1 }

it('catches up from a push that names other repository values than the saved ones', async () => {
  const { workspace } = await harness.seed()
  // GitHub already holds the new values, and the workspace read uses them.
  harness.api.fullName = 'Codertocat/Greetings'
  harness.api.defaultBranch = 'trunk'
  const response = await harness.webhook(
    'push',
    push({ full_name: 'Codertocat/Greetings', default_branch: 'trunk' }),
  )
  expect(response.status).toBe(204)
  expect(await saved()).toEqual(['Codertocat/Greetings@trunk'])
  expect(changed).toEqual([repository])
  expect(
    harness.memory(workspace.id).events.map((envelope) => envelope.event.type),
  ).toEqual(['github.updated'])
})

it('reads no GitHub data while a push names the saved values or none', async () => {
  await harness.seed()
  const same = push({ default_branch: 'main' })
  expect((await harness.webhook('push', same, 'same')).status).toBe(204)
  const malformed = push({ full_name: 'Greetings', default_branch: '' })
  expect((await harness.webhook('push', malformed, 'bad')).status).toBe(204)
  expect(reads).toEqual([])
  expect(await saved()).toEqual(['Codertocat/Hello-World@main'])
})

it('completes the push and warns when the GitHub read fails', async () => {
  const { workspace } = await harness.seed()
  if (harness.repositoryChange)
    harness.repositoryChange.read = async () => {
      throw new Error('GitHub is not available')
    }
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  try {
    const response = await harness.webhook(
      'push',
      push({ full_name: 'Codertocat/Greetings' }),
    )
    expect(response.status).toBe(204)
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'repository_values_check_failed' }),
    )
  } finally {
    warn.mockRestore()
  }
  expect(await saved()).toEqual(['Codertocat/Hello-World@main'])
  expect(changed).toEqual([])
  expect(
    harness.memory(workspace.id).events.map((envelope) => envelope.event.type),
  ).toEqual(['github.updated'])
})
