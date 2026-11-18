import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import type { RepositoryChange } from './repository-change'
import type { GitHubRepositoryValues } from './repository-read'
import { createGitHubHarness, type GitHubTestHarness } from './test-harness'

let harness: GitHubTestHarness
let github: GitHubRepositoryValues
let reads: RepositoryChange[]
let changed: RepositoryChange[]
beforeAll(async () => {
  harness = await createGitHubHarness()
})
beforeEach(async () => {
  await harness.reset()
  github = { fullName: 'Codertocat/Greetings', defaultBranch: 'trunk' }
  reads = []
  changed = []
  harness.repositoryChange = {
    read: async (change) => {
      reads.push(change)
      return github
    },
    changed: async (change) => {
      changed.push(change)
    },
  }
})
afterAll(async () => {
  await harness.base.dispose()
})

function renamed(installationId = 1) {
  return {
    action: 'renamed',
    changes: { repository: { name: { from: 'Hello-World' } } },
    repository: { id: 186853002, full_name: 'Codertocat/Intermediate' },
    installation: { id: installationId },
  }
}

const newDefaultBranch = {
  action: 'edited',
  changes: { default_branch: { from: 'main' } },
  repository: { id: 186853002, default_branch: 'old-payload-branch' },
  installation: { id: 1 },
}

const repository = { repositoryId: 186853002, installationId: 1 }

async function saved(): Promise<string[]> {
  const { results } = await harness.env.DB.prepare(
    'SELECT full_name AS fullName, default_branch AS branch FROM repositories ORDER BY org_id',
  ).all<{ fullName: string; branch: string }>()
  return results.map((row) => `${row.fullName}@${row.branch}`)
}

it('saves the current GitHub values, not the event values, in each org of the installation', async () => {
  const first = await harness.seed()
  await harness.seed('changes', 'workspace-2')
  expect(
    (await harness.webhook('repository', renamed(), 'rename')).status,
  ).toBe(204)
  expect(await saved()).toEqual([
    'Codertocat/Greetings@trunk',
    'Codertocat/Greetings@trunk',
  ])
  github = { fullName: 'Codertocat/Greetings', defaultBranch: 'release' }
  const branch = await harness.webhook('repository', newDefaultBranch, 'branch')
  expect(branch.status).toBe(204)
  expect(await saved()).toEqual([
    'Codertocat/Greetings@release',
    'Codertocat/Greetings@release',
  ])
  expect(changed).toEqual([repository, repository])
  expect(harness.memory(first.workspace.id).events).toEqual([])
})

it('keeps the newer value when an older delivery arrives again after a failed read', async () => {
  await harness.seed()
  const read = harness.repositoryChange?.read
  if (!harness.repositoryChange || !read) throw new Error('Missing reader')
  harness.repositoryChange.read = async () => {
    throw new Error('GitHub is not available')
  }
  expect((await harness.webhook('repository', renamed(), 'older')).status).toBe(
    500,
  )
  expect(await saved()).toEqual(['Codertocat/Hello-World@main'])
  harness.repositoryChange.read = read
  github = { fullName: 'Codertocat/Current', defaultBranch: 'main' }
  await harness.webhook('repository', renamed(), 'newer')
  expect((await harness.webhook('repository', renamed(), 'older')).status).toBe(
    204,
  )
  expect(await saved()).toEqual(['Codertocat/Current@main'])
  await harness.webhook('repository', renamed(), 'older')
  // Each saving delivery reads once, then once more to confirm the values.
  expect(reads).toHaveLength(4)
})

it('ignores another installation and another edit, and completes after a failed wake', async () => {
  await harness.seed()
  expect(
    (await harness.webhook('repository', renamed(2), 'foreign')).status,
  ).toBe(204)
  const description = await harness.webhook(
    'repository',
    { ...renamed(), action: 'edited', changes: { description: {} } },
    'description',
  )
  expect(description.status).toBe(204)
  expect(reads).toEqual([])
  expect(await saved()).toEqual(['Codertocat/Hello-World@main'])
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  if (harness.repositoryChange)
    harness.repositoryChange.changed = async () => {
      throw new Error('The coordinator is not available')
    }
  try {
    const woken = await harness.webhook('repository', renamed(), 'wake')
    expect(woken.status).toBe(204)
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'repository_change_wake_failed' }),
    )
  } finally {
    warn.mockRestore()
  }
  expect(await saved()).toEqual(['Codertocat/Greetings@trunk'])
})

it('refuses a change event without a repository or an installation ID', async () => {
  await harness.seed()
  const payloads = [
    { ...renamed(), repository: { full_name: 'Codertocat/Greetings' } },
    { ...renamed(), installation: { id: 0 } },
  ]
  for (const [index, payload] of payloads.entries()) {
    const response = await harness.webhook(
      'repository',
      payload,
      `invalid-${index}`,
    )
    expect(response.status, JSON.stringify(payload)).toBe(400)
  }
  expect(reads).toEqual([])
})

it('reads again when another save comes between its read and its save', async () => {
  await harness.seed()
  const answers: (() => Promise<GitHubRepositoryValues>)[] = [
    async () => {
      await harness.env.DB.prepare(
        "UPDATE repositories SET full_name = 'Codertocat/Newest'",
      ).run()
      return { fullName: 'Codertocat/Intermediate', defaultBranch: 'main' }
    },
    async () => ({ fullName: 'Codertocat/Newest', defaultBranch: 'main' }),
    async () => ({ fullName: 'Codertocat/Newest', defaultBranch: 'main' }),
  ]
  if (harness.repositoryChange)
    harness.repositoryChange.read = async () => {
      const answer = answers.shift()
      if (!answer) throw new Error('Unexpected read')
      return answer()
    }
  expect((await harness.webhook('repository', renamed())).status).toBe(204)
  expect(await saved()).toEqual(['Codertocat/Newest@main'])
  expect(answers).toEqual([])
})

it('ends with the GitHub value when the repository is renamed back during a read', async () => {
  await harness.seed()
  const answers: GitHubRepositoryValues[] = [
    { fullName: 'Codertocat/Renamed', defaultBranch: 'main' },
    { fullName: 'Codertocat/Hello-World', defaultBranch: 'main' },
    { fullName: 'Codertocat/Hello-World', defaultBranch: 'main' },
    { fullName: 'Codertocat/Hello-World', defaultBranch: 'main' },
  ]
  if (harness.repositoryChange)
    harness.repositoryChange.read = async () => {
      const answer = answers.shift()
      if (!answer) throw new Error('Unexpected read')
      return answer
    }
  expect((await harness.webhook('repository', renamed())).status).toBe(204)
  expect(await saved()).toEqual(['Codertocat/Hello-World@main'])
  expect(answers).toEqual([])
})
