import { describe, expect, test } from 'vitest'
import { WorkspaceStream } from '../../../app/events'
import { ManualDelay, RecordingEvents } from '../../../app/test-kit'
import type { WorkspaceEventEnvelope } from '../../../shared/events'
import { FAKE_IDS, FAKE_TIME } from '../../../test-support/fixtures/core'
import {
  fullReport,
  refusedReport,
} from '../../../test-support/recorded-repairs'
import { ToolEvents } from './tool-events'

const workspaceId = FAKE_IDS.workspace

/** A raw envelope of the socket, as the Worker sends it. */
function raw(eventNumber: number, event: object, occurredAt = FAKE_TIME) {
  return { workspaceId, eventNumber, occurredAt, event }
}

/** The tool events of the workspace, which follow its real stream. */
function followed() {
  const source = new RecordingEvents()
  const target = { orgId: FAKE_IDS.org, workspaceId }
  const stream = new WorkspaceStream(source, target, new ManualDelay().delay)
  const tools = new ToolEvents()
  tools.follow(stream)
  stream.start()
  return { source, tools }
}

/** What a tool that shows now gets at once, before any live event. */
function replayOf(tools: ToolEvents) {
  const seen: WorkspaceEventEnvelope[] = []
  tools.subscribe((envelope) => seen.push(envelope))()
  return seen.map(({ eventNumber, occurredAt, event }) => ({
    eventNumber,
    occurredAt,
    event,
  }))
}

const nextDev = { port: 3000, name: 'next dev', folder: null }
const docs = { port: 4321, name: 'astro dev', folder: 'docs' }
const revoke = (previewId: string) => ({ type: 'preview.revoked', previewId })

describe('the tool events of a workspace', () => {
  test('replay each revoke and only the latest readable port report, in event order, to a tool that shows later', () => {
    const { source, tools } = followed()
    source.send({
      type: 'history',
      history: {
        events: [
          raw(1, revoke('preview-1')),
          raw(2, { type: 'ports.updated', ports: [nextDev] }),
          raw(3, { type: 'ports.updated', ports: [nextDev, docs] }),
          raw(4, revoke('preview-2')),
          raw(5, { type: 'ports.updated', ports: [{ port: 'vite' }] }),
        ],
        throughEventNumber: 5,
      },
    })

    expect(replayOf(tools)).toEqual([
      { eventNumber: 1, occurredAt: FAKE_TIME, event: revoke('preview-1') },
      {
        eventNumber: 3,
        occurredAt: FAKE_TIME,
        event: { type: 'ports.updated', ports: [nextDev, docs] },
      },
      { eventNumber: 4, occurredAt: FAKE_TIME, event: revoke('preview-2') },
    ])

    // A tool that shows gets the kept events, then the stop of the sandbox.
    const shown: number[] = []
    const stop = tools.subscribe((envelope) => shown.push(envelope.eventNumber))
    source.send({
      type: 'event',
      envelope: raw(6, { type: 'ports.updated', ports: null }),
    })
    stop()
    expect(shown).toEqual([1, 3, 4, 6])
    expect(replayOf(tools)).toEqual([
      { eventNumber: 1, occurredAt: FAKE_TIME, event: revoke('preview-1') },
      { eventNumber: 4, occurredAt: FAKE_TIME, event: revoke('preview-2') },
      {
        eventNumber: 6,
        occurredAt: FAKE_TIME,
        event: { type: 'ports.updated', ports: null },
      },
    ])
  })

  test('replay the first failed repair of the port list until a later report, and leave out a first loss and other repairs', () => {
    const { source, tools } = followed()
    const failedAt = FAKE_TIME - 180_000
    source.send({
      type: 'history',
      history: {
        events: [
          raw(1, fullReport('ports.updated')),
          raw(2, refusedReport('ports.updated', false), failedAt - 60_000),
          raw(3, refusedReport('ports.updated', true, 2), failedAt),
          raw(4, refusedReport('files.snapshot', true, 3), failedAt),
          raw(5, refusedReport('ports.updated', true, 4), FAKE_TIME),
        ],
        throughEventNumber: 5,
      },
    })

    const replay = replayOf(tools)
    expect(replay.map(({ eventNumber }) => eventNumber)).toEqual([1, 3])
    expect(replay[1]).toEqual({
      eventNumber: 3,
      occurredAt: failedAt,
      event: {
        type: 'runner.event-refused',
        streamId: 'recorded-stream-1',
        runnerEventNumber: 2,
        runnerEventType: 'ports.updated',
        reason: 'too_large',
        sessionId: null,
        turnId: null,
        repairFailed: true,
      },
    })

    source.send({
      type: 'event',
      envelope: raw(6, fullReport('ports.updated')),
    })
    expect(replayOf(tools).map(({ eventNumber }) => eventNumber)).toEqual([6])
  })
})
