import { describe, expect, test, vi } from 'vitest'
import {
  secretRequestsPath,
  type SecretRequest,
  type SecretRequestsResponse,
} from '../../shared/secret-requests'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  asks,
  late,
  priya,
  request,
  second,
} from '../../test-support/fixtures/secret-requests'
import { deferred } from '../../test-support/mount'
import { rowOf, sessionMarks } from '../components/tab-row'
import { tabSessions } from '../state/archive-view'
import type { ChatController } from '../state/controller'
import { chatFor } from '../state/test-kit'
import type { StreamListener } from '../stream/workspace-stream'
import { lateRequest, storeEvents, updated } from './secret-test-kit'

const listPath = secretRequestsPath(FAKE_IDS.org, FAKE_IDS.workspace)
const shortly = { timeout: 10_000 }

/** The reply of the read of the secret requests of the workspace. */
function listOf(requests: readonly SecretRequest[]): SecretRequestsResponse {
  return { requests, workspaceValues: [] }
}

/**
 * Whether each session tab of the chat shows the needs-input mark, by the
 * ID of its session, from the marks that the chat gives its tab row.
 */
function marksOf(controller: ChatController): Record<string, boolean> {
  const snapshot = controller.getSnapshot()
  const tabs = rowOf(
    snapshot.view,
    tabSessions(snapshot),
    null,
    sessionMarks(snapshot),
    undefined,
  )
  return Object.fromEntries(
    tabs.flatMap((tab) =>
      tab.kind === 'session' ? [[tab.id, tab.needsInput]] : [],
    ),
  )
}

/** A request of the second session that nobody answered in time. */
const lateInDebounce = request('preview', asks.preview, FAKE_TIME, {
  ...late(FAKE_TIME + 90 * second),
  sessionId: 'debounce',
})

/** Three late requests of the shown session for one secret, oldest first. */
const [postcode, country, cities] = [
  lateRequest('postcode', FAKE_TIME, 'Count the addresses without a postcode.'),
  lateRequest('country', FAKE_TIME + 100, 'Count them by country.'),
  lateRequest(
    'cities',
    FAKE_TIME + 200,
    'Find the cities with the most of them.',
  ),
]

/** A request that Priya allowed in another view, a second after its state. */
function allowed(item: SecretRequest): SecretRequest {
  return {
    ...item,
    state: 'allowed',
    answeredBy: priya,
    updatedAt: item.updatedAt + second,
  }
}

/**
 * The Allow of the card of the three requests in another view, which hides
 * the two older ones. It gives the mark of the tab of the shown session
 * while the read of the list after that Allow waits, and the number of
 * reads when that read with `body` and `status` gave the mark back.
 */
async function aroundAllow(body: unknown, status: number) {
  const chat = chatFor()
  storeEvents(chat.server, [postcode, country, cities].map(updated))
  await chat.controller.start()
  const reply = deferred<unknown>()
  chat.server.json('GET', listPath, reply.promise, status)
  chat.emit({
    type: 'secrets.request.updated',
    sessionId: FAKE_IDS.session,
    request: allowed(cities),
  })
  await vi.waitFor(
    () => expect(chat.requests('GET', listPath)).toHaveLength(2),
    shortly,
  )
  const whileRead = marksOf(chat.controller)[FAKE_IDS.session]
  reply.resolve(body)
  await vi.waitFor(
    () => expect(marksOf(chat.controller)[FAKE_IDS.session]).toBe(true),
    shortly,
  )
  const reads = chat.requests('GET', listPath).length
  chat.controller.stop()
  return { whileRead, reads }
}

describe('the read of the secret requests of every session', () => {
  test('marks the tab of another session at the start, when no event of the chat holds its open request', async () => {
    const chat = chatFor()
    chat.server.json('GET', listPath, listOf([lateInDebounce]))
    await chat.controller.start()
    expect(marksOf(chat.controller)).toEqual({
      [FAKE_IDS.session]: false,
      debounce: true,
    })
    chat.controller.stop()
  })

  test('after a reconnect, adds a request that no event holds, and never takes back the newer state of an event', async () => {
    const listeners: StreamListener[] = []
    const chat = chatFor({
      subscribe: (_target, _after, listener) => {
        listeners.push(listener)
        return () => {}
      },
    })
    chat.server.json('GET', listPath, listOf([lateInDebounce]))
    await chat.controller.start()
    const through = chat.after[0]
    const replay = (number: number) =>
      listeners.at(-1)?.message({
        type: 'history',
        history: { events: [], throughEventNumber: number },
      })
    replay(through)
    const atStart = marksOf(chat.controller)
    // Priya denies the request in another view, and its event comes.
    listeners.at(-1)?.message({
      type: 'event',
      envelope: {
        workspaceId: FAKE_IDS.workspace,
        eventNumber: through + 1,
        occurredAt: FAKE_TIME + 120 * second,
        event: {
          type: 'secrets.request.updated',
          sessionId: 'debounce',
          request: {
            ...lateInDebounce,
            state: 'denied',
            answeredBy: priya,
            updatedAt: FAKE_TIME + 120 * second,
          },
        },
      },
    })
    const denied = marksOf(chat.controller)
    // The read after the reconnect still holds the late state, as a read
    // that the event overtook does. It also holds a request of the shown
    // session that no event holds.
    const waiting = request('count', asks.database, FAKE_TIME + 130 * second)
    chat.server.json('GET', listPath, listOf([lateInDebounce, waiting]))
    listeners[0].closed()
    chat.timers.runAll()
    replay(through + 1)
    await vi.waitFor(
      () => expect(marksOf(chat.controller)[FAKE_IDS.session]).toBe(true),
      { timeout: 10_000 },
    )
    expect({
      atStart,
      denied,
      reconnected: marksOf(chat.controller),
      state:
        chat.controller.getSnapshot().secrets.requests.preview?.request.state,
    }).toEqual({
      atStart: { [FAKE_IDS.session]: false, debounce: true },
      denied: { [FAKE_IDS.session]: false, debounce: false },
      reconnected: { [FAKE_IDS.session]: true, debounce: false },
      state: 'denied',
    })
    chat.controller.stop()
  })

  test('after the Allow of a card in another view, keeps the requests that the card hides off the tab mark until one read, which gives back each request that is still open, also when the read fails', async () => {
    // The Worker allowed `postcode` too, but the grant did not cover
    // `country`, and the events of neither came yet.
    const read = await aroundAllow(
      listOf([allowed(postcode), country, allowed(cities)]),
      200,
    )
    const failed = await aroundAllow(
      { error: { code: 'internal_error', message: 'The server is busy.' } },
      500,
    )
    expect({ read, failed }).toEqual({
      read: { whileRead: false, reads: 2 },
      failed: { whileRead: false, reads: 2 },
    })
  })
})
