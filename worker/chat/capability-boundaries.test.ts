import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { noticeFixture } from './capability-notices.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { parseRunnerTransport } from './runner-input'
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

it('holds a change between turn preparation and runner start and then sends it once', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  await f.send(session.id, 'first')
  const turn = f.runner.commands.at(-1)
  if (turn?.type !== 'turn') throw new Error('The turn is missing.')
  await f.patch({ macAccess: false })
  await f.patch({ macAccess: true })
  expect(
    f.runner.commands.filter((command) => command.type === 'notice'),
  ).toEqual([])
  expect(
    (await f.waitingNotes(session.id)).map((note) => note.sentTurnId),
  ).toEqual([null, null])
  await f.acknowledgeStart(turn)
  const notice = f.runner.commands.at(-1)
  if (notice?.type !== 'notice') throw new Error('The notice is missing.')
  expect(notice.notices).toHaveLength(2)
  f.runner.emit({
    type: 'assistant.completed',
    sessionId: session.id,
    turnId: turn.turnId,
    messageId: 'partial',
    text: 'Ready.',
    userMessageIds: ['first'],
    noticeIds: [notice.notices[0].id],
  })
  await f.drain()
  const replacement = await f.connect(
    new FakeRunner({
      workspaceId: WORKSPACE_ID,
      streamId: 'replacement',
      capabilityNotices: true,
    }),
  )
  replacement.emit({ type: 'runner.ready' })
  await f.drain()
  expect(replacement.commands).toEqual([
    { ...notice, notices: [notice.notices[1]] },
  ])
  replacement.emit({
    type: 'turn.completed',
    sessionId: session.id,
    turnId: turn.turnId,
    state: 'finished',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['first'],
    noticeIds: [notice.notices[1].id],
  })
  await f.drain()
  expect(await f.waitingNotes(session.id)).toEqual([])
  expect(await f.notes(session.id)).toHaveLength(2)
})

it('ignores a receipt for a different session or a previous turn', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  const other = await f.createSession()
  const first = await f.start(session.id, 'first')
  const otherTurn = await f.start(other.id, 'other')
  await f.patch({ macAccess: false })
  const notes = await f.waitingNotes(session.id)
  expect(notes).toHaveLength(1)
  await f.finish(otherTurn, [notes[0].id])
  expect(await f.waitingNotes(session.id)).toHaveLength(1)
  await f.finish(first)
  await f.send(session.id, 'second')
  const second = f.runner.commands.at(-1)
  if (second?.type !== 'turn') throw new Error('The next turn is missing.')
  f.runner.emit({
    type: 'assistant.completed',
    sessionId: session.id,
    turnId: first.turnId,
    messageId: 'late',
    text: '',
    userMessageIds: ['first'],
    noticeIds: [notes[0].id],
  })
  await f.drain()
  expect(await f.waitingNotes(session.id)).toMatchObject([
    { id: notes[0].id, sentTurnId: second.turnId },
  ])
  await f.acknowledgeStart(second, [notes[0].id])
  expect(await f.waitingNotes(session.id)).toEqual([])
})

it('bounds waiting notes and warns when it drops the oldest note', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  await f.actor.api.controls.captureWarnings(true)
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    for (let index = 0; index < 51; index++)
      await view.capabilityNotes.add({
        id: `note-${index}`,
        sessionId: session.id,
        member: {
          id: f.owner.id,
          githubLogin: 'octocat',
          displayName: 'Octocat',
          avatarUrl: null,
        },
        changes: [{ kind: 'mac-access', on: true }],
        createdAt: index,
        sentTurnId: null,
      })
  })
  const notes = await f.waitingNotes(session.id)
  expect(notes).toHaveLength(50)
  expect(notes[0].id).toBe('note-1')
  expect(notes.at(-1)?.id).toBe('note-50')
  expect((await f.actor.api.controls.warningCalls()).flat()).toContainEqual(
    expect.objectContaining({ kind: 'capability_notes_limited' }),
  )
})

it('accepts only a true capability announcement without refusing older or malformed hellos', () => {
  const hello = {
    type: 'hello',
    protocolVersion: 2,
    workspaceId: WORKSPACE_ID,
    streamId: 'stream',
  }
  expect(
    parseRunnerTransport({ ...hello, capabilityNotices: true }),
  ).toMatchObject({ capabilityNotices: true })
  for (const value of [undefined, false, 'true', 1, null])
    expect(
      parseRunnerTransport({ ...hello, capabilityNotices: value }),
    ).not.toHaveProperty('capabilityNotices')
})
