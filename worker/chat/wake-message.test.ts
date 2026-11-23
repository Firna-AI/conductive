import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { saveUser } from '../data/users'
import { requireFeatureResult } from '../features/result'
import { seedMember } from '../test-support/d1-seeds'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { watchFixture, type WatchFixture } from './session-watch.test-support'
import { messageCommands, startTurn } from './turn-lifecycle.test-support'

let harness: TestHarness
let f: WatchFixture
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  f = await watchFixture(harness, true)
})
afterAll(async () => {
  await harness.dispose()
})

async function schedule() {
  return requireFeatureResult(
    await f.actor.rpc.scheduleAgentWakeUp(
      f.org.id,
      WORKSPACE_ID,
      f.calling.turnId,
      { at: f.clock.now(), text: 'Check the result' },
    ),
  ).wakeUp.id
}

async function wakeNotice() {
  const history = await f.history(f.source.id)
  const notice = history.events
    .map(({ event }) => event)
    .find(
      (event) =>
        event.type === 'session.wake-up-fired' ||
        event.type === 'session.watch-notice',
    )
  if (!notice) throw new Error('The wake line is missing.')
  return notice
}

it.each(['scheduled wake-up', 'watch wake'] as const)(
  'preserves a member message and its turn when a %s uses its former derived ID',
  async (kind) => {
    const other = await f.createSession()
    const watch = kind === 'watch wake'
    const oldId = watch
      ? `session-watch:${f.watch.watchId}`
      : `session-wake-up:${await schedule()}`
    await f.send(other.id, oldId)
    const storedMessage = () =>
      f.chat.store.read(WORKSPACE_ID, async (view) => ({
        message: await view.message(oldId),
        turnId: await view.messageTurn(oldId),
      }))
    const original = await storedMessage()
    expect(original).toMatchObject({
      message: {
        id: oldId,
        sessionId: other.id,
        sender: { id: f.owner.id },
      },
      turnId: expect.any(String),
    })
    if (watch) await f.finishTarget('finished')
    await f.fire()

    expect(await storedMessage()).toEqual(original)
    const delivered = await wakeNotice()
    expect(delivered.messageId).not.toBe(oldId)
    expect(messageCommands(f.runner, delivered.messageId)).toMatchObject([
      {
        type: 'message',
        turnId: f.calling.turnId,
        message: { id: delivered.messageId, sessionId: f.source.id },
      },
    ])
  },
)

it.each(['scheduled wake-up', 'watch wake', 'late secret answer'] as const)(
  "joins the authorized running turn for a %s and leaves another member's queued turn intact",
  async (kind) => {
    if (kind === 'scheduled wake-up') await schedule()
    await f.finishCaller()
    const running = await startTurn(f, f.runner, f.source.id, 'running-a')
    const db = f.env.DB
    const queuedSender = await saveUser(
      db,
      'queued-member',
      {
        githubId: 91,
        githubLogin: 'queued',
        displayName: 'Queued',
        avatarUrl: null,
        primaryVerifiedEmail: null,
        githubCreatedAt: null,
      },
      f.clock.now(),
    )
    await seedMember(db, {
      orgId: f.org.id,
      userId: queuedSender.id,
      role: 'member',
      joinedAt: f.clock.now(),
    }).run()
    const queuedId = 'queued-turn'
    const queuedMessage = {
      ...running.message,
      id: 'queued-b',
      sender: queuedSender,
      state: 'queued' as const,
    }
    const queued = {
      id: queuedId,
      sessionId: f.source.id,
      senderId: queuedSender.id,
      messageIds: [queuedMessage.id],
      state: 'queued' as const,
      closeAfterStop: false,
      nextTurnId: null,
    }
    const queuedCommand = {
      type: 'turn' as const,
      commandId: 'queued-command',
      sessionId: f.source.id,
      turnId: queuedId,
      messageId: queuedMessage.id,
      attachments: [],
    }
    await f.changeWorkspace(WORKSPACE_ID, async (view) => {
      const active = await view.turn(running.turnId)
      if (!active) throw new Error('The running turn is missing.')
      await view.saveTurn({ ...active, nextTurnId: queuedId })
      await view.saveTurn(queued)
      await view.saveNewestTurn(f.source.id, queuedId)
      await view.saveMessage(queuedMessage)
      await view.saveMessageTurn(queuedMessage.id, queuedId)
      await view.saveCommand(queuedCommand)
    })

    let delivery: { turnId: string; messageId: string }
    if (kind === 'late secret answer') {
      const requestId = 'late-secret-request'
      const notice = await f.chat.runLifecycle(async () => {
        const notice = await f.chat.secretNotice({
          orgId: f.org.id,
          names: ['TOKEN'],
          tokenHash: 'unused-test-hash',
          lateAnswer: true,
          request: {
            id: requestId,
            workspaceId: WORKSPACE_ID,
            sessionId: f.source.id,
            turnId: f.calling.turnId,
            sender: f.calling.message.sender,
            secrets: [{ name: 'TOKEN', secretId: null, description: 'Token' }],
            command: 'check',
            reason: 'Check the result',
            state: 'allowed',
            late: true,
            createdAt: f.clock.now(),
            updatedAt: f.clock.now(),
            answeredBy: running.message.sender,
            lifetime: 'workspace',
            endedBy: null,
            notice: null,
          },
        })
        await f.chat.flushRunner()
        return notice
      })
      if (notice.state !== 'sent')
        throw new Error('The late answer was not sent.')
      delivery = {
        turnId: notice.turnId,
        messageId: `secret-notice:${requestId}`,
      }
      await f.drain()
    } else {
      if (kind === 'watch wake') await f.finishTarget('finished')
      await f.fire()
      delivery = await wakeNotice()
    }

    expect(delivery.turnId).toBe(running.turnId)
    expect(messageCommands(f.runner, delivery.messageId)).toMatchObject([
      {
        type: 'message',
        turnId: running.turnId,
        message: { sender: { id: f.owner.id } },
      },
    ])
    expect(
      await f.chat.store.read(WORKSPACE_ID, async (view) => ({
        queued: await view.turn(queuedId),
        newest: await view.newestTurn(f.source.id),
        pending: (await view.pending()).filter(
          ({ commandId }) => commandId === queuedCommand.commandId,
        ),
        next: (await view.turn(running.turnId))?.nextTurnId,
        destination: await view.messageTurn(delivery.messageId),
      })),
    ).toEqual({
      queued,
      newest: queuedId,
      pending: [queuedCommand],
      next: queuedId,
      destination: running.turnId,
    })
  },
)
