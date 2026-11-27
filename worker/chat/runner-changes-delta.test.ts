import { expect, it } from 'vitest'

import {
  changedRow,
  changesDelta,
  fullChanges,
} from '../files/changes-delta.test-support'
import { markFilesMoved } from '../files/storage'
import { createRunnerLimitsFixture } from './runner-limits.test-support'

const repeated = { path: 'file.txt', index: 0 }
const modified = changedRow(repeated.path)
const upsert = { index: repeated.index, file: modified }

const refusals = [
  { problem: 'a skipped revision', delta: changesDelta({ revision: 3 }) },
  {
    problem: 'an incomplete full list',
    pending: fullChanges({ revision: 2, partCount: 2 }),
    delta: changesDelta(),
  },
  {
    problem: 'a remove of an absent row',
    delta: changesDelta({ removes: ['missing.txt'] }),
  },
  {
    problem: 'out-of-order upserts',
    delta: changesDelta({
      upserts: [{ index: 1, file: changedRow('new.txt') }, upsert],
      summary: { files: 2, added: 2, removed: 0 },
    }),
  },
  {
    problem: 'an index outside the new list',
    delta: changesDelta({ upserts: [{ ...upsert, index: 1 }] }),
  },
  {
    problem: 'the same path in two operations',
    delta: changesDelta({ removes: [modified.path], upserts: [upsert] }),
  },
  {
    problem: 'an incorrect summary',
    delta: changesDelta({ summary: { files: 1, added: 0, removed: 0 } }),
  },
]

it.each(refusals)(
  'requests a full changes list after $problem',
  async ({ pending, delta }) => {
    const fixture = await createRunnerLimitsFixture()
    await fixture.receive(1, fullChanges())
    if (pending) await fixture.receive(2, pending)
    const eventNumber = pending ? 3 : 2
    await fixture.receive(eventNumber, delta)

    expect(fixture.sent.slice(-2)).toEqual([
      {
        type: 'report.refresh',
        commandId: expect.any(String),
        kind: 'changes.updated',
      },
      { type: 'confirm', streamId: 'stream', throughEventNumber: eventNumber },
    ])
    expect(fixture.published.at(-1)?.event).toEqual({
      type: 'runner.event-refused',
      streamId: 'stream',
      runnerEventNumber: eventNumber,
      runnerEventType: 'changes.changed',
      reason: 'invalid',
      sessionId: null,
      turnId: null,
    })
    await expect(
      fixture.actor.api.controls.fileProjection('changes'),
    ).resolves.toMatchObject({
      revision: 1,
      files: [modified],
    })
  },
)

it('keeps a changes repair open through deltas and ends it at the full replacement', async () => {
  const fixture = await createRunnerLimitsFixture()
  const repair = () =>
    fixture.read((view) => view.repairs.get('changes.updated'))
  await fixture.receive(1, fullChanges())
  await fixture.receive(2, changesDelta({ revision: 3 }))
  const pending = await repair()
  expect(pending).toMatchObject({
    state: 'pending',
    command: { type: 'report.refresh', kind: 'changes.updated' },
  })
  await fixture.receive(3, changesDelta())
  expect(fixture.published.at(-1)?.event.type).toBe('changes.changed')
  await fixture.receive(4, changesDelta({ revision: 4 }))
  expect(fixture.published.at(-1)?.event).toMatchObject({
    type: 'runner.event-refused',
    runnerEventType: 'changes.changed',
  })
  expect(fixture.published.at(-1)?.event).not.toHaveProperty('repairFailed')
  expect(await repair()).toEqual(pending)
  expect(
    fixture.sent.filter(({ type }) => type === 'report.refresh'),
  ).toHaveLength(1)

  await fixture.receive(5, fullChanges({ revision: 3, files: [] }))
  expect(await repair()).toMatchObject({ state: 'failed' })
  await fixture.receive(6, changesDelta({ revision: 3 }))
  expect(fixture.published.at(-1)?.event.type).toBe('changes.changed')
  expect(await repair()).toMatchObject({ state: 'failed' })
  await fixture.receive(7, fullChanges({ revision: 4 }))
  expect(await repair()).toBeUndefined()
})

it('requests a full list after a repository move and keeps the runner stream open', async () => {
  const fixture = await createRunnerLimitsFixture()
  await fixture.receive(1, fullChanges())
  await fixture.store.change(
    'workspace',
    (view) => markFilesMoved(view.files),
    () => undefined,
  )
  await fixture.receive(2, changesDelta())
  expect(fixture.sent.slice(-2)).toEqual([
    {
      type: 'report.refresh',
      commandId: expect.any(String),
      kind: 'changes.updated',
    },
    { type: 'confirm', streamId: 'stream', throughEventNumber: 2 },
  ])
  expect(fixture.published.at(-1)?.event).toMatchObject({
    type: 'runner.event-refused',
    reason: 'invalid',
    runnerEventType: 'changes.changed',
  })
  await expect(
    fixture.actor.api.controls.fileProjection('changes'),
  ).resolves.toBeNull()

  const next = changedRow('new-repository.txt')
  await fixture.receive(3, fullChanges({ revision: 3, files: [next] }))
  expect(fixture.sent.at(-1)).toEqual({
    type: 'confirm',
    streamId: 'stream',
    throughEventNumber: 3,
  })
  await expect(
    fixture.actor.api.controls.fileProjection('changes'),
  ).resolves.toMatchObject({
    revision: 3,
    files: [next],
  })
})

it('applies deltas from the runner outbox after a reconnect with deltas off', async () => {
  const fixture = await createRunnerLimitsFixture()
  await fixture.configure({ environment: { CHANGES_DELTAS: 'on' } })
  await fixture.connect('stream', false)
  expect(fixture.sent.at(-1)).toMatchObject({ type: 'welcome' })
  expect(fixture.sent.at(-1)).not.toHaveProperty('changesDeltas')
  await fixture.connect('stream', false, 'true')
  expect(fixture.sent.at(-1)).toMatchObject({ type: 'welcome' })
  expect(fixture.sent.at(-1)).not.toHaveProperty('changesDeltas')
  await fixture.connect('stream', false, true)
  expect(fixture.sent.at(-1)).toMatchObject({
    type: 'welcome',
    changesDeltas: true,
  })
  await fixture.receive(1, fullChanges())

  const outbox = [changesDelta(), changesDelta({ revision: 3 })]
  await fixture.failCursorCommit(2)
  await expect(fixture.receive(2, outbox[0])).rejects.toThrow(
    'Injected storage failure',
  )
  await fixture.clearFaults()
  await fixture.configure({ environment: { CHANGES_DELTAS: 'off' } })
  await fixture.connect('stream', true, true)
  expect(fixture.sent.at(-1)).toEqual({
    type: 'welcome',
    protocolVersion: 2,
    streamId: 'stream',
    confirmedThrough: 1,
  })
  for (const [index, event] of outbox.entries())
    await fixture.receive(index + 2, event)
  expect(fixture.published.slice(-2).map(({ event }) => event)).toEqual(outbox)
  expect(fixture.sent.at(-1)).toEqual({
    type: 'confirm',
    streamId: 'stream',
    throughEventNumber: 3,
  })
  await expect(
    fixture.actor.api.controls.fileProjection('changes'),
  ).resolves.toMatchObject({
    revision: 3,
    files: [modified],
  })
})
