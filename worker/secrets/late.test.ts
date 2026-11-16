import { afterEach, beforeAll, expect, it } from 'vitest'
import { chatHistoryPath } from '../../src/shared/events'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { record } from '../chat/inputs'
import { array } from '../chat/agent-events'
import { secretFixture, type SecretFixture } from './requests.test-support'

let bundle: string
let f: SecretFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/secrets/requests-entry.test-support.ts',
  )
})
afterEach(async () => {
  await f?.dispose()
  f = undefined
})

it('ends the call at 90 seconds, keeps needs input and delivers a late allow into the running turn', async () => {
  const active = (f = await secretFixture(bundle))
  await active.seed('TOKEN', 'late-value')
  const pending = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  const actor = await active.secretActor()
  expect(await actor.secretAlarm()).toBe(DEVICE_TEST_NOW + 90_000)
  let ended = false
  void pending.response.then(() => {
    ended = true
  })
  await actor.advanceSecretClock(DEVICE_TEST_NOW + 89_999)
  expect((await active.listRequests()).requests[0].state).toBe('waiting')
  expect(ended).toBe(false)
  await actor.advanceSecretClock(DEVICE_TEST_NOW + 90_000)
  expect(await (await pending.response).json()).toEqual({
    status: 'pending',
    requestId: pending.request.id,
    message:
      'The command did not run. The request stays open. A member can answer it later. A message will follow when a member allows it.',
  })
  expect((await active.listRequests()).requests[0]).toMatchObject({
    state: 'late',
    late: true,
  })
  expect(
    await active.env.DB.prepare('SELECT state FROM workspaces WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .first('state'),
  ).toBe('input')
  const answered = await active.answer(pending.request.id, { kind: 'allow' })
  expect(answered.request).toMatchObject({
    state: 'allowed',
    notice: { state: 'sent', turnId: 'first-turn' },
    answeredBy: { id: 'member' },
  })
  expect(await actor.secretTurn('first-turn')).toMatchObject({
    state: 'running',
    senderId: 'owner',
  })
  const history = record(
    await (
      await active.request(
        chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, 'first-session'),
      )
    ).json(),
  )
  const events = array(history.events, (item) => record(record(item).event))
  expect(events).toContainEqual({
    type: 'secrets.notice',
    sessionId: 'first-session',
    turnId: 'first-turn',
    requestId: pending.request.id,
    text: 'member allowed TOKEN for this session.',
  })
  expect(JSON.stringify(events)).not.toContain('late-value')
})

it('turns an unfinished request late at turn end and starts its notice for the original sender', async () => {
  const active = (f = await secretFixture(bundle))
  const pending = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.finish()
  expect((await active.listRequests()).requests[0].state).toBe('late')
  expect(await (await pending.response).json()).toMatchObject({
    status: 'pending',
  })
  const answered = await active.answer(pending.request.id, {
    kind: 'values',
    lifetime: 'workspace',
    values: { TOKEN: 'late-workspace-value' },
  })
  if (answered.request.notice?.state !== 'sent')
    throw new Error('The notice did not start a turn.')
  expect(answered.request.notice.turnId).not.toBe('first-turn')
  expect(
    await (
      await active.secretActor()
    ).secretTurn(answered.request.notice.turnId),
  ).toMatchObject({
    senderId: 'owner',
    sessionId: 'first-session',
    state: 'running',
  })
  for (;;) {
    const command = record(await active.runner.inbox.next())
    if (command.type !== 'turn') continue
    expect(record(command.message).text).toBe(
      'member gave TOKEN for this workspace.',
    )
    break
  }
})

it('sends no message for a late denial', async () => {
  const active = (f = await secretFixture(bundle))
  const pending = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.finish()
  await active.listRequests()
  expect(await (await pending.response).json()).toMatchObject({
    status: 'pending',
  })
  const answered = await active.answer(pending.request.id, { kind: 'deny' })
  expect(answered.request).toMatchObject({ state: 'denied', notice: null })
  const history = record(
    await (
      await active.request(
        chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, 'first-session'),
      )
    ).json(),
  )
  expect(
    array(history.events, (item) => record(record(item).event)).filter(
      (event) => event.type === 'secrets.notice',
    ),
  ).toEqual([])
})

it.each([
  {
    cause: 'login-not-shared',
    sql: "UPDATE agent_logins SET no_reuse = 1 WHERE user_id = 'owner'",
    memberTurn: true,
  },
  {
    cause: 'login-unavailable',
    sql: "DELETE FROM agent_logins WHERE user_id = 'owner'",
    memberTurn: false,
  },
  {
    cause: 'sender-unavailable',
    sql: "DELETE FROM org_members WHERE user_id = 'member'",
    memberTurn: true,
  },
])(
  'keeps the grant without a new session when $cause prevents a late notice',
  async ({ cause, sql, memberTurn }) => {
    const active = (f = await secretFixture(bundle))
    await active.seed('TOKEN', 'fallback-value')
    let turnId = 'first-turn'
    let messageId = 'first-message'
    if (memberTurn) {
      await active.finish()
      const sent = await active.send(
        'first-session',
        'member-message',
        active.cookies.memberCookie,
      )
      if (!sent.session.activeTurnId)
        throw new Error('The member turn is missing.')
      turnId = sent.session.activeTurnId
      messageId = 'member-message'
    }
    const pending = await active.waiting(
      { names: ['TOKEN'], command: 'deploy' },
      turnId,
    )
    await active.finish(turnId, messageId)
    await active.listRequests()
    expect(await (await pending.response).json()).toMatchObject({
      status: 'pending',
    })
    await active.env.DB.prepare(sql).run()
    const answered = await active.answer(
      pending.request.id,
      { kind: 'allow' },
      active.cookies.ownerCookie,
    )
    expect(answered.request.notice).toEqual({
      state: 'not-sent',
      reason: cause,
    })
    expect(
      await active.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM session_secret_approvals',
      ).first('count'),
    ).toBe(1)
    const state = await (await active.secretActor()).secretTurn(turnId)
    expect(state?.state).toBe('finished')
  },
)
