import { afterEach, expect, it, vi } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { readStreamMessage } from '../api/read-workspace'
import { WorkspaceStream } from '../stream/workspace-stream'
import { DevStream } from './dev-stream'

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('recovers out-of-order parts from stored history and delivers each once after the delayed live copy', () => {
  vi.useFakeTimers()
  vi.setSystemTime(FAKE_TIME)
  vi.stubGlobal('window', { setTimeout })
  const target = { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace }
  const dev = new DevStream(target.workspaceId, { now: () => FAKE_TIME }, [])
  const delivered: number[] = []
  const opened: number[] = []
  const live: number[] = []
  const stream = new WorkspaceStream({
    target,
    deliver: (envelopes) =>
      delivered.push(...envelopes.map((envelope) => envelope.eventNumber)),
    subscribe: (target, after, listener) => {
      opened.push(after)
      return dev.subscribe(target, after, {
        message: (raw) => {
          const message = readStreamMessage(raw)
          if (message?.type === 'event') live.push(message.envelope.eventNumber)
          listener.message(raw)
        },
        closed: () => listener.closed(),
      })
    },
  })
  const part = (text: string): WorkspaceEvent => ({
    type: 'assistant.delta',
    sessionId: FAKE_IDS.session,
    turnId: 'out-of-order-turn',
    messageId: 'out-of-order-answer',
    text,
  })

  stream.start(0)
  dev.emitOutOfOrder(part('First part. '), part('Second part.'))
  expect(live).toEqual([2])
  expect(delivered).toEqual([])
  expect(opened).toEqual([0])

  vi.advanceTimersByTime(0)
  expect(opened).toEqual([0, 0])
  const recovered = [...delivered]

  vi.advanceTimersByTime(1_500)
  expect(live).toEqual([2, 1])
  expect(delivered).toEqual([1, 2])
  expect(recovered).toEqual([1, 2])
  expect(opened).toEqual([0, 0])
  stream.stop()
})
