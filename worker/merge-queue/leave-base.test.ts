import { beforeAll, expect, it } from 'vitest'

import {
  OUTER_REPOSITORY,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { requireFeatureResult } from '../features/result'
import { recordedPullRequest } from '../github/recorded-webhooks'
import { saveGitHubTokens } from '../security/github-tokens'
import { mergeFixture } from './merge.test-support'
import {
  MEMBER_TOKEN,
  OWNER_TOKEN,
  queueBundle,
  queueWebhook,
} from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it.each([
  {
    scenario: 'queuer still writes',
    restrict: false,
    actor: 'owner',
    token: MEMBER_TOKEN,
  },
  {
    scenario: 'member who removed the entry writes',
    restrict: true,
    actor: 'owner',
    token: OWNER_TOKEN,
  },
  {
    scenario: 'owner writes for a departure with no member action',
    restrict: true,
    actor: undefined,
    token: OWNER_TOKEN,
  },
])('resets the base when the $scenario', async ({ restrict, actor, token }) => {
  const f = await mergeFixture(bundle, 'units')
  try {
    if (restrict) f.api.merges.memberPermissions.set(MEMBER_TOKEN, 'READ')
    if (actor) {
      expect((await f.change('DELETE', f.top)).status).toBe(204)
    } else {
      requireFeatureResult(
        await f.queue.wakeMergeQueue(f.scope, {
          cause: 'write-access-lost',
          workspaceId: f.top,
          branch: f.branch,
          pullNumber: f.pullNumber,
        }),
      )
    }
    const patches = f.api.requests.filter(
      (request) => request.method === 'PATCH',
    )
    expect(
      patches.map((request) => request.headers.get('Authorization')),
    ).toEqual([`Bearer ${token}`])
    expect(await patches[0].clone().json()).toEqual({ base: 'main' })
    expect(f.api.pulls[f.pullNumber].baseRefName).toBe('main')
    expect((await f.entries()).map(({ workspaceId }) => workspaceId)).toEqual([
      OUTER_WORKSPACE,
    ])
  } finally {
    await f.dispose()
  }
})

it('resets a leaving unit to the saved trunk when the default changes during a token outage', async () => {
  const f = await mergeFixture(bundle, 'units')
  try {
    await saveGitHubTokens(
      f.env,
      'owner',
      {
        accessToken: OWNER_TOKEN,
        expiresAt: 1,
        refreshToken: 'old-token',
        refreshExpiresAt: 2,
      },
      1,
    )
    f.api.defaultBranch = 'next'
    f.api.branches.set('refs/heads/next', 'next-head')
    await f.db
      .prepare('UPDATE repositories SET default_branch = ? WHERE id = ?')
      .bind('next', OUTER_REPOSITORY)
      .run()
    await f.queue.advanceStartAlarm()
    expect(await f.entries()).toEqual([])
    const patches = f.api.requests.filter(({ method }) => method === 'PATCH')
    expect(patches.map(({ headers }) => headers.get('Authorization'))).toEqual([
      `Bearer ${MEMBER_TOKEN}`,
    ])
    expect(await patches[0].clone().json()).toEqual({ base: 'main' })
  } finally {
    await f.dispose()
  }
})

it('preserves a member stack base and an explicit GitHub base change', async () => {
  const f = await mergeFixture(bundle)
  try {
    requireFeatureResult(
      await f.queue.wakeMergeQueue(f.scope, {
        cause: 'merged',
        workspaceId: OUTER_WORKSPACE,
        branch: 'changes',
        pullNumber: 2,
      }),
    )
    requireFeatureResult(
      await f.queue.wakeMergeQueue(f.scope, {
        cause: 'archived',
        workspaceId: f.top,
        branch: f.branch,
        pullNumber: f.pullNumber,
      }),
    )
    expect(f.api.pulls[f.pullNumber].baseRefName).toBe('changes')
    expect(
      f.api.requests.filter((request) => request.method === 'PATCH'),
    ).toEqual([])
    expect(await f.entries()).toEqual([])
  } finally {
    await f.dispose()
  }

  const changed = await mergeFixture(bundle, 'units')
  try {
    changed.api.pulls[changed.pullNumber].baseRefName = 'my-new-base'
    requireFeatureResult(
      await changed.queue.wakeMergeQueue(changed.scope, {
        cause: 'base-changed',
        workspaceId: changed.top,
        branch: changed.branch,
        pullNumber: changed.pullNumber,
      }),
    )
    expect(changed.api.pulls[changed.pullNumber].baseRefName).toBe(
      'my-new-base',
    )
    expect(
      changed.api.requests.filter((request) => request.method === 'PATCH'),
    ).toEqual([])
  } finally {
    await changed.dispose()
  }
})

it('shows the base that remains after GitHub refuses the reset', async () => {
  const f = await mergeFixture(bundle, 'units')
  try {
    f.api.refusedBaseWrites.add(f.pullNumber)
    expect((await f.change('DELETE', f.top)).status).toBe(204)
    const bar = await f.bar(f.top)
    expect(bar.status).toBe(200)
    const body: unknown = await bar.json()
    expect(body).toMatchObject({ queueLeave: { baseBranch: 'changes' } })
    expect(body).not.toHaveProperty('queue')
    expect(JSON.stringify(body)).not.toContain('The new base')
    expect(
      f.api.requests.filter(({ method }) => method === 'PATCH'),
    ).toHaveLength(1)
  } finally {
    await f.dispose()
  }
})

it.each([
  { action: 'converted_to_draft', patches: 1 },
  { action: 'closed', patches: 0 },
])('leaves on a signed $action webhook', async ({ action, patches }) => {
  const f = await mergeFixture(bundle, 'units')
  try {
    const pull = f.api.pulls[f.pullNumber]
    if (action === 'closed') pull.state = 'CLOSED'
    else pull.isDraft = true
    f.api.merges.memberPermissions.set(MEMBER_TOKEN, 'READ')
    const response = await queueWebhook(f, 'pull_request', 'queue-leave', {
      ...recordedPullRequest,
      action,
      number: f.pullNumber,
      sender: { id: 101, login: 'owner' },
      pull_request: {
        ...recordedPullRequest.pull_request,
        number: f.pullNumber,
        head: {
          ...recordedPullRequest.pull_request.head,
          ref: f.branch,
          sha: pull.headRefOid,
        },
      },
    })
    expect(response.status).toBe(204)
    await f.queue.advanceStartAlarm()
    expect((await f.entries()).map(({ pullNumber }) => pullNumber)).toEqual([2])
    expect(pull.baseRefName).toBe(action === 'closed' ? 'changes' : 'main')
    expect(
      f.api.requests
        .filter(({ method }) => method === 'PATCH')
        .map(({ headers }) => headers.get('Authorization')),
    ).toEqual(Array.from({ length: patches }, () => `Bearer ${OWNER_TOKEN}`))
  } finally {
    await f.dispose()
  }
})

it.each(['closed', 'converted_to_draft'])(
  'keeps the open and ready entry after a delayed %s delivery',
  async (action) => {
    const f = await mergeFixture(bundle, 'units')
    try {
      f.topChecksRunning()
      const response = await queueWebhook(f, 'pull_request', 'old-leave', {
        ...recordedPullRequest,
        action,
        number: f.pullNumber,
        pull_request: {
          ...recordedPullRequest.pull_request,
          number: f.pullNumber,
          head: { ...recordedPullRequest.pull_request.head, ref: f.branch },
        },
      })
      expect(response.status).toBe(204)
      await f.queue.advanceStartAlarm()
      expect((await f.entries()).map(({ pullNumber }) => pullNumber)).toEqual([
        2,
        f.pullNumber,
      ])
      expect(f.api.pulls[f.pullNumber].baseRefName).toBe('changes')
      expect(f.api.requests.filter(({ method }) => method === 'PATCH')).toEqual(
        [],
      )
    } finally {
      await f.dispose()
    }
  },
)
