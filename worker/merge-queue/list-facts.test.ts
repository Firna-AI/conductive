import { beforeAll, expect, it } from 'vitest'
import { workspacesPath } from '../../src/shared/workspaces'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { recordedPullRequest } from '../github/recorded-webhooks'
import { orgEnvironmentContext } from '../lifecycle/settings-data'
import { recordRunningEnvironment } from '../lifecycle/start-environment'
import { encrypt } from '../security/crypto'
import { heldOperation } from '../test-support/held-operation'
import { mergeFixture, TRUNK_HEAD } from './merge.test-support'
import {
  FOREIGN,
  MEMBER_TOKEN,
  PARALLEL,
  queueBundle,
  queueFixture,
  queueWebhook,
} from './queue.test-support'
import { listReader } from './list-facts.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('serves stored facts and refreshes one batched pull read per repository', async () => {
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
    const list = listReader(f)
    const cold = await list.read()
    expect(cold.body.repositories?.[0]).not.toHaveProperty(
      'githubQueueRequired',
    )
    expect(
      cold.body.workspaces.find(({ id }) => id === OUTER_WORKSPACE),
    ).not.toHaveProperty('githubCanWrite')
    await cold.refresh
    const { body, refresh } = await list.read()
    await refresh
    expect(body).toMatchObject({
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
    expect(
      operations.filter((operation) => operation === 'MergeCapabilities'),
    ).toHaveLength(1)

    f.api.merges.memberPermissions.set(MEMBER_TOKEN, 'READ')
    const member = await list.read(f.cookies.memberCookie)
    expect(
      member.body.workspaces.find(({ id }) => id === OUTER_WORKSPACE),
    ).not.toHaveProperty('githubCanWrite')
    await member.refresh
    const denied = await list.read(f.cookies.memberCookie)
    const deniedRow = denied.body.workspaces.find(
      ({ id }) => id === OUTER_WORKSPACE,
    )
    expect(deniedRow).toHaveProperty('githubCanWrite', false)
    expect(deniedRow).not.toHaveProperty('githubPullBase')
    await denied.refresh
    expect(
      operations.filter((operation) => operation === 'ListQueuePulls'),
    ).toHaveLength(1)
  } finally {
    await f.dispose()
  }
})

it('shares an in-flight list refresh and ages facts after a queue write and a pull event', async () => {
  const f = await mergeFixture(bundle, 'single')
  const held = heldOperation()
  let reads = 0
  let refreshing: Promise<unknown> | undefined
  try {
    const list = listReader(f, async (request) => {
      const readsPulls =
        new URL(request.url).pathname === '/graphql' &&
        (await request.clone().text()).includes('query ListQueuePulls')
      const response = await f.api.fetch(request)
      if (readsPulls && ++reads === 2) await held.wait()
      return response
    })
    await list.read().then(({ refresh }) => refresh)
    expect(reads).toBe(1)
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    list.advance(30_000)
    const stale = await list.read()
    refreshing = stale.refresh
    await held.entered
    expect(
      stale.body.workspaces.find(({ id }) => id === OUTER_WORKSPACE),
    ).toMatchObject({
      githubPullBase: 'main',
      mergeQueue: { place: 1 },
    })
    await list.read().then(({ refresh }) => refresh)
    expect(reads).toBe(2)

    f.api.pulls[2].baseRefName = 'release'
    const release = '5'.repeat(40)
    f.api.branches.set('refs/heads/release', release)
    expect(
      (
        await queueWebhook(f, 'pull_request', 'queue-facts-edit', {
          ...recordedPullRequest,
          action: 'edited',
          pull_request: {
            ...recordedPullRequest.pull_request,
            base: {
              ...recordedPullRequest.pull_request.base,
              ref: 'release',
              sha: release,
            },
          },
          changes: {
            base: { ref: { from: 'main' }, sha: { from: TRUNK_HEAD } },
          },
        })
      ).status,
    ).toBe(204)
    held.release()
    await refreshing
    list.advance(30_000)
    await list.read().then(({ refresh }) => refresh)
    expect(reads).toBe(3)
    expect(
      (await list.read()).body.workspaces.find(
        ({ id }) => id === OUTER_WORKSPACE,
      ),
    ).toHaveProperty('githubPullBase', 'release')
  } finally {
    held.release()
    await refreshing
    await f.dispose()
  }
})

it('builds the removal and refusal labels from the environment of each workspace start', async () => {
  const f = await queueFixture(bundle)
  try {
    const secret = 'workspace-secret'
    const branch = `changes-${secret}`
    await f.db
      .prepare('UPDATE workspaces SET branch = ? WHERE id = ?')
      .bind(branch, OUTER_WORKSPACE)
      .run()
    f.api.pulls[2].headRefName = branch
    f.api.branches.set(`refs/heads/${branch}`, f.api.pulls[2].headRefOid)
    f.api.pulls[3].baseRefName = branch
    const useEnvironment = async (value: string) =>
      recordRunningEnvironment(
        f.db,
        OTHER_WORKSPACE,
        await encrypt(
          JSON.stringify({ KEY: value }),
          orgEnvironmentContext(OUTER_ORG),
          f.env.BOAT_KEY_ENCRYPTION_KEY,
        ),
      )
    await useEnvironment(secret)
    expect((await f.change('POST', OTHER_WORKSPACE)).status).toBe(204)
    const list = listReader(f)
    await list.read().then(({ refresh }) => refresh)
    const readPair = async () => {
      const { body } = await list.read()
      return [OUTER_WORKSPACE, OTHER_WORKSPACE].map((workspaceId) =>
        body.workspaces.find(({ id }) => id === workspaceId),
      )
    }
    expect(await readPair()).toMatchObject([
      {
        mergeQueue: {
          removal: {
            base: { text: 'main' },
            above: [{ workspaceId: OTHER_WORKSPACE, pullNumber: 3 }],
          },
        },
      },
      {
        githubPullBase: branch,
        mergeQueueLabels: { pullBase: { text: 'changes-[redacted]' } },
        mergeQueue: {
          removal: { base: { text: 'changes-[redacted]' }, above: [] },
        },
      },
    ])
    const calls = f.api.requests.length
    await useEnvironment('changes')
    expect((await readPair())[1]).toMatchObject({
      githubPullBase: branch,
      mergeQueue: {
        removal: { base: { text: '[redacted]-workspace-secret' } },
      },
    })
    expect(f.api.requests).toHaveLength(calls)
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
