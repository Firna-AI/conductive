import { beforeAll, expect, it } from 'vitest'

import {
  OTHER_WORKSPACE,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import { PARALLEL_HEAD, TOP_HEAD, TRUNK_HEAD } from './merge.test-support'
import { PARALLEL, queueBundle } from './queue.test-support'
import { restackFixture } from './restack.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('restacks from the trunk upward after an outside merge and a lower push', async () => {
  const f = await restackFixture(bundle)
  try {
    const bottom = await f.session(OUTER_WORKSPACE)
    const upper = await f.session(PARALLEL)
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    await f.queue.advanceStartAlarm()
    const trunk = '5'.repeat(40)
    const lower = '6'.repeat(40)
    f.api.branches.set('refs/heads/main', trunk)
    f.api.mergeBases.set(`${trunk}...${HEAD_SHA}`, TRUNK_HEAD)
    await f.push('outside-merge', 'main', TRUNK_HEAD, trunk)
    await f.queue.advanceStartAlarm()
    expect(
      (await f.messages(OUTER_WORKSPACE, bottom)).map(({ text }) => text),
    ).toEqual([
      expect.stringContaining(`git rebase --onto ${trunk} ${TRUNK_HEAD}`),
    ])
    expect(await f.messages(PARALLEL, upper)).toEqual([])
    const githubPosts = f.api.requests.filter(
      (r) => r.method === 'POST' && new URL(r.url).pathname === '/graphql',
    )
    const bodies = await Promise.all(githubPosts.map((r) => r.clone().text()))
    expect(bodies.join('\n')).not.toContain('mutation RebasePull')

    f.api.pulls[2].headRefOid = lower
    f.api.branches.set('refs/heads/changes', lower)
    f.api.mergeBases.set(`${trunk}...${lower}`, trunk)
    f.api.mergeBases.set(`${TRUNK_HEAD}...${lower}`, TRUNK_HEAD)
    f.api.mergeBases.set(`${TRUNK_HEAD}...${trunk}`, TRUNK_HEAD)
    f.api.mergeBases.set(`${lower}...${PARALLEL_HEAD}`, TRUNK_HEAD)
    f.api.checks.set(lower, [{ ...passedRun, conclusion: 'FAILURE' }])
    await f.push('lower-fix-push', 'changes', HEAD_SHA, lower)
    await f.queue.advanceStartAlarm()
    expect(await f.messages(PARALLEL, upper)).toEqual([])
    await f.endFix(OUTER_WORKSPACE, bottom)
    await f.queue.advanceStartAlarm()
    const messages = await f.messages(PARALLEL, upper)
    expect(messages.map(({ text }) => text)).toEqual([
      expect.stringContaining(`git rebase --onto ${lower} ${HEAD_SHA}`),
    ])
    expect(messages[0].text).toContain(lower)
  } finally {
    await f.dispose()
  }
})

it('replaces an unsent upper turn when the trunk changes first', async () => {
  const f = await restackFixture(bundle)
  try {
    const bottom = await f.session(OUTER_WORKSPACE)
    f.api.mergeBases.set(`${HEAD_SHA}...${PARALLEL_HEAD}`, TRUNK_HEAD)
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    await f.queue.advanceStartAlarm()
    expect(await f.entries()).toMatchObject([
      { pullNumber: 2 },
      { wait: 'open-session' },
    ])
    const outside = '5'.repeat(40)
    f.api.branches.set('refs/heads/main', outside)
    f.api.mergeBases.set(`${outside}...${HEAD_SHA}`, TRUNK_HEAD)
    await f.push('trunk-changed-first', 'main', TRUNK_HEAD, outside)
    await f.queue.advanceStartAlarm()
    expect(
      (await f.messages(OUTER_WORKSPACE, bottom)).map(({ text }) => text),
    ).toEqual([expect.stringContaining(`\`FETCH_HEAD\` is at \`${outside}`)])
    expect(await f.entries()).toMatchObject([
      { state: 'restacking' },
      { wait: 'lower-layer' },
    ])
  } finally {
    await f.dispose()
  }
})

it('drops the removed layer’s commits before rebuilding the stack', async () => {
  const f = await restackFixture(bundle)
  try {
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    await f.queue.advanceStartAlarm()
    f.api.pulls[3].baseRefName = 'main'
    f.api.mergeBases.set(`${PARALLEL_HEAD}...${TOP_HEAD}`, PARALLEL_HEAD)
    expect((await f.change('POST', OTHER_WORKSPACE)).status).toBe(204)
    const session = await f.session(OTHER_WORKSPACE)
    await f.queue.advanceStartAlarm()
    f.api.requests = []
    expect((await f.change('DELETE', PARALLEL)).status).toBe(204)
    await f.queue.advanceStartAlarm()
    expect(await f.base(PARALLEL)).toBeNull()
    expect(await f.base(OTHER_WORKSPACE)).toBe('changes')
    expect(
      (await f.messages(OTHER_WORKSPACE, session)).map(({ text }) => text),
    ).toEqual([
      expect.stringContaining(`git rebase --onto ${HEAD_SHA} ${PARALLEL_HEAD}`),
    ])
    expect(f.steps().map(({ url }) => new URL(url).pathname)).toEqual([
      '/repos/Codertocat/Hello-World/pulls/4',
      '/repos/Codertocat/Hello-World/stacks/1/unstack',
    ])

    const moved = '9'.repeat(40)
    f.api.pulls[3].headRefOid = moved
    f.api.branches.set('refs/heads/layer-two', moved)
    f.api.mergeBases.set(`${HEAD_SHA}...${moved}`, HEAD_SHA)
    f.api.mergeBases.set(`${PARALLEL_HEAD}...${moved}`, HEAD_SHA)
    await f.endFix(OTHER_WORKSPACE, session)
    await f.queue.advanceStartAlarm()
    expect(f.steps().map(({ url }) => new URL(url).pathname)).toEqual([
      '/repos/Codertocat/Hello-World/pulls/4',
      '/repos/Codertocat/Hello-World/stacks/1/unstack',
      '/repos/Codertocat/Hello-World/pulls/3',
      '/repos/Codertocat/Hello-World/stacks',
    ])
    expect(await f.steps()[3].clone().json()).toEqual({ pull_requests: [2, 3] })
  } finally {
    await f.dispose()
  }
})
