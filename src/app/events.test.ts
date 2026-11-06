import { describe, expect, test } from 'vitest'
import { FAKE_TIME } from '../test-support/fixtures/core'
import type { StreamEnvelope } from './api/read-events'
import { WorkspaceStream } from './events'
import { ManualDelay, RecordingEvents } from './test-kit'

const target = { orgId: 'acme', workspaceId: 'checkout-autocomplete' }

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
})
