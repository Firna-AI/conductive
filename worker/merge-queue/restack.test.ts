import { beforeAll, expect, it } from 'vitest'

import {
  OTHER_WORKSPACE,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA } from '../github/fake-pull'
import { queueId } from './contracts'
import { readQueue } from './data'
import { PARALLEL_HEAD, TOP_HEAD, TRUNK_HEAD } from './merge.test-support'
import { MEMBER_TOKEN, PARALLEL, queueBundle } from './queue.test-support'
import { restackFixture } from './restack.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('waits for the queuer push before setting a base, creating a stack, and adding its third layer', async () => {
  const f = await restackFixture(bundle)
  try {
    await f.queue.advanceStartAlarm()
    expect(f.steps()).toEqual([])
    const session = await f.session(PARALLEL)
    f.api.mergeBases.set(`${HEAD_SHA}...${PARALLEL_HEAD}`, TRUNK_HEAD)
    expect(
      (await f.change('POST', PARALLEL, { cookie: f.cookies.memberCookie }))
        .status,
    ).toBe(204)
    await Promise.all([f.wake(), f.wake()])
    await f.queue.advanceStartAlarm()
    expect(f.steps()).toEqual([])
    expect(await f.base(PARALLEL)).toBe('changes')
    const messages = await f.messages(PARALLEL, session)
    expect(messages).toMatchObject([{ sender: { id: 'member' } }])
    expect(messages[0].text).toContain(`\`FETCH_HEAD\` is at \`${HEAD_SHA}`)
    expect(messages[0].text).toContain('git fetch origin refs/pull/2/head')
    expect(messages[0].text).toContain(
      `git rebase --onto ${HEAD_SHA} ${TRUNK_HEAD}`,
    )
    expect(messages[0].text).not.toContain('Sent by:')

    const rebased = '8'.repeat(40)
    f.api.pulls[4].headRefOid = rebased
    f.api.branches.set('refs/heads/parallel', rebased)
    f.api.mergeBases.set(`${HEAD_SHA}...${rebased}`, HEAD_SHA)
    f.api.mergeBases.set(`${TRUNK_HEAD}...${rebased}`, TRUNK_HEAD)
    await f.endFix(PARALLEL, session)
    await f.queue.advanceStartAlarm()
    const steps = f.steps()
    expect(steps.map(({ method }) => method)).toEqual(['PATCH', 'POST'])
    expect(steps.map(({ headers }) => headers.get('Authorization'))).toEqual([
      `Bearer ${MEMBER_TOKEN}`,
      `Bearer ${MEMBER_TOKEN}`,
    ])
    expect(await steps[0].clone().json()).toEqual({ base: 'changes' })
    expect(await steps[1].clone().json()).toEqual({ pull_requests: [2, 4] })
    expect(await readQueue(f.db, f.scope)).toMatchObject({
      githubStackNumber: 1,
    })

    // GitHub can send the same edit under a second delivery ID.
    await f.edit('own-edit', 4, 'main', 'changes')
    await f.edit('own-edit-repeat', 4, 'main', 'changes')
    await f.queue.advanceStartAlarm()
    expect(f.steps()).toHaveLength(2)
    expect(await f.base(PARALLEL)).toBe('changes')
    expect((await f.entries()).map(({ pullNumber }) => pullNumber)).toEqual([
      2, 4,
    ])

    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    f.api.pulls[3].baseRefName = 'main'
    f.api.mergeBases.set(`${rebased}...${TOP_HEAD}`, rebased)
    expect((await f.change('POST', OTHER_WORKSPACE)).status).toBe(204)
    await f.queue.advanceStartAlarm()
    const additional = f.steps().slice(2)
    expect(new URL(additional[1].url).pathname).toBe(
      '/repos/Codertocat/Hello-World/stacks/1/add',
    )
    expect(await additional[0].clone().json()).toEqual({ base: 'parallel' })
    expect(await additional[1].clone().json()).toEqual({ pull_requests: [3] })
  } finally {
    await f.dispose()
  }
})

it('stays in place after one failed turn and leaves on a repeated independent base edit', async () => {
  const f = await restackFixture(bundle)
  try {
    const session = await f.session(PARALLEL)
    f.api.mergeBases.set(`${HEAD_SHA}...${PARALLEL_HEAD}`, TRUNK_HEAD)
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    await f.queue.advanceStartAlarm()
    await f.endFix(PARALLEL, session)
    await f.queue.advanceStartAlarm()
    await f.wake()
    await f.queue.advanceStartAlarm()
    expect(await f.messages(PARALLEL, session)).toHaveLength(1)
    expect(await f.entries()).toMatchObject([
      { pullNumber: 2 },
      { pullNumber: 4, place: 2, state: 'waiting', wait: 'rebase' },
    ])
    expect(f.steps()).toEqual([])
    f.api.branches.set('refs/heads/member-base', TOP_HEAD)
    f.api.pulls[4].baseRefName = 'member-base'
    await f.edit('member-edit', 4, 'main', 'member-base')
    await f.edit('member-edit-repeat', 4, 'main', 'member-base')
    await f.queue.advanceStartAlarm()
    expect((await f.entries()).map(({ pullNumber }) => pullNumber)).toEqual([2])
    expect(await f.base(PARALLEL)).toBe('member-base')
    expect(f.api.pulls[4].baseRefName).toBe('member-base')
    expect(f.steps()).toEqual([])
  } finally {
    await f.dispose()
  }
})

it('holds a base that already contains the layer and retries a refused base move before stacking', async () => {
  const f = await restackFixture(bundle)
  try {
    f.api.mergeBases.set(`${HEAD_SHA}...${PARALLEL_HEAD}`, PARALLEL_HEAD)
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    await f.queue.advanceStartAlarm()
    expect(f.steps()).toEqual([])
    expect(await f.entries()).toMatchObject([
      { pullNumber: 2 },
      { wait: 'rebase' },
    ])
    f.api.mergeBases.set(`${HEAD_SHA}...${PARALLEL_HEAD}`, HEAD_SHA)
    f.api.refusedBaseWrites.add(4)
    await f.wake()
    await f.queue.advanceStartAlarm()
    expect(f.steps().map(({ method }) => method)).toEqual(['PATCH'])
    expect(await f.entries()).toMatchObject([
      { pullNumber: 2 },
      { pendingBase: null },
    ])
    f.api.refusedBaseWrites.delete(4)
    const restart = await f.request(
      `/__test/continue-restart?workspace=${encodeURIComponent(queueId(f.scope))}`,
      { method: 'POST', body: '{}' },
    )
    expect(restart.status).toBe(500)
    await restart.arrayBuffer()
    const recovered = f.actor(queueId(f.scope))
    await recovered.inspectFeatureConnections()
    await recovered.advanceStartAlarm()
    expect(f.steps().map(({ method }) => method)).toEqual([
      'PATCH',
      'PATCH',
      'POST',
    ])
    expect(await f.base(OUTER_WORKSPACE)).toBeNull()
    expect(await f.base(PARALLEL)).toBe('changes')
  } finally {
    await f.dispose()
  }
})

it('adopts a created stack on retry when GitHub lost the create reply', async () => {
  const f = await restackFixture(bundle)
  try {
    f.api.stacks.loseNextCreateReply = true
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    await f.queue.advanceStartAlarm()
    expect(await readQueue(f.db, f.scope)).toMatchObject({
      githubStackNumber: null,
    })
    expect(f.steps().map(({ method }) => method)).toEqual(['PATCH', 'POST'])
    await f.queue.advanceStartAlarm()
    expect(await readQueue(f.db, f.scope)).toMatchObject({
      githubStackNumber: 1,
    })
    expect(f.steps().map(({ method }) => method)).toEqual(['PATCH', 'POST'])
  } finally {
    await f.dispose()
  }
})
