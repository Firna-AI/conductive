import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { capabilitySecret } from './capability-context.test-support'
import { noticeFixture } from './capability-notices.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { sessionPaths } from '../../src/shared/sessions'
import { FakeRunner } from '../test-support/fake-runner'

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

it('steers only a started session and acknowledges the note without a member message', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  const empty = await f.createSession()
  const turn = await f.start(session.id, 'first')
  const secret = await capabilitySecret(f, 'DEPLOY_KEY')
  await f.seedNotes(
    [session.id],
    [{ kind: 'pre-approved', names: ['DEPLOY_KEY'] }],
  )
  expect(await f.notes(session.id)).toHaveLength(1)
  expect(await f.notes(empty.id)).toEqual([])
  expect(f.runner.commands.at(-1)).toMatchObject({
    type: 'notice',
    sessionId: session.id,
    turnId: turn.turnId,
    notices: [{ text: 'Octocat pre-approved `DEPLOY_KEY`.' }],
  })
  const notice = f.runner.commands.at(-1)
  if (notice?.type !== 'notice') throw new Error('The notice is missing.')
  const serialized = JSON.stringify([notice, await f.notes(session.id)])
  for (const privateText of [
    secret.value,
    secret.ciphertext,
    secret.description,
  ])
    expect(serialized).not.toContain(privateText)
  f.runner.emit({
    type: 'assistant.completed',
    sessionId: session.id,
    turnId: turn.turnId,
    messageId: 'answer',
    text: 'Ready.',
    userMessageIds: ['first'],
    noticeIds: ['unknown-note', ...notice.notices.map((line) => line.id)],
  })
  await f.drain()
  expect(await f.waitingNotes(session.id)).toEqual([])
  expect(
    await f.chat.readWorkspace(WORKSPACE_ID, (view) => view.pending()),
  ).toEqual([])
  const history = (await f.history(session.id)).events
  expect(
    history.filter(({ event }) => event.type === 'message.accepted'),
  ).toHaveLength(1)
  expect(
    history.filter(({ event }) => event.type === 'turn.started'),
  ).toHaveLength(1)
})

it('keeps idle notes in order and retries unread notes before the next message', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  const first = await f.start(session.id, 'first')
  await f.finish(first)
  const count = f.runner.commands.length
  await f.seedNotes(
    [session.id],
    [{ kind: 'pre-approval-removed', names: ['DEPLOY_KEY'] }],
  )
  await f.seedNotes(
    [session.id],
    [{ kind: 'pre-approved', names: ['NEXT_KEY'] }],
  )
  expect(f.runner.commands).toHaveLength(count)
  const notes = await f.waitingNotes(session.id)
  expect(notes.map((note) => note.sentTurnId)).toEqual([null, null])
  await f.send(session.id, 'second')
  const second = f.runner.commands.at(-1)
  if (second?.type !== 'turn') throw new Error('The next turn is missing.')
  expect(second.notices).toEqual([
    {
      id: notes[0].id,
      text: 'Octocat removed the pre-approval of `DEPLOY_KEY`.',
    },
    { id: notes[1].id, text: 'Octocat pre-approved `NEXT_KEY`.' },
  ])
  await f.acknowledgeStart(second)
  await f.answer(second, [notes[0].id])
  await f.finish(second)
  expect(await f.waitingNotes(session.id)).toMatchObject([
    { id: notes[1].id, sentTurnId: null },
  ])
  await f.send(session.id, 'third')
  const third = f.runner.commands.at(-1)
  if (third?.type !== 'turn') throw new Error('The retry turn is missing.')
  expect(third.notices?.map((note) => note.id)).toEqual([notes[1].id])
  await f.answer(third, [notes[1].id])
  expect(await f.waitingNotes(session.id)).toEqual([])
  expect(await f.notes(session.id)).toHaveLength(2)
})

it('keeps notes across session close and object restart until a capable runner returns', async () => {
  const f = await noticeFixture(harness, false)
  const session = await f.createSession()
  const first = await f.start(session.id, 'first')
  await f.seedNotes(
    [session.id],
    [{ kind: 'pre-approval-removed', names: ['DEPLOY_KEY'] }],
  )
  expect(f.runner.commands.some((command) => command.type === 'notice')).toBe(
    false,
  )
  await f.finish(first)
  await f.send(session.id, 'old-next')
  const old = f.runner.commands.at(-1)
  if (old?.type !== 'turn') throw new Error('The old runner turn is missing.')
  expect(old).not.toHaveProperty('notices')
  await f.finish(old)
  expect(
    (
      await f.fetch(sessionPaths.close(f.org.id, WORKSPACE_ID, session.id), {
        stopRunningTurn: false,
      })
    ).status,
  ).toBe(200)
  await f.seedNotes(
    [session.id],
    [{ kind: 'pre-approved', names: ['DEPLOY_KEY'] }],
  )
  expect(await f.waitingNotes(session.id)).toHaveLength(2)
  await f.restart()
  const current = await f.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, capabilityNotices: true }),
  )
  expect(
    (await f.fetch(sessionPaths.reopen(f.org.id, WORKSPACE_ID, session.id), {}))
      .status,
  ).toBe(200)
  await f.send(session.id, 'reopened')
  const reopened = current.commands.at(-1)
  expect(reopened).toMatchObject({
    type: 'turn',
    notices: [
      { text: 'Octocat removed the pre-approval of `DEPLOY_KEY`.' },
      { text: 'Octocat pre-approved `DEPLOY_KEY`.' },
    ],
  })
  expect(await f.notes(session.id)).toHaveLength(2)
})

it('resends a pending notice after reconnect and returns it to waiting after a failed or stopped turn', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  const first = await f.start(session.id, 'first')
  await f.seedNotes(
    [session.id],
    [{ kind: 'pre-approval-removed', names: ['DEPLOY_KEY'] }],
  )
  const notice = f.runner.commands.at(-1)
  expect(notice?.type).toBe('notice')
  if (notice?.type !== 'notice') throw new Error('The notice is missing.')
  const replacement = await f.connect(
    new FakeRunner({
      workspaceId: WORKSPACE_ID,
      streamId: 'replacement-stream',
      capabilityNotices: true,
    }),
  )
  replacement.emit({ type: 'runner.ready' })
  await f.drain()
  expect(replacement.commands).toEqual([notice])
  replacement.emit({
    type: 'turn.failed',
    sessionId: session.id,
    turnId: first.turnId,
    retryMessageId: 'first',
    durationMs: 0,
    error: { code: 'failed', message: 'Failed.' },
  })
  await f.drain()
  expect(await f.waitingNotes(session.id)).toMatchObject([
    { id: notice.notices[0].id, sentTurnId: null },
  ])
  await f.send(session.id, 'after-failure')
  const next = replacement.commands.at(-1)
  if (next?.type !== 'turn') throw new Error('The next turn is missing.')
  expect(next.notices).toEqual(notice.notices)
  replacement.emit({
    type: 'turn.completed',
    sessionId: session.id,
    turnId: next.turnId,
    state: 'stopped',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['after-failure'],
  })
  await f.drain()
  expect(await f.waitingNotes(session.id)).toMatchObject([
    { id: notice.notices[0].id, sentTurnId: null },
  ])
})
