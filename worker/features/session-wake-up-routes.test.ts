import { afterEach, beforeAll, expect, it } from 'vitest'

import { agentSessionTranscriptPath } from '../../src/shared/agent-session-paths'
import {
  agentWakeUpPaths,
  sessionWakeUpPaths,
} from '../../src/shared/wake-up-paths'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { record, string } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_TOKEN,
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { orgEnvironmentContext } from '../lifecycle/settings-data'
import { recordRunningEnvironment } from '../lifecycle/start-environment'
import { encrypt } from '../security/crypto'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from './agent-session-writes.test-support'
import {
  getTool,
  invokeTool,
  scheduleWakeUp,
  wakeUpEvents,
  wakeUpTranscript,
} from './session-wake-up.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('uses the HTTP receipt time for delays, including new wake-ups after cancellation', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const request = { text: 'Check the build', delaySeconds: 120 }
  const scheduled = await scheduleWakeUp(active, request)
  expect(scheduled).toMatchObject({
    session: { id: active.sourceSessionId },
    wakeUp: { text: 'Check the build', at: DEVICE_TEST_NOW + 120_000 },
  })
  const actor = await active.actor()
  await actor.advanceStartAlarm(DEVICE_TEST_NOW + 1)
  expect(await scheduleWakeUp(active, request)).toEqual(scheduled)
  const cancel = agentWakeUpPaths.cancel(
    undefined,
    active.sourceSessionId,
    scheduled.wakeUp.id,
  )
  expect(await (await active.post(cancel, {})).json()).toMatchObject({
    state: 'cancelled',
    wakeUpId: scheduled.wakeUp.id,
  })
  expect(await (await active.post(cancel, {})).json()).toMatchObject({
    state: 'already-ended',
    wakeUpId: scheduled.wakeUp.id,
  })
  const again = await scheduleWakeUp(active, request)
  expect(again.wakeUp.id).not.toBe(scheduled.wakeUp.id)
  expect(again.wakeUp.at).toBe(DEVICE_TEST_NOW + 120_000)
  expect(await wakeUpEvents(active)).toMatchObject([
    { type: 'session.wake-up-scheduled', wakeUp: { id: scheduled.wakeUp.id } },
    {
      type: 'session.wake-up-ended',
      wakeUpId: scheduled.wakeUp.id,
      outcome: {
        kind: 'cancelled',
        source: {
          kind: 'session',
          workspaceId: OUTER_WORKSPACE,
          sessionId: active.sourceSessionId,
        },
      },
    },
    { type: 'session.wake-up-scheduled', wakeUp: { id: again.wakeUp.id } },
  ])
})

it('filters a known secret from the reply, pending event, lists, fired line, runner input, and copies', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const secret = 'wake-up-fixture-secret'
  await recordRunningEnvironment(
    active.env.DB,
    OUTER_WORKSPACE,
    await encrypt(
      JSON.stringify({ TOKEN: { value: secret, secret: true } }),
      orgEnvironmentContext(OUTER_ORG),
      active.env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  )
  const at = DEVICE_TEST_NOW + 60_000
  const masked = 'Check [redacted].'
  const { wakeUp } = await scheduleWakeUp(active, {
    at,
    text: `Check ${secret}.`,
  })
  expect(wakeUp.text).toBe(masked)
  const sessionId = active.sourceSessionId
  const scheduled = { type: 'session.wake-up-scheduled', sessionId, wakeUp }
  expect(await wakeUpEvents(active)).toEqual([scheduled])
  const list = await active.request(
    sessionWakeUpPaths.list(OUTER_ORG, OUTER_WORKSPACE, sessionId),
  )
  expect(list.status).toBe(200)
  expect(await list.json()).toMatchObject({ wakeUps: [wakeUp] })
  const toolList = await getTool(
    active,
    agentWakeUpPaths.list(undefined, sessionId),
  )
  expect(toolList.status).toBe(200)
  expect(await toolList.json()).toMatchObject({ wakeUps: [wakeUp] })
  const pendingCopy = await wakeUpTranscript(active)
  expect(pendingCopy).toContain(masked)
  expect(pendingCopy).not.toContain(secret)

  await (await active.actor()).advanceStartAlarm(at)
  expect(await wakeUpEvents(active)).toMatchObject([
    scheduled,
    { type: 'session.wake-up-fired', wakeUpId: wakeUp.id, text: masked },
  ])
  expect(await active.sourceRunner.inbox.next()).toMatchObject({
    type: 'message',
    message: { text: 'Wake-up:\n\nCheck [redacted].' },
  })
  const toolRead = await getTool(
    active,
    agentSessionTranscriptPath(undefined, sessionId),
  )
  expect(toolRead.status).toBe(200)
  for (const copy of [
    await wakeUpTranscript(active),
    string(record(await toolRead.json()).markdown),
  ]) {
    expect(copy).toContain('Wake-up:\n\nCheck [redacted].')
    expect(copy).not.toContain(secret)
  }
})

it('shows the app snapshot and tool transcript in time order and records the member cancel', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const later = await scheduleWakeUp(active, {
    text: 'Second job',
    delaySeconds: 120,
  })
  const sooner = await scheduleWakeUp(active, {
    text: 'First job',
    delaySeconds: 60,
  })
  const { sourceSessionId: sessionId } = active
  const path = sessionWakeUpPaths.list(OUTER_ORG, OUTER_WORKSPACE, sessionId)
  const list = await active.request(path)
  expect(list.status).toBe(200)
  expect(await list.json()).toMatchObject({
    wakeUps: [sooner.wakeUp, later.wakeUp],
  })
  const toolRead = await getTool(
    active,
    agentSessionTranscriptPath(undefined, sessionId),
  )
  expect(toolRead.status).toBe(200)
  const text = string(record(await toolRead.json()).markdown)
  expect(text).toContain(
    `## Pending wake-ups\n\n_Wake-up ${sooner.wakeUp.atUtc}_\n\nFirst job\n\n_Wake-up ${later.wakeUp.atUtc}_\n\nSecond job\n`,
  )
  const cancel = sessionWakeUpPaths.cancel(
    OUTER_ORG,
    OUTER_WORKSPACE,
    sessionId,
    sooner.wakeUp.id,
  )
  const cancelled = await active.request(cancel, {
    method: 'POST',
    headers: { Cookie: active.cookies.ownerCookie },
    body: '{}',
  })
  expect(cancelled.status).toBe(200)
  expect(await cancelled.json()).toMatchObject({
    state: 'cancelled',
    wakeUpId: sooner.wakeUp.id,
  })
  expect(await (await active.request(path)).json()).toMatchObject({
    wakeUps: [later.wakeUp],
  })
  expect(await wakeUpEvents(active)).toContainEqual({
    type: 'session.wake-up-ended',
    sessionId,
    wakeUpId: sooner.wakeUp.id,
    at: sooner.wakeUp.at,
    outcome: {
      kind: 'cancelled',
      source: { kind: 'member', memberId: 'owner' },
    },
  })
  expect(await wakeUpTranscript(active)).toContain(
    `owner cancelled the wake-up for ${sooner.wakeUp.atUtc}`,
  )
})

it('requires a live calling turn for writes and returns 404 for a wake-up of another session', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const input = { text: 'Check the build', delaySeconds: 120 }
  const missing = await active.post(agentWakeUpPaths.schedule, input, null)
  expect(missing.status).toBe(403)
  expect(await missing.json()).toMatchObject({
    error: { code: 'calling_turn_required' },
  })
  const { wakeUp } = await scheduleWakeUp(active, input)
  const list = await getTool(
    active,
    agentWakeUpPaths.list(undefined, active.sourceSessionId),
  )
  expect(list.status).toBe(200)
  expect(await list.json()).toMatchObject({ wakeUps: [wakeUp] })
  const other = await active.createSession()
  const wrong = await active.post(
    agentWakeUpPaths.cancel(undefined, other, wakeUp.id),
    {},
  )
  expect(wrong.status).toBe(404)
  expect(await wrong.json()).toMatchObject({
    error: { code: 'wake_up_not_found' },
  })
  const stale = await active.post(
    agentWakeUpPaths.cancel(undefined, active.sourceSessionId, wakeUp.id),
    {},
    'old-turn',
  )
  expect(stale.status).toBe(403)
  expect(await stale.json()).toMatchObject({
    error: { code: 'calling_turn_required' },
  })
})

it('keeps a real wake-up out of reach after its workspace is outside the calling org', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const sessionId = await active.createSession(
    OTHER_WORKSPACE,
    active.cookies.ownerCookie,
  )
  const runner = await active.connect(OTHER_WORKSPACE, OTHER_TOKEN)
  const turn = await active.start(
    OTHER_WORKSPACE,
    sessionId,
    runner,
    'owner',
    active.cookies.ownerCookie,
  )
  const scheduled = await invokeTool(
    active,
    agentWakeUpPaths.schedule,
    OTHER_TOKEN,
    turn,
    {
      text: 'Private pending work',
      delaySeconds: 120,
    },
  )
  expect(scheduled.status).toBe(200)
  const id = string(record(record(await scheduled.json()).wakeUp).id)
  await active.env.DB.batch([
    active.env.DB.prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('foreign-repository', 'other-org', 999, 'outsider/private', 'main')",
    ),
    active.env.DB.prepare(
      "UPDATE workspaces SET org_id = 'other-org', owner_user_id = 'outsider', repository_id = 'foreign-repository', section_id = NULL WHERE id = ?",
    ).bind(OTHER_WORKSPACE),
  ])
  const list = await getTool(
    active,
    agentWakeUpPaths.list(OTHER_WORKSPACE, sessionId),
  )
  const cancel = await active.post(
    agentWakeUpPaths.cancel(OTHER_WORKSPACE, sessionId, id),
    {},
  )
  for (const reply of [list, cancel]) {
    expect(reply.status).toBe(404)
    expect(await reply.json()).toMatchObject({
      error: { code: 'workspace_not_found' },
    })
  }
})
