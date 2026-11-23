import { afterEach, beforeAll, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import {
  agentWakeUpPaths,
  sessionWakeUpPaths,
} from '../../src/shared/wake-up-paths'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { wakeUpRepairReceiver } from '../chat/session-wake-up-repair'
import { requireFeatureResult } from './result'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from './agent-session-writes.test-support'
import {
  endCallingTurn,
  scheduleWakeUp,
  wakeUpEvents,
  wakeUpTranscript,
} from './session-wake-up.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
const at = DEVICE_TEST_NOW + 60_000
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('fires once at its deadline, joins the turn, and permits the same intent to schedule again', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const body = { at, text: 'Check the result' }
  const { wakeUp } = await scheduleWakeUp(active, body)
  const actor = await active.actor()
  await actor.advanceStartAlarm(at - 1)
  expect(await wakeUpEvents(active)).toHaveLength(1)
  await actor.advanceStartAlarm(at)
  const [, fired] = await wakeUpEvents(active)
  if (fired?.type !== 'session.wake-up-fired')
    throw new Error('The fired wake-up is missing.')
  const { messageId } = fired
  expect(await active.sourceRunner.inbox.next()).toMatchObject({
    type: 'message',
    turnId: active.sourceTurnId,
    wakeUp: true,
    message: {
      id: messageId,
      sender: { id: 'member' },
      text: 'Wake-up:\n\nCheck the result',
    },
  })
  await actor.advanceStartAlarm(at + 1)
  expect(await wakeUpEvents(active)).toMatchObject([
    { type: 'session.wake-up-scheduled' },
    {
      type: 'session.wake-up-fired',
      messageId,
      wakeUpId: wakeUp.id,
      turnId: active.sourceTurnId,
    },
  ])
  expect(
    (await wakeUpTranscript(active)).match(/Wake-up:\n\nCheck the result/g),
  ).toHaveLength(1)
  const cancel = agentWakeUpPaths.cancel(
    undefined,
    active.sourceSessionId,
    wakeUp.id,
  )
  expect(await (await active.post(cancel, {})).json()).toMatchObject({
    state: 'already-fired',
  })
  expect((await scheduleWakeUp(active, body)).wakeUp.id).not.toBe(wakeUp.id)
  await actor.advanceStartAlarm(at + 1)
  expect(await active.sourceRunner.inbox.next()).toMatchObject({
    type: 'message',
    message: { text: 'Wake-up:\n\nCheck the result' },
  })
})

it.each([
  ['closed', 'session-closed', 'because the session was closed'],
  ['archived', 'archived', 'because the workspace was archived'],
  ['member left', 'sender-unavailable', 'at the next message'],
  ['login removed', 'login-unavailable', 'member connects Claude again'],
] as const)(
  'ends a wake-up once when %s prevents a turn',
  async (cause, kind, words) => {
    const active = (fixture = await agentWriteFixture(bundle))
    const { wakeUp } = await scheduleWakeUp(active, {
      at,
      text: 'Check the result',
    })
    await endCallingTurn(active)
    if (cause === 'closed') {
      const response = await active.request(
        sessionPaths.close(OUTER_ORG, OUTER_WORKSPACE, active.sourceSessionId),
        { method: 'POST', body: JSON.stringify({ stopRunningTurn: false }) },
      )
      expect(response.status).toBe(200)
    } else {
      const statement = {
        archived: active.env.DB.prepare(
          'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
        ).bind(OUTER_WORKSPACE),
        'member left': active.env.DB.prepare(
          "DELETE FROM org_members WHERE org_id = ? AND user_id = 'member'",
        ).bind(OUTER_ORG),
        'login removed': active.env.DB.prepare(
          "DELETE FROM agent_logins WHERE user_id = 'member' AND agent = 'claude'",
        ),
      }
      await statement[cause].run()
    }
    await (await active.actor()).advanceStartAlarm(at)
    expect(await wakeUpEvents(active)).toMatchObject([
      { type: 'session.wake-up-scheduled' },
      {
        type: 'session.wake-up-ended',
        at,
        wakeUpId: wakeUp.id,
        outcome: { kind: 'could-not-start', reason: { kind } },
      },
    ])
    expect(await wakeUpTranscript(active)).toContain(words)
    expect(
      await (
        await active.request(
          sessionWakeUpPaths.list(
            OUTER_ORG,
            OUTER_WORKSPACE,
            active.sourceSessionId,
          ),
        )
      ).json(),
    ).toMatchObject({ wakeUps: [] })
  },
)

it('keeps the due work paused when the org is suspended', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const { wakeUp } = await scheduleWakeUp(active, {
    at,
    text: 'Check the result',
  })
  await endCallingTurn(active)
  const actor = await active.actor()
  await active.env.DB.prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
    .bind(OUTER_ORG)
    .run()
  await actor.advanceStartAlarm(at)
  await active.env.DB.prepare(
    'UPDATE orgs SET suspended_at = NULL WHERE id = ?',
  )
    .bind(OUTER_ORG)
    .run()
  expect(await wakeUpEvents(active)).toMatchObject([
    { type: 'session.wake-up-scheduled', wakeUp: { id: wakeUp.id } },
  ])
  await actor.advanceStartAlarm(at + 30_000)
  expect(await wakeUpEvents(active)).toMatchObject([
    { type: 'session.wake-up-scheduled' },
    { type: 'session.wake-up-fired', wakeUpId: wakeUp.id },
  ])
})

it('keeps the sender of the turn that receives a wake-up set by an earlier sender', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  await scheduleWakeUp(active, { at, text: 'Check the result' })
  await endCallingTurn(active)
  const turnId = await active.start(
    OUTER_WORKSPACE,
    active.sourceSessionId,
    active.sourceRunner,
    'owner',
    active.cookies.ownerCookie,
  )
  await (await active.actor()).advanceStartAlarm(at)
  expect(await active.sourceRunner.inbox.next()).toMatchObject({
    type: 'message',
    turnId,
    message: { sender: { id: 'owner' }, text: 'Wake-up:\n\nCheck the result' },
  })
})

it('ends a wake-up when the starter revokes login sharing before it fires', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  await endCallingTurn(active)
  const turnId = await active.start(
    OUTER_WORKSPACE,
    active.sourceSessionId,
    active.sourceRunner,
    'owner',
    active.cookies.ownerCookie,
  )
  const response = await active.post(
    agentWakeUpPaths.schedule,
    { at, text: 'Check the result' },
    turnId,
  )
  expect(response.status).toBe(200)
  await endCallingTurn(active, turnId, 'owner-starting-message')
  await active.env.DB.prepare(
    "UPDATE agent_logins SET no_reuse = 1 WHERE user_id = 'member' AND agent = 'claude'",
  ).run()
  await (await active.actor()).advanceStartAlarm(at)
  expect(await wakeUpEvents(active)).toMatchObject([
    { type: 'session.wake-up-scheduled' },
    {
      type: 'session.wake-up-ended',
      outcome: {
        kind: 'could-not-start',
        reason: { kind: 'login-not-shared' },
      },
    },
  ])
  expect(await wakeUpTranscript(active)).toContain('at the next message')
})

it('repairs a missing alarm after an older Worker restored a deleted org', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const { wakeUp } = await scheduleWakeUp(active, {
    at,
    text: 'Check the result',
  })
  await endCallingTurn(active)
  const actor = await active.actor()
  await active.env.DB.prepare(
    'UPDATE orgs SET deleted_at = 1, lifecycle_generation = 1 WHERE id = ?',
  )
    .bind(OUTER_ORG)
    .run()
  const ownership = { orgId: OUTER_ORG, generation: 1 }
  requireFeatureResult(
    await actor.suspendMemberLifecycle(ownership, OUTER_WORKSPACE),
  )
  await actor.advanceStartAlarm(at)
  requireFeatureResult(
    await actor.restoreMemberLifecycle(ownership, null, null),
  )
  await actor.clearSessionWakeUpAlarm()
  await active.env.DB.prepare('UPDATE orgs SET deleted_at = NULL WHERE id = ?')
    .bind(OUTER_ORG)
    .run()
  expect(await wakeUpEvents(active)).toMatchObject([
    { type: 'session.wake-up-scheduled' },
  ])
  const repair = await active.actor(wakeUpRepairReceiver)
  await repair.repairRestoredWakeUpAlarms()
  await actor.advanceStartAlarm(at)
  expect(await wakeUpEvents(active)).toMatchObject([
    { type: 'session.wake-up-scheduled' },
    { type: 'session.wake-up-fired', wakeUpId: wakeUp.id },
  ])
})
