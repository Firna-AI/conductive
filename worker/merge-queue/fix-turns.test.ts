import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { CLAUDE } from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'
import { chatKey } from '../chat/storage-keys'
import { requireFeatureResult } from '../features/result'
import { orgEnvironmentContext } from '../lifecycle/settings-data'
import { recordRunningEnvironment } from '../lifecycle/start-environment'
import { encrypt } from '../security/crypto'
import { fixFixture } from './fix.test-support'
import { hideAgentLogin, queueBundle } from './queue.test-support'

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

it('stores the masked restack label and uses a numbered pull request ref', async () => {
  const secret = 'synthetic-queue-secret'
  await recordRunningEnvironment(
    f.db,
    OUTER_WORKSPACE,
    await encrypt(
      JSON.stringify({ KEY: secret }),
      orgEnvironmentContext(OUTER_ORG),
      f.env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  )
  await f.start({ base: `release-${secret}`, basePullNumber: 4 })
  await f.queue.advanceStartAlarm()
  const [message] = await f.messages((await f.restackSession()).id)
  expect(message?.text).not.toContain(secret)
  expect(message?.text).toContain('release-[redacted]')
  expect(message?.text).toContain('git fetch origin refs/pull/4/head')
  expect(message?.text).toContain(
    'git rebase --onto 896a470385279ec0a99c30b956e1b90a64569b45 b8ba8d107d6359017c2537c03d7a2ec48c94d1d9',
  )
})

async function confirm(runner: OuterFakeRunner, eventNumber: number) {
  for (;;) {
    const reply = record(await runner.inbox.next())
    if (reply.type === 'confirm' && reply.throughEventNumber === eventNumber)
      return
  }
}

it('waits for a running turn, then sends one ordinary queuer turn in a new session', async () => {
  const old = await f.session()
  const actor = f.actor()
  const choice = {
    ...CLAUDE,
    model: 'test-claude-new',
    effort: 'medium' as const,
  }
  await f.db
    .prepare(
      `INSERT INTO user_preferences
       (user_id, default_agent, default_model, default_effort, default_fast, updated_at)
       VALUES ('member', 'claude', ?, ?, 1, 1)`,
    )
    .bind(choice.model, choice.effort)
    .run()
  const newest = { ...old, id: 'newest', createdAt: old.createdAt + 1 }
  const closed = {
    ...old,
    id: 'closed',
    createdAt: old.createdAt + 2,
    closedAt: old.createdAt + 3,
  }
  await actor.seedFeatureState({
    [chatKey('session', newest.id)]: newest,
    [chatKey('session', closed.id)]: closed,
  })

  const connected = await requestRunner(f)
  if (!connected.webSocket) throw new Error('The runner socket is missing.')
  try {
    const runner = new OuterFakeRunner(connected.webSocket)
    await runner.inbox.next()
    runner.emit({ type: 'runner.ready' })
    await runner.inbox.next()
    expect(
      (
        await f.post(
          sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, old.id),
          {
            id: 'older-message',
            text: 'Already running',
            choice: CLAUDE,
            attachmentIds: [],
          },
        )
      ).status,
    ).toBe(202)
    const command = record(await runner.inbox.next())
    expect(command.type).toBe('turn')
    const turnId = string(command.turnId)
    const started = runner.emit({
      type: 'turn.started',
      sessionId: old.id,
      turnId,
      senderId: 'owner',
      choice: CLAUDE,
      startedAt: old.createdAt,
      messageIds: ['older-message'],
    })
    await confirm(runner, started.eventNumber)
    const pending = await f.start()
    await f.queue.advanceStartAlarm(old.createdAt + 24 * 60 * 60 * 1000)
    expect(await f.bar()).toMatchObject({
      state: 'waiting',
      wait: 'active-turn',
    })
    const finished = runner.emit({
      type: 'turn.completed',
      sessionId: old.id,
      turnId,
      state: 'finished',
      durationMs: 1,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['older-message'],
    })
    await confirm(runner, finished.eventNumber)
    await f.queue.advanceStartAlarm()
    const sent = await f.start()
    expect(sent.state).toBe('sent')
    if (sent.state !== 'sent') throw new Error('The fix was not sent.')
    const created = await f.restackSession()
    expect([old.id, newest.id, closed.id]).not.toContain(created.id)
    expect(await runner.waitForTurn(sent.turnId)).toMatchObject({
      sessionId: created.id,
      message: { id: pending.messageId, choice, sender: { id: 'member' } },
    })
    expect(await actor.writeMergeQueueFix(pending)).toMatchObject({
      ok: true,
      value: { kind: 'accepted', turnId: sent.turnId },
    })
    expect(await f.messages(newest.id)).toEqual([])
    expect(await f.messages(created.id)).toMatchObject([
      {
        id: pending.messageId,
        sessionId: created.id,
        sender: { id: 'member' },
        choice,
        text: [
          'Pull request #2 is in the merge queue. Fetch `main` with `git fetch origin HEAD`.',
          'Check that `FETCH_HEAD` is at `896a470385279ec0a99c30b956e1b90a64569b45`. If it is at another commit, stop and say so.',
          'Run `git rebase --onto 896a470385279ec0a99c30b956e1b90a64569b45 b8ba8d107d6359017c2537c03d7a2ec48c94d1d9`. Only the commits after the old base move.',
          'Resolve each conflict, run the tests, then push with `git push --force-with-lease --force-if-includes`. If Git refuses the push, stop and report it.',
          'Keep the branch history linear and keep the pull request open.',
        ].join(' '),
      },
    ])
    expect(created).toMatchObject({
      choice,
      closedAt: null,
      login: { type: 'personal', userId: 'member' },
    })
    const fixStarted = runner.emit({
      type: 'turn.started',
      sessionId: created.id,
      turnId: sent.turnId,
      senderId: 'member',
      choice,
      startedAt: created.createdAt,
      messageIds: [pending.messageId],
    })
    await confirm(runner, fixStarted.eventNumber)
    const fixFinished = runner.emit({
      type: 'turn.completed',
      sessionId: created.id,
      turnId: sent.turnId,
      state: 'finished',
      durationMs: 1,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [pending.messageId],
    })
    await confirm(runner, fixFinished.eventNumber)
    await actor.advanceStartAlarm()
    expect(await f.start()).toMatchObject({
      state: 'ended',
      result: { turnId: sent.turnId, state: 'finished' },
    })
    expect(await f.bar()).toMatchObject({ state: 'queued', wait: null })
  } finally {
    await closeSockets(connected.webSocket)
  }
})

it('sends with no open session and waits for a usable queuer login without opening a session', async () => {
  const pending = await f.start()
  const showLogin = await hideAgentLogin(f.db, 'member')
  try {
    await f.queue.advanceStartAlarm()
    expect(await f.bar()).toMatchObject({
      state: 'waiting',
      wait: 'agent-login',
    })
    expect(await f.sessions()).toEqual([])
  } finally {
    await showLogin()
  }
  await f.queue.advanceStartAlarm()
  expect(await f.start()).toMatchObject({
    state: 'sent',
    messageId: pending.messageId,
  })
  const target = await f.restackSession()
  expect(target.login).toEqual({ type: 'personal', userId: 'member' })
  expect(await f.messages(target.id)).toMatchObject([
    { id: pending.messageId, sender: { id: 'member' } },
  ])
})

it('keeps the report after a failure and delivers it after workspace eviction', async () => {
  await f.start()
  await f.queue.advanceStartAlarm()
  const sent = await f.start()
  expect(sent.state).toBe('sent')
  if (sent.state !== 'sent') throw new Error('The fix was not sent.')
  const target = await f.restackSession()
  expect((await f.stop(target.id, sent.turnId)).status).toBe(200)
  await f.db.exec(
    'ALTER TABLE merge_queue_entries RENAME TO hidden_merge_queue_entries',
  )
  try {
    await f.actor().advanceStartAlarm()
  } finally {
    await f.db.exec(
      'ALTER TABLE hidden_merge_queue_entries RENAME TO merge_queue_entries',
    )
  }
  expect(await f.start()).toEqual(sent)
  const before = await f.actor().inspectFeatureConnections()
  const restart = await f.request(
    `/__test/continue-restart?workspace=${encodeURIComponent(OUTER_WORKSPACE)}`,
    { method: 'POST', body: '{}' },
  )
  expect(restart.status).toBe(500)
  await restart.arrayBuffer()
  const after = await f.actor().inspectFeatureConnections()
  expect(after.instance).not.toBe(before.instance)
  await f.actor().advanceStartAlarm()
  const ended = await f.start()
  expect(ended).toMatchObject({
    state: 'ended',
    result: {
      state: 'stopped',
      turnId: sent.turnId,
      messageId: sent.messageId,
    },
  })
  requireFeatureResult(
    await f.queue.reportMergeQueueFix(f.scope, {
      state: 'failed',
      turnId: sent.turnId,
      messageId: sent.messageId,
      endedAt: 1,
    }),
  )
  expect(await f.start()).toEqual(ended)
  expect(await f.actor().readStartAlarm()).toBeNull()
})
