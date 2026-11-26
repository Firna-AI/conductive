import { beforeAll, expect, it } from 'vitest'

import {
  OTHER_WORKSPACE,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import {
  createPullRequestStack,
  getPullRequestStack,
} from '../github/stack-client'
import { readQueue } from './data'
import { mergeFixture, PARALLEL_HEAD, TRUNK_HEAD } from './merge.test-support'
import {
  MEMBER_TOKEN,
  OWNER_TOKEN,
  PARALLEL,
  queueBundle,
} from './queue.test-support'
import { restackFixture } from './restack.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('merges the bottom of a stack made after Add and holds a separate unit until then', async () => {
  const f = await restackFixture(bundle)
  try {
    const stack = await createPullRequestStack(
      f.api.fetch,
      OWNER_TOKEN,
      f.api.fullName,
      [2, 3],
    )
    f.api.checks.set(HEAD_SHA, [passedRun])
    f.api.mergeBases.set(`${HEAD_SHA}...${PARALLEL_HEAD}`, TRUNK_HEAD)
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    const session = await f.session(PARALLEL)
    const before = f.steps().length
    await f.queue.advanceStartAlarm()
    expect(f.writes().map(({ url }) => new URL(url).pathname)).toEqual([
      '/repos/Codertocat/Hello-World/pulls/2/merge-async',
    ])
    expect(await (await f.bar(PARALLEL)).json()).toMatchObject({
      queue: { wait: 'lower-layer', blockedByPullNumber: 2 },
    })
    expect(await readQueue(f.db, f.scope)).toMatchObject({
      githubStackNumber: null,
    })
    expect(f.api.pulls[4].baseRefName).toBe('main')
    expect(await f.messages(PARALLEL, session)).toEqual([])

    const newTrunk = '5'.repeat(40)
    f.api.branches.set('refs/heads/main', newTrunk)
    f.api.mergeBases.set(`${newTrunk}...${PARALLEL_HEAD}`, TRUNK_HEAD)
    for (const job of f.api.merges.jobs.values()) job.state = 'merged'
    await f.queue.advanceStartAlarm()
    expect(await f.records()).toEqual([
      { number: 2, workspaceId: OUTER_WORKSPACE },
    ])
    expect(f.writes()).toHaveLength(1)
    const [restack] = await f.messages(PARALLEL, session)
    expect(restack?.text).toContain(
      `git rebase --onto ${newTrunk} ${TRUNK_HEAD}`,
    )

    const newHead = '6'.repeat(40)
    f.api.pulls[4].headRefOid = newHead
    f.api.branches.set('refs/heads/parallel', newHead)
    f.api.mergeBases.set(`${newTrunk}...${newHead}`, newTrunk)
    f.api.mergeBases.set(`${TRUNK_HEAD}...${newHead}`, TRUNK_HEAD)
    f.api.mergeBases.set(`${TRUNK_HEAD}...${newTrunk}`, TRUNK_HEAD)
    await f.endFix(PARALLEL, session)
    await f.queue.advanceStartAlarm()
    expect(f.writes().map(({ url }) => new URL(url).pathname)).toEqual([
      '/repos/Codertocat/Hello-World/pulls/2/merge-async',
      '/repos/Codertocat/Hello-World/pulls/4/merge-async',
    ])
    expect(f.steps().slice(before)).toEqual([])
    const remaining = await getPullRequestStack(
      f.api.fetch,
      OWNER_TOKEN,
      f.api.fullName,
      stack.number,
    )
    expect(
      remaining.layers.filter(({ state }) => state === 'open'),
    ).toMatchObject([{ number: 3, headBranch: 'layer-two' }])
  } finally {
    await f.dispose()
  }
})

it('adds through the middle of a member stack and merges only the queued prefix', async () => {
  const f = await mergeFixture(bundle, 'empty')
  try {
    f.api.pulls[4].baseRefName = 'layer-two'
    const stack = await createPullRequestStack(
      f.api.fetch,
      OWNER_TOKEN,
      f.api.fullName,
      [2, 3, 4],
    )
    expect((await f.change('POST', OTHER_WORKSPACE)).status).toBe(204)
    expect((await f.entries()).map(({ pullNumber }) => pullNumber)).toEqual([
      2, 3,
    ])
    f.topChecksRunning()
    await f.queue.advanceStartAlarm()
    expect(f.writes()).toEqual([])
    expect(await (await f.bar(OUTER_WORKSPACE)).json()).toMatchObject({
      queue: { mergeAhead: 0 },
    })
    f.api.checks.set(f.api.pulls[3].headRefOid, [passedRun])
    const response = await f.click(OTHER_WORKSPACE, 1)
    expect(response.status).toBe(202)
    expect(f.writes().map(({ url }) => new URL(url).pathname)).toEqual([
      '/repos/Codertocat/Hello-World/pulls/3/merge-async',
    ])
    expect(f.writes()[0].headers.get('Authorization')).toBe(
      `Bearer ${MEMBER_TOKEN}`,
    )
    for (const job of f.api.merges.jobs.values()) job.state = 'merged'
    await f.queue.advanceStartAlarm()
    await f.queue.advanceStartAlarm()
    expect(await f.records()).toEqual([
      { number: 2, workspaceId: OUTER_WORKSPACE },
      { number: 3, workspaceId: OTHER_WORKSPACE },
    ])
    const remaining = await getPullRequestStack(
      f.api.fetch,
      OWNER_TOKEN,
      f.api.fullName,
      stack.number,
    )
    expect(
      remaining.layers.filter(({ state }) => state === 'open'),
    ).toMatchObject([{ number: 4, headBranch: 'parallel' }])
  } finally {
    await f.dispose()
  }
})
