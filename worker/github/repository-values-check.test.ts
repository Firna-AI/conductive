import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { recordedPullRequest, recordedPush } from './recorded-webhooks'
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

async function addUntrustedInstallation() {
  await harness.env.DB.prepare(
    "INSERT INTO github_installations (id, account_login, account_type, created_at) VALUES (2, 'Outside', 'Organization', 0)",
  ).run()
}

async function setInstallationSuspended(suspendedAt: number | null) {
  await harness.env.DB.prepare(
    'UPDATE github_installations SET suspended_at = ? WHERE id = 1',
  )
    .bind(suspendedAt)
    .run()
}

async function deleteOrg(orgId: string) {
  await harness.env.DB.prepare('UPDATE orgs SET deleted_at = 1 WHERE id = ?')
    .bind(orgId)
    .run()
}

const repository = { repositoryId: 186853002, installationId: 1 }
const changedRepository = {
  ...recordedPush.repository,
  full_name: 'Codertocat/Greetings',
  default_branch: 'trunk',
}
const tagPush = {
  ...recordedPush,
  repository: changedRepository,
  ref: 'refs/tags/release',
}
const forkPullRequest = {
  ...recordedPullRequest,
  repository: changedRepository,
  pull_request: {
    ...recordedPullRequest.pull_request,
    head: {
      ...recordedPullRequest.pull_request.head,
      repo: { id: 999, full_name: 'outside/Fork', default_branch: 'fork-main' },
    },
    base: {
      ...recordedPullRequest.pull_request.base,
      repo: changedRepository,
    },
  },
}

it.each([
  { kind: 'a tag push', event: 'push', value: tagPush },
  {
    kind: 'a fork pull request',
    event: 'pull_request',
    value: forkPullRequest,
  },
])(
  'repairs saved values from $kind without branch work',
  async ({ event, value }) => {
    await harness.seed()
    const pushed = vi.fn(async () => undefined)
    harness.pushed = pushed
    const response = await harness.webhook(event, value)
    expect(response.status).toBe(204)
    expect(await saved()).toEqual(['Codertocat/Greetings@trunk'])
    expect(reads).toEqual([repository, repository])
    expect(changed).toEqual([repository])
    expect(harness.actors.size).toBe(0)
    expect(harness.tokens).toEqual([])
    expect(pushed).not.toHaveBeenCalled()
  },
)

it('keeps saved values unchanged when a tag event lacks active repository access', async () => {
  const { orgId } = await harness.seed()
  await addUntrustedInstallation()
  const foreign = [
    {
      ...tagPush,
      repository: { ...changedRepository, id: 999 },
    },
    { ...tagPush, installation: { id: 2 } },
  ]
  for (const [index, value] of foreign.entries())
    expect(
      (await harness.webhook('push', value, `foreign-${index}`)).status,
    ).toBe(204)
  await setInstallationSuspended(1)
  expect((await harness.webhook('push', tagPush, 'suspended')).status).toBe(204)
  await setInstallationSuspended(null)
  await deleteOrg(orgId)
  expect((await harness.webhook('push', tagPush, 'deleted-org')).status).toBe(
    204,
  )
  expect(await saved()).toEqual(['Codertocat/Hello-World@main'])
  expect(reads).toEqual([])
  expect(changed).toEqual([])
  expect(harness.actors.size).toBe(0)
  expect(harness.tokens).toEqual([])
})

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
    (await harness.inspect(workspace.id)).events.map(
      (envelope) => envelope.event.type,
    ),
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
    (await harness.inspect(workspace.id)).events.map(
      (envelope) => envelope.event.type,
    ),
  ).toEqual(['github.updated'])
})
