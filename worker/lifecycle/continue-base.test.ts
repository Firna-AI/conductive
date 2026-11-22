import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import { HEAD_SHA } from '../github/fake-pull'
import { createHarness, type TestHarness } from '../test-support/harness'
import { object, text } from '../github/parsers'
import { continueFixture } from './continue.test-support'
import { CONTINUE_JOB_KEY, continueJobKey } from './continue-types'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it.each([
  { mergedBase: 'develop', exists: true, base: 'develop', stored: 'develop' },
  { mergedBase: 'deleted-stack', exists: false, base: 'main', stored: null },
  { mergedBase: 'main', exists: true, base: 'main', stored: null },
])(
  'continues from $base after a merge into $mergedBase with exists=$exists',
  async ({ mergedBase, exists, base, stored }) => {
    const f = await continueFixture(harness)
    await f.env.DB.prepare('UPDATE workspaces SET base_branch = ? WHERE id = ?')
      .bind('old-stored-base', WORKSPACE_ID)
      .run()
    f.api.pulls[2].baseRefName = mergedBase
    if (exists) f.api.branches.set(`refs/heads/${mergedBase}`, HEAD_SHA)
    const pending = await f.start()
    if (pending.state !== 'pending')
      throw new Error('Expected pending Continue.')
    const job = await f.advanceTo('fetch')
    expect(job).toMatchObject({ baseBranch: base, defaultBranch: 'main' })
    await f.finish()
    expect(await f.result(pending.continueId)).toMatchObject({
      state: 'continued',
    })
    expect(
      await f.env.DB.prepare(
        'SELECT base_branch AS base FROM workspaces WHERE id = ?',
      )
        .bind(WORKSPACE_ID)
        .first(),
    ).toEqual({ base: stored })
    expect(
      await f.env.DB.prepare(
        'SELECT default_branch AS name FROM repositories WHERE id = ?',
      )
        .bind('repo')
        .first(),
    ).toEqual({ name: 'main' })
    expect(f.refreshed).toMatchObject([
      { defaultBranch: 'main', baseBranch: stored },
    ])
    const branchReads = []
    for (const request of f.api.requests) {
      const body = object(await request.clone().json())
      if (text(body.query).includes('query RepositoryBranch'))
        branchReads.push({
          token: request.headers.get('Authorization'),
          ref: object(body.variables).ref,
        })
    }
    expect(branchReads).toEqual([
      {
        token: 'Bearer member-continue-token',
        ref: 'refs/heads/old-stored-base',
      },
      {
        token: 'Bearer member-continue-token',
        ref: `refs/heads/${mergedBase}`,
      },
    ])
  },
)

it('keeps its branch and runs no fetch when GitHub cannot answer the merged base check', async () => {
  const f = await continueFixture(harness)
  f.api.pulls[2].baseRefName = 'develop'
  f.api.onRequest = async (operation) => {
    if (operation === 'RepositoryBranch')
      throw new Error('GitHub did not answer.')
  }
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  await f.finish()
  await expect(f.result(pending.continueId)).rejects.toMatchObject({
    code: 'github_unavailable',
  })
  expect(
    await f.env.DB.prepare('SELECT branch FROM workspaces WHERE id = ?')
      .bind(WORKSPACE_ID)
      .first(),
  ).toEqual({ branch: 'octocat/test' })
  expect(f.boat.commands).toEqual([])
})

it('recovers a saved job without a separate default branch after its fetch', async () => {
  const f = await continueFixture(harness)
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  const job = await f.advanceTo('move')
  const { defaultBranch, ...old } = job
  expect(defaultBranch).toBe('main')
  await f.storage.put(CONTINUE_JOB_KEY, old)
  await f.storage.put(continueJobKey(job.id), old)
  f.reconstruct()
  await f.finish()
  expect(await f.result(pending.continueId)).toMatchObject({
    state: 'continued',
  })
  expect(f.refreshed).toMatchObject([
    { defaultBranch: 'main', baseBranch: null },
  ])
})
