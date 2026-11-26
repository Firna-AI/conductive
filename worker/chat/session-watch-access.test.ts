import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { requireFeatureResult } from '../features/result'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { watchFixture, type WatchFixture } from './session-watch.test-support'

let harness: TestHarness
let f: WatchFixture
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
beforeEach(async () => {
  f = await watchFixture(harness, true)
})
afterAll(async () => {
  await harness.dispose()
})

it.each(['login', 'member', 'archive'] as const)(
  'suppresses an unavailable %s caller and preserves the no-line receipt after repair',
  async (cause) => {
    await f.finishCaller()
    await f.finishTarget('finished')
    const ready = await f.ready()
    if (cause === 'login')
      await f.env.DB.prepare(
        'UPDATE agent_logins SET no_reuse = 1 WHERE user_id = ?',
      )
        .bind(f.owner.id)
        .run()
    else if (cause === 'member')
      await f.env.DB.prepare('UPDATE users SET suspended_at = 1 WHERE id = ?')
        .bind(f.member.id)
        .run()
    else
      await f.env.DB.prepare(
        'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
      )
        .bind(WORKSPACE_ID)
        .run()
    await f.fire()
    expect(await f.receipt()).toMatchObject({ state: 'suppressed' })
    await f.env.DB.batch([
      f.env.DB.prepare(
        'UPDATE agent_logins SET no_reuse = 0 WHERE user_id = ?',
      ).bind(f.owner.id),
      f.env.DB.prepare(
        'UPDATE users SET suspended_at = NULL WHERE id = ?',
      ).bind(f.member.id),
      f.env.DB.prepare(
        'UPDATE workspaces SET archived_at = NULL WHERE id = ?',
      ).bind(WORKSPACE_ID),
    ])
    expect(await f.actor.rpc.acceptSessionWatch(ready)).toBe('suppressed')
    expect(await f.notices()).toEqual([])
    expect(
      (await f.chat.store.read(WORKSPACE_ID, (view) => view.sessions())).filter(
        (session) => session.sourceSessionId !== null,
      ),
    ).toEqual([])
  },
)

it('fences org suspension, restores retained delivery, and purges watch payload', async () => {
  await f.finishCaller()
  await f.env.DB.prepare(
    'UPDATE orgs SET suspended_at = 1, lifecycle_generation = 1 WHERE id = ?',
  )
    .bind(f.org.id)
    .run()
  requireFeatureResult(
    await f.actor.rpc.suspendMemberLifecycle(
      { orgId: f.org.id, generation: 1 },
      WORKSPACE_ID,
    ),
  )
  await f.fire()
  expect(await f.receipt()).toBe(undefined)
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.watches.target(f.watch.watchId),
    ),
  ).toMatchObject({ stage: 'ready', state: 'stopped' })
  await f.env.DB.prepare(
    'UPDATE orgs SET suspended_at = NULL, lifecycle_generation = 2 WHERE id = ?',
  )
    .bind(f.org.id)
    .run()
  requireFeatureResult(
    await f.actor.rpc.restoreMemberLifecycle(
      { orgId: f.org.id, generation: 2 },
      null,
      null,
    ),
  )
  await f.fire()
  expect(await f.notices()).toMatchObject([
    { watchedTurnId: f.watched.turnId, state: 'stopped' },
  ])
  requireFeatureResult(
    await f.actor.rpc.deleteMemberWorkspaceState({
      orgId: f.org.id,
      generation: 3,
    }),
  )
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) => view.watches.targets()),
  ).toEqual([])
  expect(await f.receipt()).toBe(undefined)
})
