import { beforeAll, expect, it } from 'vitest'
import { workspacesPath } from '../../src/shared/workspaces'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  FOREIGN,
  PARALLEL,
  queueBundle,
  queueFixture,
} from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('lists a fork, the saved default branch, and the GitHub queue rule with one batched pull read', async () => {
  const f = await queueFixture(bundle)
  try {
    f.api.pulls[4].headRepository.databaseId = 9
    f.api.defaultBranch = 'trunk'
    f.api.branches.set('refs/heads/trunk', 'trunk-head')
    f.api.pulls[2].baseRefName = 'trunk'
    f.api.branchRules.set('trunk', [{ type: 'merge_queue' }])
    await f.db
      .prepare(
        'UPDATE repositories SET default_branch = ?, selected = 1 WHERE id = ?',
      )
      .bind('trunk', OUTER_REPOSITORY)
      .run()
    const operations: string[] = []
    f.api.onRequest = async (operation) => {
      operations.push(operation)
    }
    const response = await f.request(workspacesPath(OUTER_ORG))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      repositories: [
        {
          id: OUTER_REPOSITORY,
          defaultBranch: 'trunk',
          fullName: f.api.fullName,
          selected: true,
          githubQueueRequired: true,
          queueInUse: false,
        },
      ],
      workspaces: expect.arrayContaining([
        expect.objectContaining({ id: PARALLEL, githubPullFromFork: true }),
        expect.objectContaining({
          id: OUTER_WORKSPACE,
          githubCanWrite: true,
          githubPullBase: 'trunk',
        }),
        expect.objectContaining({
          id: OTHER_WORKSPACE,
          githubCanWrite: true,
          githubPullBase: 'changes',
        }),
      ]),
    })
    expect(
      operations
        .filter((operation) =>
          ['ListQueuePulls', 'BranchRules'].includes(operation),
        )
        .sort(),
    ).toEqual(['BranchRules', 'ListQueuePulls'])
  } finally {
    await f.dispose()
  }
})

it('names a repository in use without exposing the other org or its entries', async () => {
  const f = await queueFixture(bundle)
  try {
    expect((await f.change('POST', OUTER_WORKSPACE)).status).toBe(204)
    const response = await f.request(workspacesPath('other-org'), {
      headers: { Cookie: f.cookies.outsiderCookie },
    })
    expect(response.status).toBe(200)
    const body: unknown = await response.json()
    expect(body).toMatchObject({
      repositories: [{ id: 'foreign-repo', queueInUse: true }],
      workspaces: [{ id: FOREIGN }],
    })
    expect(JSON.stringify(body)).not.toContain(OUTER_ORG)
  } finally {
    await f.dispose()
  }
})
