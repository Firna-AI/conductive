import { expect } from 'vitest'

import { array } from '../chat/agent-events'
import type { SocketInbox } from '../chat/adapter-sockets.test-support'
import { counter, record } from '../chat/inputs'
import type { StartStep } from '../../src/shared/workspaces'

export function publicHistory(value: unknown) {
  const message = record(value)
  expect(message.type).toBe('history')
  const history = record(message.history)
  return {
    events: array(history.events, record),
    throughEventNumber: counter(history.throughEventNumber),
  }
}

export async function liveEvents(
  inbox: SocketInbox,
  after: number,
  through: number,
): Promise<Record<string, unknown>[]> {
  const events: Record<string, unknown>[] = []
  for (let number = after + 1; number <= through; number++) {
    const message = record(await inbox.next())
    expect(message.type).toBe('event')
    const envelope = record(message.envelope)
    expect(envelope.eventNumber).toBe(number)
    events.push(envelope)
  }
  return events
}

export function hasStartStep(
  envelope: Record<string, unknown>,
  id: string,
  state: StartStep['state'],
): boolean {
  const event = record(envelope.event)
  return (
    event.type === 'start.updated' &&
    array(record(event.start).steps, record).some(
      (step) => step.id === id && step.state === state,
    )
  )
}
