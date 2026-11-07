import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { FakeRunner } from '../test-support/fake-runner'
import { FilesState } from '../files/state'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { chatFilesStorage } from './files-storage'
import {
  fullReport,
  oversizedReport,
  refreshCommands,
  refusedEvents,
  workspaceEvents,
} from './runner-repairs.test-support'

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

it('keeps deltas, old tails, and partial or repeated full reports from resolving a tree repair', async () => {
  const fixture = await createChatFixture(harness)
  const runner = await fixture.connect()
  runner.emit(fullReport('files.snapshot'))
  runner.emit(fullReport('changes.updated'))
  runner.emit(oversizedReport('files.snapshot', 3, 1, 2))
  await fixture.drain()
  const request = refreshCommands(runner)[0]
  expect(request).toMatchObject({
    type: 'report.refresh',
    kind: 'files.snapshot',
  })
  runner.emit(fullReport('files.snapshot', 3, 2, 2))
  runner.emit({ type: 'files.changed', delta: { revision: 2, changes: [] } })
  runner.emit(fullReport('files.snapshot', 4, 1, 2))
  runner.emit(fullReport('files.snapshot', 4, 1, 2))
  await fixture.drain()
  expect(
    (await refusedEvents(fixture)).map((event) => event.repairFailed),
  ).toEqual([undefined, undefined])
  expect(refreshCommands(runner)).toEqual([request])
  fixture.restart()
  await fixture.connect(runner)
  expect(refreshCommands(runner)).toEqual([request, request])
  runner.emit(
    Object.assign(oversizedReport('files.snapshot', 4, 2, 2), {
      tree: { partNumber: 2, partCount: 2 },
    }),
  )
  await fixture.drain()
  expect((await refusedEvents(fixture)).at(-1)).toMatchObject({
    runnerEventType: 'files.snapshot',
    repairFailed: true,
  })
  expect(
    (await workspaceEvents(fixture)).filter(
      (event) => event.type === 'files.snapshot',
    ),
  ).toHaveLength(1)
  const files = new FilesState(chatFilesStorage(fixture.storage))
  expect(await files.tree()).toEqual({
    revision: 2,
    entries: [{ path: 'file-1', name: 'file-1', kind: 'file', change: null }],
  })
  await fixture.connect(runner)
  expect(refreshCommands(runner)).toEqual([request, request])
  runner.emit(fullReport('files.snapshot', 5))
  runner.emit({ type: 'files.changed', delta: { revision: 7, changes: [] } })
  await fixture.drain()
  const later = refreshCommands(runner)[2]
  expect(later).toMatchObject({
    type: 'report.refresh',
    kind: 'files.snapshot',
  })
  expect(later?.commandId).not.toBe(request?.commandId)
  runner.emit(fullReport('files.snapshot', 5))
  runner.emit(oversizedReport('files.snapshot', 6))
  await fixture.drain()
  expect((await refusedEvents(fixture)).at(-1)).toMatchObject({
    repairFailed: true,
  })
  expect(refreshCommands(runner)).toEqual([request, request, later])
})

it('treats a full replacement from a new stream as a repair without joining old parts', async () => {
  const fixture = await createChatFixture(harness)
  const first = await fixture.connect()
  first.emit(oversizedReport('changes.updated', 5))
  await fixture.drain()
  const request = refreshCommands(first)[0]
  expect(request).toMatchObject({ kind: 'changes.updated' })
  const second = await fixture.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, streamId: 'second' }),
  )
  expect(refreshCommands(second)).toEqual([request])
  second.emit(oversizedReport('changes.updated'))
  await fixture.drain()
  expect((await refusedEvents(fixture)).at(-1)).toMatchObject({
    streamId: 'second',
    repairFailed: true,
  })
  await fixture.connect(second)
  expect(refreshCommands(second)).toEqual([request])
  second.emit(fullReport('changes.updated', 2, 1, 2))
  await fixture.drain()
  second.emit(fullReport('changes.updated', 2, 2, 2))
  await fixture.drain()
  second.emit(oversizedReport('changes.updated', 3))
  await fixture.drain()
  expect(refreshCommands(second)).toHaveLength(2)
  expect((await refusedEvents(fixture)).at(-1)?.repairFailed).toBeUndefined()
})

it('marks a malformed requested report as a failed repair when its generation is unavailable', async () => {
  const fixture = await createChatFixture(harness)
  const runner = await fixture.connect()
  runner.emit(oversizedReport('files.snapshot'))
  await fixture.drain()
  runner.emit(Object.assign(fullReport('files.snapshot', 2), { tree: {} }))
  await fixture.drain()
  expect((await refusedEvents(fixture)).slice(1)).toEqual([
    {
      type: 'runner.event-refused',
      streamId: 'fake-stream-1',
      runnerEventNumber: 2,
      runnerEventType: 'files.snapshot',
      reason: 'invalid',
      sessionId: null,
      turnId: null,
      repairFailed: true,
    },
  ])
  expect(refreshCommands(runner)).toHaveLength(1)
})

it('recognizes an accepted new part one at the refused unapplied revision after restart', async () => {
  const fixture = await createChatFixture(harness)
  const runner = await fixture.connect()
  runner.emit(fullReport('files.snapshot'))
  runner.emit(fullReport('files.snapshot', 2, 1, 2))
  runner.emit(oversizedReport('files.snapshot', 2, 2, 2))
  await fixture.drain()
  const request = refreshCommands(runner)[0]
  runner.emit(fullReport('files.snapshot', 2, 2, 2))
  await fixture.drain()
  expect(
    (await refusedEvents(fixture)).map((event) => event.repairFailed),
  ).toEqual([undefined, undefined])
  runner.emit(fullReport('files.snapshot', 2, 1, 2))
  await fixture.drain()
  fixture.restart()
  await fixture.connect(runner)
  runner.emit(oversizedReport('files.snapshot', 2, 2, 2))
  await fixture.drain()
  expect((await refusedEvents(fixture)).at(-1)).toMatchObject({
    repairFailed: true,
  })
  expect(refreshCommands(runner)).toEqual([request, request])
})
