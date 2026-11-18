import { afterEach, beforeEach, expect, it } from 'vitest'

import { chatHistoryPath } from '../../src/shared/events'
import { readDeviceRecord } from '../../src/shared/device-read'
import { sessionPaths, sessionsPath } from '../../src/shared/sessions'
import {
  deviceFixture,
  WID,
  type DeviceFixture,
} from '../devices/runtime.test-support'
import {
  command,
  connected,
  ref,
  result,
  sendFrame,
} from '../devices/requests.test-support'
import { array } from './agent-events'
import { CLAUDE } from './harness.test-support'
import { record, string } from './inputs'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture({
    entry: 'worker/chat/device-cleanup-worker.test-support.ts',
  })
})
afterEach(async () => {
  await fixture?.dispose()
})

async function probe() {
  const response = await fixture.app(
    sessionsPath('org', WID) + '/__test/device-cleanup',
  )
  expect(response.status).toBe(200)
  const body = record(await response.json())
  return {
    lifecycle: record(body.lifecycle),
    requests: array(body.requests, readDeviceRecord),
  }
}

async function emit(eventNumber: number, event: unknown) {
  fixture.runner.send(
    JSON.stringify({
      type: 'event',
      streamId: 'stream',
      eventNumber,
      occurredAt: eventNumber,
      event,
    }),
  )
  expect(await fixture.runnerInbox.next()).toEqual({
    type: 'confirm',
    streamId: 'stream',
    throughEventNumber: eventNumber,
  })
}

it.each(['turn.completed', 'turn.failed'] as const)(
  'cancels local work after refused %s and preserves a newer turn during late ends',
  async (type) => {
    const mac = await connected(fixture)
    await command(fixture, mac)
    await probe()
    const context = { sessionId: fixture.sessionId, turnId: fixture.turnId }
    const refused = { ...context, type }
    await emit(2, refused)
    const ended = await probe()
    expect(ended.requests).toMatchObject([
      {
        requestId: 'command-1',
        state: 'failed',
        error: { code: 'turn_ended' },
      },
    ])
    expect(await mac.inbox.next()).toEqual({ type: 'command.cancel', ...ref() })
    expect(ended.lifecycle).toMatchObject({
      sessions: [{ id: fixture.sessionId, activeTurnId: null }],
      turns: [{ id: fixture.turnId, state: 'failed', started: true }],
      commands: [],
    })
    const history = await fixture.app(
      chatHistoryPath('org', WID, fixture.sessionId),
    )
    expect(record(await history.json()).events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: {
            ...context,
            type: 'runner.event-refused',
            streamId: 'stream',
            runnerEventNumber: 2,
            runnerEventType: type,
            reason: 'invalid',
          },
        }),
      ]),
    )

    const response = await fixture.app(
      sessionPaths.messages('org', WID, fixture.sessionId),
      {
        id: 'next-message',
        text: 'Continue.',
        choice: CLAUDE,
        attachmentIds: [],
      },
    )
    expect(response.status).toBe(202)
    const next = record(await fixture.runnerInbox.next())
    expect(next.type).toBe('turn')
    const nextTurnId = string(next.turnId)
    const requested = await fixture.machine(
      fixture.input('next-command'),
      '',
      nextTurnId,
    )
    expect(requested.status).toBe(202)
    expect(await mac.inbox.next()).toMatchObject({
      type: 'command.request',
      request: { requestId: 'next-command', turnId: nextTurnId },
    })
    await sendFrame(mac, { type: 'command.approved', ...ref('next-command') })
    const beforeLate = await probe()
    expect(beforeLate.requests).toMatchObject([
      { requestId: 'command-1', state: 'failed' },
      { requestId: 'next-command', state: 'running' },
    ])
    expect(beforeLate.lifecycle).toMatchObject({
      sessions: [{ activeTurnId: nextTurnId }],
    })

    await emit(3, {
      ...context,
      type: 'turn.completed',
      state: 'finished',
      durationMs: 25,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['first-message'],
    })
    expect(await probe()).toEqual(beforeLate)
    await emit(4, refused)
    expect(await probe()).toEqual(beforeLate)
    await sendFrame(mac, { type: 'command.approved', ...ref() })
    await sendFrame(mac, { type: 'command.result', ...ref(), result })
    expect(await probe()).toEqual(beforeLate)
    await sendFrame(mac, {
      type: 'command.result',
      ...ref('next-command'),
      result,
    })
    expect((await probe()).requests).toMatchObject([
      {
        requestId: 'command-1',
        state: 'failed',
        error: { code: 'turn_ended' },
      },
      { requestId: 'next-command', state: 'completed', result },
    ])
  },
)
