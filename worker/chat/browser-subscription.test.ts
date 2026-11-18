import { expect, it } from 'vitest'
import { HttpError } from '../http'
import { BrowserTabs } from './browser-tabs'
import { subscribeBrowser } from './browser-subscription'
import { nativeChatStore } from './native-store.test-support'
import { ChatStore } from './store'
import type {
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from './workspace-events'

const access = {
  workspace: { id: 'workspace', orgId: 'org', archivedAt: null },
  context: { user: { id: 'user' }, sessionId: 'session' },
}

/**
 * A store with 40 events. Each event names 1,000 emoji. An emoji takes four
 * UTF-8 bytes and two UTF-16 code units, so each event takes a little over
 * 4,000 bytes.
 */
async function storedWorkspace() {
  const { storage } = await nativeChatStore()
  const store = new ChatStore(storage, () => 25)
  await store.change(
    'workspace',
    async (transaction) => {
      for (let index = 1; index <= 40; index++)
        await transaction.emit({
          type: 'workspace.title',
          name: '🙂'.repeat(1_000),
        })
    },
    () => undefined,
  )
  return store
}

function grants(deadline = 60_000) {
  return new BrowserTabs({
    now: () => 25,
    readConnectionAccess: async () =>
      deadline === 0 ? [] : [{ connectionNumber: 0, deadline }],
  })
}

function tab() {
  const state = { messages: [] as WorkspaceSocketMessage[], closed: 0 }
  const peer = {
    send: (message: WorkspaceSocketMessage) => state.messages.push(message),
    close: () => {
      state.closed++
    },
  }
  return { peer, state }
}

function pages(messages: readonly WorkspaceSocketMessage[]) {
  return messages.map((message) =>
    message.type === 'history'
      ? {
          numbers: message.history.events.map((event) => event.eventNumber),
          through: message.history.throughEventNumber,
          next: message.history.hasMore
            ? message.history.nextAfterEventNumber
            : null,
        }
      : { live: message.envelope.eventNumber },
  )
}

const range = (first: number, last: number) =>
  Array.from({ length: last - first + 1 }, (_, index) => first + index)

const live: WorkspaceEventEnvelope = {
  workspaceId: 'workspace',
  eventNumber: 41,
  occurredAt: 25,
  event: { type: 'workspace.title', name: 'live' },
}

const logins = { logins: { refresh: async () => undefined } }

it('ends a replay within a page at its UTF-8 byte budget and closes the tab, and a tab after its last event gets the rest', async () => {
  const store = await storedWorkspace()
  const browsers = grants()
  const first = tab()
  // Two events stay under 10,000 bytes, and the third passes it. A count of
  // UTF-16 code units would end the page only after the fifth event.
  await subscribeBrowser({
    store,
    browsers,
    operation: logins,
    access,
    after: 0,
    peer: first.peer,
    budget: 10_000,
  })
  browsers.publish([live])
  expect(pages(first.state.messages)).toEqual([
    { numbers: [1, 2, 3], through: 40, next: 3 },
  ])
  expect(first.state.closed).toBe(1)

  const second = tab()
  await subscribeBrowser({
    store,
    browsers,
    operation: logins,
    access,
    after: 3,
    peer: second.peer,
  })
  browsers.publish([live])
  expect(pages(second.state.messages)).toEqual([
    { numbers: range(4, 35), through: 40, next: 35 },
    { numbers: range(36, 40), through: 40, next: null },
    { live: 41 },
  ])
  expect(second.state.closed).toBe(0)
})

it('refuses a tab without a grant before its first history page, with no unhandled rejection', async () => {
  const unhandled: unknown[] = []
  const listener = (reason: unknown) => unhandled.push(reason)
  process.on('unhandledRejection', listener)
  try {
    const store = await storedWorkspace()
    const refused = tab()
    let registered = 0
    const subscription = subscribeBrowser({
      store,
      browsers: grants(0),
      operation: logins,
      access,
      after: 0,
      peer: refused.peer,
      registered: () => {
        registered++
      },
    })
    const error = await subscription.then(
      () => null,
      (reason: unknown) => reason,
    )
    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({ status: 404, code: 'workspace_not_found' })
    expect(registered).toBe(0)
    expect(refused.state).toEqual({ messages: [], closed: 1 })
    // Node reports an unhandled rejection after the pending jobs run.
    await new Promise((resolve) => setImmediate(resolve))
    expect(unhandled).toEqual([])
  } finally {
    process.off('unhandledRejection', listener)
  }
})
