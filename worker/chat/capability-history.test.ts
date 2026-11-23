import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { noticeFixture } from './capability-notices.test-support'
import { WORKSPACE_ID } from './harness.test-support'

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

it('keeps note events through history compaction for later delivery', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  const first = await f.start(session.id, 'first')
  await f.finish(first)
  await f.seedNotes(
    [session.id],
    [{ kind: 'pre-approval-removed', names: ['DEPLOY_KEY'] }],
  )
  await f.seedNotes(
    [session.id],
    [{ kind: 'pre-approved', names: ['DEPLOY_KEY'] }],
  )
  const notes = await f.notes(session.id)
  expect(notes).toHaveLength(2)
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    await view.emit({
      type: 'files.snapshot',
      tree: { revision: 1, entries: [] },
    })
    for (let index = 0; index < 3; index++)
      await view.emit({
        type: 'assistant.delta',
        sessionId: session.id,
        turnId: first.turnId,
        messageId: 'compacted',
        text: `Part ${index}`,
      })
    await view.emit({
      type: 'assistant.completed',
      sessionId: session.id,
      turnId: first.turnId,
      messageId: 'compacted',
      text: 'Complete.',
      userMessageIds: [],
    })
    await view.emit({
      type: 'files.snapshot',
      tree: { revision: 2, entries: [] },
    })
  })
  const history = await f.history(session.id)
  expect(
    history.events.filter(({ event }) => event.type === 'assistant.delta'),
  ).toHaveLength(1)
  expect(await f.notes(session.id)).toEqual(notes)
  await f.restart()
  await f.connect(f.runner)
  f.runner.emit({ type: 'runner.ready' })
  await f.drain()
  await f.send(session.id, 'next')
  expect(f.runner.commands.at(-1)).toMatchObject({
    type: 'turn',
    notices: [
      { text: 'Octocat removed the pre-approval of `DEPLOY_KEY`.' },
      { text: 'Octocat pre-approved `DEPLOY_KEY`.' },
    ],
  })
})

it('receipts only notes read by the failed turn and retains gaps in read order across restart', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  const other = await f.createSession()
  const first = await f.start(session.id, 'first')
  const otherTurn = await f.start(other.id, 'other')
  for (const kind of [
    'pre-approval-removed',
    'pre-approved',
    'pre-approval-removed',
  ] as const)
    await f.seedNotes([session.id, other.id], [{ kind, names: ['DEPLOY_KEY'] }])
  const notes = await f.waitingNotes(session.id)
  const failed = (turn: typeof first, noticeIds: readonly string[]) => ({
    type: 'turn.failed' as const,
    sessionId: turn.sessionId,
    turnId: turn.turnId,
    retryMessageId: turn.message.id,
    durationMs: 0,
    error: { code: 'failed', message: 'Failed.' },
    noticeIds,
  })
  f.runner.emit(
    failed(
      otherTurn,
      notes.map((note) => note.id),
    ),
  )
  await f.drain()
  expect(await f.waitingNotes(session.id)).toHaveLength(3)
  f.runner.emit(failed(first, ['unknown-note', notes[1].id]))
  await f.drain()
  expect((await f.waitingNotes(session.id)).map((note) => note.id)).toEqual([
    notes[0].id,
    notes[2].id,
  ])
  await f.restart()
  await f.connect(f.runner)
  f.runner.emit({ type: 'runner.ready' })
  await f.drain()
  await f.send(session.id, 'next')
  const next = f.runner.commands.at(-1)
  if (next?.type !== 'turn') throw new Error('The next turn is missing.')
  expect(next.notices?.map((note) => note.id)).toEqual([
    notes[0].id,
    notes[2].id,
  ])
  f.runner.emit(failed(first, [notes[0].id, notes[2].id]))
  await f.drain()
  expect(await f.waitingNotes(session.id)).toHaveLength(2)
  await f.finish(next, [notes[0].id, notes[2].id])
  expect(await f.waitingNotes(session.id)).toEqual([])
  await f.seedNotes(
    [session.id, other.id],
    [{ kind: 'pre-approved', names: ['DEPLOY_KEY'] }],
  )
  expect(await f.waitingNotes(session.id)).toHaveLength(1)
  expect(await f.notes(session.id)).toHaveLength(4)
})
