import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { noticeFixture } from './capability-notices.test-support'
import { capabilitySecret } from './capability-context.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { chatKey } from './storage-keys'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it.each(['running', 'finished'] as const)(
  'delivers later notes to a legacy session with a %s turn',
  async (state) => {
    const f = await noticeFixture(harness)
    const session = await f.createSession()
    await f.changeWorkspace(WORKSPACE_ID, async (view) => {
      await view.saveTurn({
        id: 'legacy-turn',
        sessionId: session.id,
        senderId: f.owner.id,
        messageIds: ['legacy-message'],
        state,
        closeAfterStop: false,
      })
      await view.saveMessage({
        id: 'legacy-message',
        sessionId: session.id,
        sender: {
          id: f.owner.id,
          githubLogin: 'octocat',
          displayName: 'Octocat',
          avatarUrl: null,
        },
        text: 'Earlier work.',
        attachments: [],
        choice: session.choice,
        createdAt: view.now,
        state: 'sent',
      })
      session.activeTurnId = state === 'running' ? 'legacy-turn' : null
      await view.saveSession(session)
    })
    await f.seedNotes(
      [session.id],
      [{ kind: 'pre-approval-removed', names: ['DEPLOY_KEY'] }],
    )
    expect(await f.notes(session.id)).toHaveLength(1)
    if (state === 'finished') await f.send(session.id, 'next')
    expect(f.runner.commands.at(-1)).toMatchObject({
      type: state === 'running' ? 'notice' : 'turn',
      sessionId: session.id,
      notices: [{ text: 'Octocat removed the pre-approval of `DEPLOY_KEY`.' }],
    })
  },
)

it('refreshes first-turn facts without a note after a failed first send', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  await f.setSendRule({ type: 'turn', error: 'First send failed.' })
  await f.send(session.id, 'first')
  const turn = await f.chat.readWorkspace(WORKSPACE_ID, async (view) =>
    view.turn((await view.session(session.id))?.activeTurnId ?? ''),
  )
  expect(turn).toMatchObject({ state: 'queued', started: false })
  const secret = await capabilitySecret(f, 'DEPLOY_KEY')
  await f.patch({ preapprovedSecretIds: [secret.id] })
  expect(await f.notes(session.id)).toEqual([])
  expect(await f.waitingNotes(session.id)).toEqual([])
  await f.setSendRule(null)
  const runner = await f.connect(
    new FakeRunner({
      workspaceId: WORKSPACE_ID,
      streamId: 'retry',
      capabilityNotices: true,
    }),
  )
  runner.emit({ type: 'runner.ready' })
  await f.drain()
  expect(runner.commands).toHaveLength(1)
  expect(runner.commands[0]).toMatchObject({
    type: 'turn',
    capabilities: { secrets: ['DEPLOY_KEY'] },
  })
  expect(runner.commands[0]).not.toHaveProperty('notices')
})

it.each(['ended', 'missing'] as const)(
  'delivers unread notes after a previous Worker leaves their turn %s',
  async (state) => {
    const f = await noticeFixture(harness)
    const session = await f.createSession()
    const first = await f.start(session.id, 'first')
    await f.seedNotes(
      [session.id],
      [{ kind: 'pre-approval-removed', names: ['DEPLOY_KEY'] }],
    )
    const notice = f.runner.commands.at(-1)
    if (notice?.type !== 'notice') throw new Error('The notice is missing.')
    const turn = await f.chat.readWorkspace(WORKSPACE_ID, (view) =>
      view.turn(first.turnId),
    )
    if (!turn) throw new Error('The turn is missing.')
    if (state === 'missing')
      await f.storage.delete(chatKey('turn', first.turnId))
    else
      await f.storage.put(chatKey('turn', first.turnId), {
        ...turn,
        state: 'finished',
      })
    await f.restart()
    expect(await f.waitingNotes(session.id)).toMatchObject([
      { id: notice.notices[0].id, sentTurnId: null },
    ])
    await f.changeWorkspace(WORKSPACE_ID, async (view) => {
      const saved = await view.session(session.id)
      if (!saved) throw new Error('The session is missing.')
      saved.activeTurnId = null
      await view.saveSession(saved)
    })
    const runner = await f.connect(
      new FakeRunner({
        workspaceId: WORKSPACE_ID,
        streamId: 'recovered',
        capabilityNotices: true,
      }),
    )
    runner.emit({ type: 'runner.ready' })
    await f.drain()
    await f.send(session.id, 'next')
    expect(runner.commands.at(-1)).toMatchObject({
      type: 'turn',
      notices: notice.notices,
    })
  },
)
