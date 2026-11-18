import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createGitHubHarness, type GitHubTestHarness } from './test-harness'

let harness: GitHubTestHarness
let changed: [number, number][]
beforeAll(async () => {
  harness = await createGitHubHarness()
})
beforeEach(async () => {
  await harness.reset()
  changed = []
  harness.repositoryChanged = async (repositoryId, installationId) => {
    changed.push([repositoryId, installationId])
  }
})
afterAll(async () => {
  await harness.base.dispose()
})

function renamed(fullName: unknown, installationId = 1) {
  return {
    action: 'renamed',
    changes: { repository: { name: { from: 'Hello-World' } } },
    repository: { id: 186853002, name: 'Greetings', full_name: fullName },
    installation: { id: installationId },
  }
}

function newDefaultBranch(defaultBranch: unknown) {
  return {
    action: 'edited',
    changes: { default_branch: { from: 'main' } },
    repository: {
      id: 186853002,
      full_name: 'Codertocat/Hello-World',
      default_branch: defaultBranch,
    },
    installation: { id: 1 },
  }
}

async function saved(): Promise<string[]> {
  const { results } = await harness.env.DB.prepare(
    'SELECT full_name AS fullName, default_branch AS branch FROM repositories ORDER BY org_id',
  ).all<{ fullName: string; branch: string }>()
  return results.map((row) => `${row.fullName}@${row.branch}`)
}

it('saves a new name and a new default branch in each org of the installation', async () => {
  const first = await harness.seed()
  await harness.seed('changes', 'workspace-2')
  const rename = await harness.webhook(
    'repository',
    renamed('Codertocat/Greetings'),
    'rename',
  )
  expect(rename.status).toBe(204)
  const branch = await harness.webhook(
    'repository',
    newDefaultBranch('trunk'),
    'branch',
  )
  expect(branch.status).toBe(204)
  expect(await saved()).toEqual([
    'Codertocat/Greetings@trunk',
    'Codertocat/Greetings@trunk',
  ])
  expect(changed).toEqual([
    [186853002, 1],
    [186853002, 1],
  ])
  expect(harness.memory(first.workspace.id).events).toEqual([])
})

it('ignores another installation, another edit, and a repeated delivery', async () => {
  await harness.seed()
  const foreign = await harness.webhook(
    'repository',
    renamed('Codertocat/Foreign', 2),
    'foreign',
  )
  expect(foreign.status).toBe(204)
  const description = await harness.webhook(
    'repository',
    { ...renamed('Codertocat/Edited'), action: 'edited' },
    'description',
  )
  expect(description.status).toBe(204)
  expect(await saved()).toEqual(['Codertocat/Hello-World@main'])
  await harness.webhook('repository', renamed('Codertocat/Greetings'), 'once')
  await harness.env.DB.prepare(
    "UPDATE repositories SET full_name = 'Codertocat/Hello-World'",
  ).run()
  await harness.webhook('repository', renamed('Codertocat/Greetings'), 'once')
  expect(await saved()).toEqual(['Codertocat/Hello-World@main'])
  expect(changed).toEqual([
    [186853002, 2],
    [186853002, 1],
  ])
})

it('keeps a delivery retryable when the build start fails', async () => {
  await harness.seed()
  harness.repositoryChanged = async () => {
    throw new Error('Build start failed')
  }
  const failed = await harness.webhook(
    'repository',
    renamed('Codertocat/Greetings'),
    'retry',
  )
  expect(failed.status).toBe(500)
  harness.repositoryChanged = async (repositoryId, installationId) => {
    changed.push([repositoryId, installationId])
  }
  const retried = await harness.webhook(
    'repository',
    renamed('Codertocat/Greetings'),
    'retry',
  )
  expect(retried.status).toBe(204)
  expect(changed).toEqual([[186853002, 1]])
})

it('refuses a change without a valid name or branch', async () => {
  await harness.seed()
  const payloads = [
    renamed(undefined),
    renamed('Greetings'),
    renamed('a/b/c'),
    renamed('Codertocat/'),
    newDefaultBranch(''),
    newDefaultBranch('two words'),
  ]
  for (const [index, payload] of payloads.entries()) {
    const response = await harness.webhook(
      'repository',
      payload,
      `invalid-${index}`,
    )
    expect(response.status, JSON.stringify(payload.repository)).toBe(400)
  }
  expect(await saved()).toEqual(['Codertocat/Hello-World@main'])
  expect(changed).toEqual([])
})
