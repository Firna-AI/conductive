import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { OUTER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import { chatKey } from '../chat/storage-keys'
import { featureState } from '../features/fixture.test-support'
import {
  LIFECYCLE_STATE_KEY,
  type DurableLifecycleState,
} from '../lifecycle/durable-types'
import { START_JOB_KEY } from '../lifecycle/start-storage'
import { saveGitHubTokens } from '../security/github-tokens'
import { fixFixture } from './fix.test-support'
import { MEMBER_TOKEN, queueBundle } from './queue.test-support'
import { requireFeatureResult } from '../features/result'

let bundle: string
let f: Awaited<ReturnType<typeof fixFixture>>
beforeAll(async () => {
  bundle = await queueBundle()
})
beforeEach(async () => {
  f = await fixFixture(bundle)
})
afterEach(async () => {
  await f?.dispose()
})

it.each([
  {
    cause: 'queuer leaves the org',
    change: () =>
      f.db
        .prepare(
          "DELETE FROM org_members WHERE org_id = ? AND user_id = 'member'",
        )
        .bind(f.scope.orgId)
        .run(),
  },
  {
    cause: 'org is suspended',
    change: () =>
      f.db
        .prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
        .bind(f.scope.orgId)
        .run(),
  },
  {
    cause: 'queuer becomes a reader',
    change: () => f.api.merges.memberPermissions.set(MEMBER_TOKEN, 'READ'),
  },
  {
    cause: 'queuer loses repository access',
    change: () => f.api.deniedTokens.add(MEMBER_TOKEN),
  },
])('leaves without sending a message when the $cause', async ({ change }) => {
  await f.start()
  await change()
  await f.queue.advanceStartAlarm()
  expect(await f.entries()).toEqual([])
  const messages = [...featureState(await f.control('state')).keys()].filter(
    (key) => key.startsWith(chatKey('message', '')),
  )
  expect(messages).toEqual([])
  expect(await f.sessions()).toEqual([])
})

it('waits after a failed token refresh and still sends as the queuer after sign-in', async () => {
  await f.start()
  const now = await f.queue.testAlarmTime()
  await saveGitHubTokens(
    f.env,
    'member',
    {
      accessToken: MEMBER_TOKEN,
      expiresAt: now - 1,
      refreshToken: 'expired-token',
      refreshExpiresAt: now + 60_000,
    },
    now,
  )
  f.github.tokenStatus = 401
  await f.queue.advanceStartAlarm()
  expect(await f.bar()).toMatchObject({ state: 'waiting', wait: 'token' })
  expect(await f.sessions()).toEqual([])
  expect(f.github.requests.map(({ url }) => new URL(url).pathname)).toContain(
    '/login/oauth/access_token',
  )
  await saveGitHubTokens(
    f.env,
    'member',
    {
      accessToken: MEMBER_TOKEN,
      expiresAt: null,
      refreshToken: null,
      refreshExpiresAt: null,
    },
    now,
  )
  await f.queue.advanceStartAlarm()
  expect(await f.start()).toMatchObject({ state: 'sent' })
  expect(await f.messages((await f.restackSession()).id)).toMatchObject([
    { sender: { id: 'member' } },
  ])
})

it('resumes the stopped cloud computer as the queuer after saving the message', async () => {
  const actor = f.actor()
  const now = await actor.testAlarmTime()
  await f.db
    .prepare(
      "UPDATE workspaces SET state = 'stopped', sandbox_id = ? WHERE id = ?",
    )
    .bind('bx_queue_resume', OUTER_WORKSPACE)
    .run()
  f.boat.states.set('bx_queue_resume', 'archived')
  await actor.seedFeatureState({
    [LIFECYCLE_STATE_KEY]: {
      workspaceId: OUTER_WORKSPACE,
      orgId: f.scope.orgId,
      state: 'stopped',
      start: null,
      pendingFirstMessage: null,
      lastActivityAt: now,
      runningSessions: [],
      runnerConnected: false,
      stoppedAt: now,
      nextDiskKeepaliveAt: null,
      error: null,
    } satisfies DurableLifecycleState,
  })
  const pending = await f.start()
  await f.queue.advanceStartAlarm()
  expect(await f.messages((await f.restackSession()).id)).toMatchObject([
    { id: pending.messageId, sender: { id: 'member' } },
  ])
  expect(
    featureState(await f.control('state')).get(START_JOB_KEY),
  ).toMatchObject({
    kind: 'resume',
    requestedByUserId: 'member',
  })
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'starting',
    start: { kind: 'resume' },
  })
  await actor.advanceStartAlarm()
  expect(f.boat.resumeIds).toEqual(['bx_queue_resume'])
})

it('does not admit a stale request after the workspace rejoins the queue', async () => {
  const pending = await f.start()
  expect((await f.change('DELETE', OUTER_WORKSPACE)).status).toBe(204)
  expect(
    (
      await f.change('POST', OUTER_WORKSPACE, {
        cookie: f.cookies.memberCookie,
      })
    ).status,
  ).toBe(204)
  expect(await f.actor().writeMergeQueueFix(pending)).toMatchObject({
    ok: false,
    error: { code: 'merge_queue_entry_not_found' },
  })
  await f.queue.advanceStartAlarm()
  requireFeatureResult(
    await f.queue.reportMergeQueueFix(f.scope, {
      turnId: 'removed-turn',
      messageId: pending.messageId,
      state: 'finished',
      endedAt: 1,
    }),
  )
  expect(await f.entries()).toMatchObject([
    { workspaceId: OUTER_WORKSPACE, state: 'queued', wait: null },
  ])
  expect(await f.sessions()).toEqual([])
})
