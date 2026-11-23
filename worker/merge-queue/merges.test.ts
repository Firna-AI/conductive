import { beforeAll, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { requireFeatureResult } from '../features/result'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import { saveGitHubTokens } from '../security/github-tokens'
import { mergeFixture, TOP_HEAD, TRUNK_HEAD } from './merge.test-support'
import { MEMBER_TOKEN, OWNER_TOKEN, queueBundle } from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('merges the highest ready layer as its queuer and records each landed pull request', async () => {
  const f = await mergeFixture(bundle)
  try {
    await f.queue.advanceStartAlarm()
    expect(f.writes().map(({ url }) => new URL(url).pathname)).toEqual([
      '/repos/Codertocat/Hello-World/pulls/3/merge-async',
    ])
    const [request] = f.writes()
    expect(request.headers.get('Authorization')).toBe(`Bearer ${MEMBER_TOKEN}`)
    expect(await request.clone().json()).toEqual({
      sha: TOP_HEAD,
      merge_method: 'rebase',
      merge_action: 'direct_merge',
      bypass_rules: false,
    })
    expect((await f.entries()).map(({ state }) => state)).toEqual([
      'merging',
      'merging',
    ])
    for (const job of f.api.merges.jobs.values()) job.state = 'merged'
    await f.queue.advanceStartAlarm()
    expect(await f.records()).toEqual([
      { number: 2, workspaceId: OUTER_WORKSPACE },
      { number: 3, workspaceId: OTHER_WORKSPACE },
    ])
    expect(await f.entries()).toEqual([])
  } finally {
    await f.dispose()
  }
})

it('keeps one fifteen-minute deadline when the next layer runs checks', async () => {
  const f = await mergeFixture(bundle)
  try {
    f.topChecksRunning()
    const now = await f.queue.testAlarmTime()
    await f.queue.advanceStartAlarm()
    const deadline = now + 15 * 60_000
    expect(await f.queue.readStartAlarm()).toBe(deadline)
    expect(f.writes()).toEqual([])
    requireFeatureResult(await f.queue.wakeMergeQueue(f.scope))
    await f.queue.advanceStartAlarm(deadline - 1)
    expect(f.writes()).toEqual([])
    expect(await f.queue.readStartAlarm()).toBe(deadline)
    await f.queue.advanceStartAlarm(deadline)
    expect(f.writes().map(({ url }) => new URL(url).pathname)).toEqual([
      '/repos/Codertocat/Hello-World/pulls/2/merge-async',
    ])
    expect(f.writes()[0].headers.get('Authorization')).toBe(
      `Bearer ${OWNER_TOKEN}`,
    )
  } finally {
    await f.dispose()
  }
})

it('accepts one of two concurrent clicks, skips the checks wait, and uses the clicker', async () => {
  const f = await mergeFixture(bundle)
  try {
    f.topChecksRunning()
    await f.queue.advanceStartAlarm()
    expect(f.writes()).toEqual([])
    expect(await (await f.bar(OUTER_WORKSPACE)).json()).toMatchObject({
      queue: { mergeAhead: 0 },
    })
    const replies = await Promise.all([
      f.click(OUTER_WORKSPACE, 0),
      f.click(OUTER_WORKSPACE, 0),
    ])
    expect(replies.map(({ status }) => status).sort()).toEqual([202, 409])
    const refused = replies.find(({ status }) => status === 409)
    expect(await refused?.json()).toHaveProperty(
      'error.code',
      'merge_queue_merging',
    )
    expect(f.writes()).toHaveLength(1)
    const [request] = f.writes()
    expect(request.headers.get('Authorization')).toBe(`Bearer ${MEMBER_TOKEN}`)
    expect(await request.clone().json()).toMatchObject({
      sha: HEAD_SHA,
      merge_method: 'rebase',
    })
  } finally {
    await f.dispose()
  }
})

it('refuses a missing stack, wrong count, lower check failure and direct merge bypass', async () => {
  const f = await mergeFixture(bundle)
  try {
    const invalid = await f.click(f.top, -1)
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toHaveProperty('error.code', 'invalid_input')
    const wrong = await f.click(f.top, 0)
    expect(wrong.status).toBe(409)
    expect(await wrong.json()).toHaveProperty(
      'error.code',
      'merge_queue_not_ready',
    )
    f.api.checks.set(HEAD_SHA, [{ ...passedRun, conclusion: 'FAILURE' }])
    const lower = await f.click(f.top, 1)
    expect(lower.status).toBe(409)
    expect(await lower.json()).toHaveProperty(
      'error.code',
      'merge_queue_not_ready',
    )
    const hint = await (await f.bar(f.top)).json()
    expect(hint).toMatchObject({
      queue: { wait: 'lower-layer', blockedByPullNumber: 2 },
    })
    expect(hint).not.toHaveProperty('queue.mergeAhead')
    const direct = await f.request(githubPaths.merge(OUTER_ORG, f.top), {
      method: 'POST',
      body: JSON.stringify({ headSha: TOP_HEAD, method: 'squash' }),
    })
    expect(direct.status).toBe(409)
    expect(await direct.json()).toHaveProperty(
      'error.code',
      'merge_queue_required',
    )
    await f.db.exec('UPDATE merge_queues SET github_stack_number = NULL')
    const unstacked = await f.click(f.top, 1)
    expect(unstacked.status).toBe(409)
    expect(await unstacked.json()).toHaveProperty(
      'error.code',
      'merge_queue_not_ready',
    )
    expect(f.writes()).toEqual([])
  } finally {
    await f.dispose()
  }
})

it('keeps a refused layer in the queue and merges the ready layer below it', async () => {
  const f = await mergeFixture(bundle)
  try {
    await f.queue.advanceStartAlarm()
    for (const job of f.api.merges.jobs.values()) job.state = 'failed'
    await f.queue.advanceStartAlarm()
    expect(f.writes().map(({ url }) => new URL(url).pathname)).toEqual([
      '/repos/Codertocat/Hello-World/pulls/3/merge-async',
      '/repos/Codertocat/Hello-World/pulls/2/merge-async',
    ])
    expect(await f.entries()).toMatchObject([
      { pullNumber: 2, state: 'merging' },
      { pullNumber: 3, place: 2, state: 'waiting', wait: 'merge-refused' },
    ])
  } finally {
    await f.dispose()
  }
})

it('records a partial merge and rechecks the rewritten layer for the next merge', async () => {
  const f = await mergeFixture(bundle)
  try {
    await f.queue.advanceStartAlarm()
    for (const job of f.api.merges.jobs.values()) job.state = 'failed'
    f.api.pulls[2].state = 'MERGED'
    f.api.pulls[2].mergedAt = '2026-11-09T22:00:00Z'
    f.api.pulls[3].baseRefName = 'main'
    const rewritten = '7'.repeat(40)
    f.api.pulls[3].headRefOid = rewritten
    f.api.branches.set('refs/heads/layer-two', rewritten)
    f.api.mergeBases.set(`${TRUNK_HEAD}...${rewritten}`, TRUNK_HEAD)
    f.api.mergeBases.set(`${HEAD_SHA}...${rewritten}`, TRUNK_HEAD)
    const earlier = f.api.requests.length
    await f.queue.advanceStartAlarm()
    const exactReads = await Promise.all(
      f.api.requests
        .slice(earlier)
        .filter((request) => new URL(request.url).pathname === '/graphql')
        .map(async (request) => await request.clone().json()),
    )
    expect(exactReads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variables: expect.objectContaining({ number: 2 }),
        }),
        expect.objectContaining({
          variables: expect.objectContaining({ number: 3 }),
        }),
      ]),
    )
    expect(await f.records()).toEqual([
      { number: 2, workspaceId: OUTER_WORKSPACE },
    ])
    expect(await f.entries()).toMatchObject([
      { place: 1, pullNumber: 3, refusedHead: TOP_HEAD, state: 'merging' },
    ])
    expect(f.writes()).toHaveLength(2)
    expect(await f.writes()[1].clone().json()).toMatchObject({ sha: rewritten })
  } finally {
    await f.dispose()
  }
})

it('tries the new head after GitHub refuses the earlier merge attempt', async () => {
  const f = await mergeFixture(bundle, 'single')
  try {
    await f.queue.advanceStartAlarm()
    const head = '6'.repeat(40)
    f.api.pulls[2].headRefOid = head
    f.api.branches.set('refs/heads/changes', head)
    f.api.mergeBases.set(`${TRUNK_HEAD}...${head}`, TRUNK_HEAD)
    for (const job of f.api.merges.jobs.values()) job.state = 'failed'
    await f.queue.advanceStartAlarm()
    expect(await f.entries()).toMatchObject([
      { pullNumber: 2, refusedHead: HEAD_SHA, state: 'merging' },
    ])
    expect(f.writes()).toHaveLength(2)
    expect(await f.writes()[1].clone().json()).toMatchObject({ sha: head })
  } finally {
    await f.dispose()
  }
})

it('leaves a token failure waiting and lets a different member merge its checked prefix', async () => {
  const f = await mergeFixture(bundle)
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
    await f.queue.advanceStartAlarm()
    expect((await f.entries()).map(({ wait }) => wait)).toEqual([
      'token',
      'lower-layer',
    ])
    expect(f.writes()).toEqual([])
    const click = await f.click(f.top, 1)
    expect(click.status).toBe(202)
    const [request] = f.writes()
    expect(request.headers.get('Authorization')).toBe(`Bearer ${MEMBER_TOKEN}`)
    expect(await request.clone().json()).toMatchObject({
      sha: TOP_HEAD,
      merge_method: 'rebase',
    })
  } finally {
    await f.dispose()
  }
})
