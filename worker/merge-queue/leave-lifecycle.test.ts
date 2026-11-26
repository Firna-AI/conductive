import { beforeAll, expect, it } from 'vitest'

import { orgSuspensionPath } from '../../src/shared/operator'
import { leaveOrgPath } from '../../src/shared/orgs'
import { workspacePaths } from '../../src/shared/workspaces'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { requireFeatureResult } from '../features/result'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import { recordedPullRequest } from '../github/recorded-webhooks'
import { mergeFixture } from './merge.test-support'
import {
  MEMBER_TOKEN,
  OWNER_TOKEN,
  queueBundle,
  queueWebhook,
} from './queue.test-support'

type Fixture = Awaited<ReturnType<typeof mergeFixture>>

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

const wake = async (f: Fixture) => {
  requireFeatureResult(await f.queue.wakeMergeQueue(f.scope))
  await f.queue.advanceStartAlarm()
}

it.each<{
  cause: string
  act(f: Fixture): Promise<void>
  token: string
  storedBase: string | null
  remaining: number[]
}>([
  {
    cause: 'Archive',
    act: async (f) => {
      const response = await f.request(
        workspacePaths.archive(OUTER_ORG, f.top),
        {
          method: 'POST',
          body: '{}',
        },
      )
      expect(response.status).toBe(200)
    },
    token: MEMBER_TOKEN,
    storedBase: null,
    remaining: [2],
  },
  {
    cause: 'a saved branch change',
    act: async (f) => {
      await f.db
        .prepare(
          "UPDATE workspaces SET branch = 'fresh', base_branch = 'parent' WHERE id = ?",
        )
        .bind(f.top)
        .run()
      await wake(f)
    },
    token: MEMBER_TOKEN,
    storedBase: 'parent',
    remaining: [2],
  },
  {
    cause: 'a saved repository change',
    act: async (f) => {
      await f.db.batch([
        f.db
          .prepare(
            "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id) VALUES ('new-repo', ?, 88, 'example/billing', 'trunk', 1)",
          )
          .bind(OUTER_ORG),
        f.db
          .prepare(
            "UPDATE workspaces SET repository_id = 'new-repo', branch = 'fresh', base_branch = 'release' WHERE id = ?",
          )
          .bind(f.top),
      ])
      await wake(f)
    },
    token: MEMBER_TOKEN,
    storedBase: 'release',
    remaining: [2],
  },
  {
    cause: 'the queuer leaving the org',
    act: async (f) => {
      const response = await f.request(leaveOrgPath(OUTER_ORG), {
        method: 'POST',
        headers: { Cookie: f.cookies.memberCookie },
        body: '{}',
      })
      expect(response.status).toBe(204)
      await f.queue.advanceStartAlarm()
    },
    token: OWNER_TOKEN,
    storedBase: null,
    remaining: [2],
  },
  {
    cause: 'the queuer losing GitHub write access',
    act: async (f) => {
      f.api.merges.memberPermissions.set(MEMBER_TOKEN, 'READ')
      await wake(f)
    },
    token: OWNER_TOKEN,
    storedBase: null,
    remaining: [2],
  },
  {
    cause: 'org suspension',
    act: async (f) => {
      const response = await f.request(orgSuspensionPath(OUTER_ORG), {
        method: 'POST',
        headers: { Cookie: f.cookies.outsiderCookie },
        body: '{}',
      })
      expect(response.status).toBe(200)
    },
    token: OWNER_TOKEN,
    storedBase: null,
    remaining: [],
  },
])(
  'resets the leaving pull request after $cause',
  async ({ act, token, storedBase, remaining }) => {
    const f = await mergeFixture(bundle, 'units')
    try {
      f.api.checks.set(HEAD_SHA, [{ ...passedRun, conclusion: 'FAILURE' }])
      await f.queue.advanceStartAlarm()
      await act(f)
      expect((await f.entries()).map(({ pullNumber }) => pullNumber)).toEqual(
        remaining,
      )
      expect(f.api.pulls[f.pullNumber].baseRefName).toBe('main')
      expect(
        await f.db
          .prepare('SELECT base_branch FROM workspaces WHERE id = ?')
          .bind(f.top)
          .first('base_branch'),
      ).toBe(storedBase)
      const patches = f.api.requests.filter(({ method }) => method === 'PATCH')
      expect(
        patches.map(({ headers }) => headers.get('Authorization')),
      ).toEqual([`Bearer ${token}`])
      expect(await patches[0].clone().json()).toEqual({ base: 'main' })
    } finally {
      await f.dispose()
    }
  },
)

it('records a signed external merge and leaves the surviving member layer in place', async () => {
  const f = await mergeFixture(bundle)
  try {
    const mergedAt = '2026-11-09T22:00:00Z'
    f.api.pulls[2].state = 'MERGED'
    f.api.pulls[2].mergedAt = mergedAt
    const response = await queueWebhook(f, 'pull_request', 'merged-outside', {
      ...recordedPullRequest,
      action: 'closed',
      pull_request: {
        ...recordedPullRequest.pull_request,
        merged: true,
        merged_at: mergedAt,
      },
    })
    expect(response.status).toBe(204)
    await f.queue.advanceStartAlarm()
    expect(await f.entries()).toMatchObject([
      { pullNumber: 3, place: 1, syncFrom: f.api.pulls[3].headRefOid },
    ])
    expect(await f.records()).toEqual([
      { number: 2, workspaceId: OUTER_WORKSPACE },
    ])
    expect(f.api.requests.filter(({ method }) => method === 'PATCH')).toEqual(
      [],
    )
  } finally {
    await f.dispose()
  }
})
