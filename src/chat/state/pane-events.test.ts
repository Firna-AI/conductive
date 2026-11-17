import { describe, expect, it } from 'vitest'
import type { WorkspaceEventEnvelope } from '../../shared/events'
import { chatHistoryPath } from '../../shared/events'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import type { StreamListener } from '../stream/workspace-stream'
import { acceptedIn } from './linked-kit'
import { paneChat } from './pane-test-kit'
import { shown } from './test-kit'

const first = FAKE_IDS.session
const second = 'debounce'
function message(
  eventNumber: number,
  sessionId: string,
  words: string,
): WorkspaceEventEnvelope {
  return {
    workspaceId: FAKE_IDS.workspace,
    eventNumber,
    occurredAt: FAKE_TIME,
    event: {
      type: 'message.accepted',
      message: acceptedIn(sessionId, `message-${eventNumber}`, words),
    },
  }
}

function twoHistories() {
  const events = [
    message(1, first, 'left history'),
    message(2, second, 'right history'),
  ]
  const stream = new FakeWorkspaceEvents(events)
  const listeners: StreamListener[] = []
  const chat = paneChat({
    stream,
    subscribe: (_target, after, listener) => {
      listeners.push(listener)
      return stream.subscribe(after, (event) => listener.message(event))
    },
  })
  for (const [id, cutoff] of [
    [first, 1],
    [second, 2],
  ] as const) {
    chat.server.json(
      'GET',
      chatHistoryPath(FAKE_IDS.org, FAKE_IDS.workspace, id),
      {
        events: events.filter(
          (envelope) =>
            envelope.event?.type === 'message.accepted' &&
            envelope.event.message.sessionId === id,
        ),
        throughEventNumber: cutoff,
      },
    )
  }
  return { ...chat, stream, listeners }
}

describe('two shown session logs', () => {
  it('loads both histories and applies unfocused events once and in order through the one workspace stream', async () => {
    const chat = twoHistories()
    await chat.controller.start()
    expect([chat.histories(first), chat.histories(second)]).toEqual([1, 1])
    expect(chat.after).toEqual([1])
    expect(shown(chat.controller, first)).toEqual(['user: left history'])
    expect(shown(chat.controller, second)).toEqual(['user: right history'])
    chat.stream.emit(message(4, second, 'right fourth'))
    chat.stream.emit(message(3, second, 'right third'))
    chat.stream.emit(message(3, second, 'right third'))
    expect(shown(chat.controller, second)).toEqual([
      'user: right history',
      'user: right third',
      'user: right fourth',
    ])
    expect(shown(chat.controller, first)).toEqual(['user: left history'])
    expect(chat.controller.getSnapshot().view?.focusedPane).toBe(0)
    chat.controller.stop()
  })

  it('reconnects after the shared cursor and merges both sessions without missing or repeated messages', async () => {
    const chat = twoHistories()
    await chat.controller.start()
    chat.stream.emit(message(3, first, 'left before drop'))
    chat.listeners[0].closed()
    chat.stream.emit(message(4, second, 'right while disconnected'))
    chat.stream.emit(message(5, first, 'left while disconnected'))
    chat.timers.run(1000)
    chat.stream.emit(message(5, first, 'left while disconnected'))
    chat.stream.emit(message(6, second, 'right after reconnect'))
    expect(chat.after).toEqual([1, 3])
    expect(shown(chat.controller, first)).toEqual([
      'user: left history',
      'user: left before drop',
      'user: left while disconnected',
    ])
    expect(shown(chat.controller, second)).toEqual([
      'user: right history',
      'user: right while disconnected',
      'user: right after reconnect',
    ])
    expect([chat.histories(first), chat.histories(second)]).toEqual([1, 1])
    chat.controller.stop()
  })
})
