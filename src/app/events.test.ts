import { describe, expect, test } from 'vitest'
import { workspacePaths } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import type { StreamEnvelope } from './api/read-events'
import { WorkspaceStream } from './events'
import { OrgModel } from './org-model'
import {
  flushMicrotasks,
  ManualDelay,
  RecordingEvents,
  testServices,
} from './test-kit'
import { WorkspaceModel } from './workspace-model'

const target = { orgId: 'acme', workspaceId: 'checkout-autocomplete' }

/** One page of a replay whose pages share the cutoff `through`. */
function page(
  events: readonly ReturnType<typeof envelope>[],
  through: number,
  next?: number,
) {
  const history = { events, throughEventNumber: through }
  return {
    type: 'history',
    history:
      next === undefined
        ? history
        : { ...history, hasMore: true, nextAfterEventNumber: next },
  }
}

function envelope(eventNumber: number) {
  return {
    workspaceId: target.workspaceId,
    eventNumber,
    occurredAt: FAKE_TIME,
    event: { type: 'workspace.title', name: `Title ${eventNumber}` },
  }
}

function start(delay = new ManualDelay()) {
  const source = new RecordingEvents()
  const stream = new WorkspaceStream(source, target, delay.delay)
  const seen: number[] = []
  stream.subscribe((item: StreamEnvelope) => seen.push(item.eventNumber))
  stream.start()
  return { source, stream, seen, delay }
}

describe('WorkspaceStream', () => {
  test('a resent event shows once, and a gap reads again after the last number', () => {
    const { source, seen } = start()
    source.send({
      type: 'history',
      history: { events: [envelope(1), envelope(2)], throughEventNumber: 2 },
    })
    source.send({ type: 'event', envelope: envelope(2) })
    source.send({ type: 'event', envelope: envelope(3) })
    source.send({ type: 'event', envelope: envelope(5) })
    expect(seen).toEqual([1, 2, 3])
    expect(source.opened.map((item) => item.afterEventNumber)).toEqual([0, 3])
  })

  test('a dropped connection opens again after the last event number', async () => {
    const { source, seen, delay } = start()
    source.send({
      type: 'history',
      history: { events: [envelope(1)], throughEventNumber: 1 },
    })
    source.drop()
    expect(source.opened).toHaveLength(1)
    await delay.runAll()
    source.send({
      type: 'history',
      history: { events: [envelope(2)], throughEventNumber: 2 },
    })
    expect(source.opened.map((item) => item.afterEventNumber)).toEqual([0, 1])
    expect(seen).toEqual([1, 2])
  })

  test('keeps the late mark of the workspace on an envelope, and only the value true', () => {
    const { source, stream } = start()
    const marks: boolean[] = []
    stream.subscribe((item) => marks.push(item.late))
    source.send({ type: 'event', envelope: { ...envelope(1), late: true } })
    source.send({ type: 'event', envelope: { ...envelope(2), late: 'true' } })
    expect(marks).toEqual([true, false])
  })

  test('keeps the last number until the final page, and then applies the waiting live events in order', async () => {
    const { source, stream, seen } = start()
    const lasts: number[] = []
    stream.last.subscribe(() => lasts.push(stream.last.get()))
    source.send(page([envelope(1), envelope(3)], 10, 4))
    await flushMicrotasks()
    source.send({ type: 'event', envelope: envelope(12) })
    source.send({ type: 'event', envelope: envelope(11) })
    await flushMicrotasks()
    source.send(page([envelope(6)], 10, 8))
    await flushMicrotasks()
    expect(seen).toEqual([1, 3, 6])
    expect(stream.last.get()).toBe(0)
    source.send(page([envelope(10)], 10))
    expect(seen).toEqual([1, 3, 6, 10, 11, 12])
    expect(lasts).toEqual([10, 11, 12])
    expect(source.opened.map((item) => item.afterEventNumber)).toEqual([0])
  })

  test('opens again after the page progress when the connection drops between pages', async () => {
    const { source, stream, seen, delay } = start()
    source.send(page([envelope(2)], 9, 5))
    source.drop()
    await delay.runAll()
    source.send(page([envelope(7)], 9))
    expect(source.opened.map((item) => item.afterEventNumber)).toEqual([0, 5])
    expect(seen).toEqual([2, 7])
    expect(stream.last.get()).toBe(9)
  })
})

test('sends no read mark through a replay that has more pages to come', async () => {
  const server = new FakeApiServer({ workspaceState: 'ready' })
  const events = new RecordingEvents()
  const org = new OrgModel(testServices(server, { events }), FAKE_IDS.org)
  const workspace = new WorkspaceModel(org, FAKE_IDS.workspace)
  const readPath = workspacePaths.read(FAKE_IDS.org, FAKE_IDS.workspace)
  const marks = () =>
    Promise.all(
      server.requests
        .filter(
          (request) =>
            request.method === 'PUT' &&
            new URL(request.url).pathname === readPath,
        )
        .map((request) => request.clone().json()),
    )
  await workspace.open()
  events.send(page([envelope(1), envelope(3)], 10, 4))
  await flushMicrotasks()
  events.send(page([envelope(6)], 10, 8))
  await flushMicrotasks()
  expect(await marks()).toEqual([])
  events.send(page([envelope(10)], 10))
  await flushMicrotasks()
  expect(await marks()).toEqual([{ throughEventNumber: 10 }])
  workspace.close()
})
