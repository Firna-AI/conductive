import { beforeAll, expect, it } from 'vitest'
import { githubPaths } from '../../src/shared/github'
import { mergeQueuePaths } from '../../src/shared/merge-queue'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import { createPullRequestStack } from '../github/stack-client'
import { mergeFixture, PARALLEL_HEAD } from './merge.test-support'
import {
  FOREIGN,
  MEMBER_TOKEN,
  OWNER_TOKEN,
  PARALLEL,
  queueBundle,
} from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

async function stackFixture() {
  const f = await mergeFixture(bundle, 'empty')
  try {
    f.api.pulls[4].baseRefName = 'layer-two'
    await createPullRequestStack(
      f.api.fetch,
      OWNER_TOKEN,
      f.api.fullName,
      [2, 3, 4],
    )
  } catch (error) {
    await f.dispose()
    throw error
  }
  const press = (path: string, body: object) =>
    f.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Cookie: f.cookies.memberCookie },
    })
  return {
    ...f,
    stackMerge: (stackCount: number) =>
      press(mergeQueuePaths.merge(OUTER_ORG, PARALLEL), {
        pullNumber: 4,
        headSha: PARALLEL_HEAD,
        stackCount,
      }),
    direct: (
      workspace = PARALLEL,
      headSha = PARALLEL_HEAD,
      stackCount?: number,
    ) =>
      press(githubPaths.merge(OUTER_ORG, workspace), {
        headSha,
        method: 'rebase',
        stackCount,
      }),
  }
}

it('reports and directly merges the open stack outside the queue', async () => {
  const f = await stackFixture()
  try {
    expect(await (await f.bar(PARALLEL)).json()).toHaveProperty('mergeStack', {
      count: 3,
      queue: null,
    })
    f.api.pulls[2].state = 'CLOSED'
    expect(await (await f.bar(PARALLEL)).json()).toHaveProperty('mergeStack', {
      count: 2,
      queue: null,
    })
    const changed = await f.direct(PARALLEL, PARALLEL_HEAD, 3)
    expect(changed.status).toBe(409)
    expect(await changed.json()).toHaveProperty(
      'error.code',
      'merge_stack_changed',
    )
    expect(f.writes()).toEqual([])
    f.api.pulls[2].state = 'OPEN'
    const started = await f.direct(PARALLEL, PARALLEL_HEAD, 3)
    expect(started.status).toBe(202)
    expect(f.writes()).toHaveLength(1)
    expect(f.writes()[0].headers.get('Authorization')).toBe(
      `Bearer ${MEMBER_TOKEN}`,
    )
    const mergeId = Object(await started.json()).mergeId
    for (const job of f.api.merges.jobs.values()) job.state = 'merged'
    const completed = await f.request(
      githubPaths.mergeResult(OUTER_ORG, PARALLEL, mergeId),
      {
        headers: { Cookie: f.cookies.memberCookie },
      },
    )
    expect(await completed.json()).toEqual({ state: 'merged' })
    expect([2, 3, 4].map((number) => f.api.pulls[number].state)).toEqual([
      'MERGED',
      'MERGED',
      'MERGED',
    ])
  } finally {
    await f.dispose()
  }
})

it('checks and lands the queued unit with the clicked top as the member', async () => {
  const f = await stackFixture()
  try {
    expect((await f.change('POST', OTHER_WORKSPACE)).status).toBe(204)
    expect(await (await f.bar(PARALLEL)).json()).toHaveProperty('mergeStack', {
      count: 3,
      queue: 'same-org',
    })
    f.topChecksRunning()
    expect((await f.stackMerge(3)).status).toBe(409)
    f.api.checks.set(f.api.pulls[3].headRefOid, [passedRun])
    expect((await f.stackMerge(2)).status).toBe(409)
    expect(f.writes()).toEqual([])
    expect((await f.stackMerge(3)).status).toBe(202)
    expect(f.writes().map(({ url }) => new URL(url).pathname)).toEqual([
      '/repos/Codertocat/Hello-World/pulls/4/merge-async',
    ])
    expect(f.writes()[0].headers.get('Authorization')).toBe(
      `Bearer ${MEMBER_TOKEN}`,
    )
    expect(await f.writes()[0].clone().json()).toMatchObject({
      merge_method: 'rebase',
    })
    for (const job of f.api.merges.jobs.values()) job.state = 'merged'
    await f.queue.advanceStartAlarm()
    await f.queue.advanceStartAlarm()
    expect(await f.records()).toEqual([
      { number: 2, workspaceId: OUTER_WORKSPACE },
      { number: 3, workspaceId: OTHER_WORKSPACE },
      { number: 4, workspaceId: PARALLEL },
    ])
    expect(await f.entries()).toEqual([])
  } finally {
    await f.dispose()
  }
})

it.each(['same org', 'another org'])(
  'blocks a stale direct merge when a lower pull joins a queue in %s',
  async (owner) => {
    const f = await stackFixture()
    try {
      const before = await f.bar(PARALLEL)
      expect(before.status).toBe(200)
      const other = owner === 'another org'
      if (other) {
        await f.db
          .prepare("UPDATE workspaces SET branch = 'changes' WHERE id = ?")
          .bind(FOREIGN)
          .run()
      }
      const added = other
        ? await f.change('POST', FOREIGN, {
            orgId: 'other-org',
            cookie: f.cookies.outsiderCookie,
          })
        : await f.change('POST', OUTER_WORKSPACE)
      expect(added.status).toBe(204)
      const refused = await f.direct()
      expect(refused.status).toBe(409)
      expect(await refused.json()).toHaveProperty(
        'error.code',
        'merge_queue_required',
      )
      expect(f.writes()).toEqual([])
      expect(await (await f.bar(PARALLEL)).json()).toHaveProperty(
        'mergeStack',
        {
          count: 3,
          queue: other ? 'other-org' : 'same-org',
        },
      )
      const alias = await f.direct(OUTER_WORKSPACE, HEAD_SHA)
      expect(alias.status).toBe(409)
      expect(await alias.json()).toHaveProperty(
        'error.code',
        'merge_queue_required',
      )
      expect(f.writes()).toEqual([])
    } finally {
      await f.dispose()
    }
  },
)
