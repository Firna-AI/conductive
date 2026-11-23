import { beforeAll, expect, it } from 'vitest'

import {
  OTHER_WORKSPACE,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import type { RepositoryGitHub } from '../github/fake-repository'
import { readQueue } from './data'
import { PARALLEL_HEAD, TOP_HEAD, TRUNK_HEAD } from './merge.test-support'
import { OWNER_TOKEN, PARALLEL, queueBundle } from './queue.test-support'
import { restackFixture } from './restack.test-support'

const pending = {
  ...passedRun,
  status: 'IN_PROGRESS',
  conclusion: null,
  completedAt: null,
}
const failed = { ...passedRun, conclusion: 'FAILURE' }

const joinedParallel = '5'.repeat(40)
const reorderedParallel = '6'.repeat(40)
const reorderedChanges = '7'.repeat(40)
const reorderedTop = '8'.repeat(40)
const mergedTrunk = '9'.repeat(40)
const survivingTop = 'a'.repeat(40)

function seedHistory(api: RepositoryGitHub) {
  const changes = [HEAD_SHA, TRUNK_HEAD]
  const joined = [joinedParallel, ...changes]
  const bottom = [reorderedParallel, TRUNK_HEAD]
  const middle = [reorderedChanges, ...bottom]
  const trunk = [mergedTrunk, TRUNK_HEAD]
  const histories = [
    [TRUNK_HEAD],
    changes,
    [PARALLEL_HEAD, TRUNK_HEAD],
    joined,
    [TOP_HEAD, ...joined],
    bottom,
    middle,
    [reorderedTop, ...middle],
    trunk,
    [survivingTop, ...trunk],
  ]
  for (const left of histories) {
    for (const right of histories) {
      const common = left.find((commit) => right.includes(commit))
      if (common) api.mergeBases.set(`${left[0]}...${right[0]}`, common)
    }
  }
}

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('joins three workspaces, re-orders their GitHub stack, and merges the ready layers below a failed check', async () => {
  const f = await restackFixture(bundle)
  try {
    seedHistory(f.api)
    f.api.checks.set(HEAD_SHA, [pending])
    f.api.pulls[3].baseRefName = 'main'
    f.api.checks.set(TOP_HEAD, [pending])
    const first = await f.session(OUTER_WORKSPACE)
    const second = await f.session(PARALLEL)
    const third = await f.session(OTHER_WORKSPACE)
    const pushedFix = async (
      number: number,
      head: string,
      workspaceId: string,
      session: string,
    ) => {
      const pull = f.api.pulls[number]
      const previous = pull.headRefOid
      pull.headRefOid = head
      f.api.branches.set(`refs/heads/${pull.headRefName}`, head)
      f.api.checks.set(head, [pending])
      await f.push(`smoke-push-${head[0]}`, pull.headRefName, previous, head)
      await f.endFix(workspaceId, session)
      await f.queue.advanceStartAlarm()
    }
    const order = async () =>
      (await f.entries()).map(({ pullNumber }) => pullNumber)

    expect(await order()).toEqual([2])
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    await f.queue.advanceStartAlarm()
    expect(
      (await f.messages(PARALLEL, second)).map(({ text }) => text),
    ).toEqual([
      expect.stringContaining(`git rebase --onto ${HEAD_SHA} ${TRUNK_HEAD}`),
    ])
    await pushedFix(4, joinedParallel, PARALLEL, second)
    expect((await f.change('POST', OTHER_WORKSPACE)).status).toBe(204)
    await f.queue.advanceStartAlarm()
    expect(await order()).toEqual([2, 4, 3])
    expect(await readQueue(f.db, f.scope)).toMatchObject({
      githubStackNumber: 1,
    })
    expect(await f.steps()[1].clone().json()).toEqual({ pull_requests: [2, 4] })
    expect(await f.steps().at(-1)?.clone().json()).toEqual({
      pull_requests: [3],
    })

    const beforeReorder = f.steps().length
    expect(
      (
        await f.change('PUT', PARALLEL, {
          body: { beforeWorkspaceId: OUTER_WORKSPACE },
        })
      ).status,
    ).toBe(204)
    await f.queue.advanceStartAlarm()
    expect(await order()).toEqual([4, 2, 3])
    expect(new URL(f.steps()[beforeReorder].url).pathname).toBe(
      '/repos/Codertocat/Hello-World/stacks/1/unstack',
    )
    expect(await f.messages(OUTER_WORKSPACE, first)).toEqual([])
    expect(await f.messages(OTHER_WORKSPACE, third)).toEqual([])
    await pushedFix(4, reorderedParallel, PARALLEL, second)
    expect(
      (await f.messages(OUTER_WORKSPACE, first)).map(({ text }) => text),
    ).toEqual([
      expect.stringContaining(
        `git rebase --onto ${reorderedParallel} ${TRUNK_HEAD}`,
      ),
    ])
    expect(await f.messages(OTHER_WORKSPACE, third)).toEqual([])
    await pushedFix(2, reorderedChanges, OUTER_WORKSPACE, first)
    expect(
      (await f.messages(OTHER_WORKSPACE, third)).map(({ text }) => text),
    ).toEqual([
      expect.stringContaining(
        `git rebase --onto ${reorderedChanges} ${joinedParallel}`,
      ),
    ])
    await pushedFix(3, reorderedTop, OTHER_WORKSPACE, third)
    expect(await readQueue(f.db, f.scope)).toMatchObject({
      githubStackNumber: 2,
      reordering: 0,
    })
    expect([4, 2, 3].map((number) => f.api.pulls[number].baseRefName)).toEqual([
      'main',
      'parallel',
      'changes',
    ])
    expect(f.writes()).toEqual([])

    f.api.checks.set(reorderedTop, [failed])
    await f.status('smoke-failed-check', 3)
    await f.queue.advanceStartAlarm()
    expect(await (await f.bar(OTHER_WORKSPACE)).json()).toMatchObject({
      banner: { state: 'checks-failed' },
      queue: { place: 3, count: 3, wait: 'checks' },
    })
    expect((await f.messages(OTHER_WORKSPACE, third)).length).toBe(1)
    expect(f.writes()).toEqual([])

    f.api.checks.set(reorderedParallel, [passedRun])
    f.api.checks.set(reorderedChanges, [passedRun])
    await f.status('smoke-ready-prefix', 2)
    await f.queue.advanceStartAlarm()
    const [merge] = f.writes()
    expect(f.writes()).toHaveLength(1)
    expect(new URL(merge.url).pathname).toBe(
      '/repos/Codertocat/Hello-World/pulls/2/merge-async',
    )
    expect(merge.headers.get('Authorization')).toBe(`Bearer ${OWNER_TOKEN}`)
    expect(await merge.clone().json()).toEqual({
      sha: reorderedChanges,
      merge_method: 'squash',
      merge_action: 'direct_merge',
      bypass_rules: false,
    })

    for (const job of f.api.merges.jobs.values()) job.state = 'merged'
    f.api.branches.set('refs/heads/main', mergedTrunk)
    f.api.branches.set('refs/heads/layer-two', survivingTop)
    f.api.pulls[3].baseRefName = 'main'
    f.api.pulls[3].headRefOid = survivingTop
    f.api.checks.set(survivingTop, [failed])
    await f.queue.advanceStartAlarm()
    expect([4, 2, 3].map((number) => f.api.pulls[number].state)).toEqual([
      'MERGED',
      'MERGED',
      'OPEN',
    ])
    expect(await f.records()).toEqual([
      { number: 2, workspaceId: OUTER_WORKSPACE },
      { number: 4, workspaceId: PARALLEL },
    ])
    expect(await (await f.bar(OTHER_WORKSPACE)).json()).toMatchObject({
      banner: { state: 'checks-failed' },
      queue: { place: 1, count: 1, wait: 'checks' },
    })
    expect(await order()).toEqual([3])
  } finally {
    await f.dispose()
  }
})
