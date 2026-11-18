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

/** A store with 70 events, so a full replay takes three pages of 32 events. */
async function storedWorkspace() {
  const { storage } = await nativeChatStore()
  const store = new ChatStore(storage, () => 25)
  await store.change(
    'workspace',
    async (transaction) => {
      for (let index = 1; index <= 70; index++)
        await transaction.emit({ type: 'workspace.title', name: `${index}` })
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
  eventNumber: 71,
  occurredAt: 25,
  event: { type: 'workspace.title', name: 'live' },
}

const logins = { logins: { refresh: async () => undefined } }

it('closes a replay after the page that reaches its budget, and a connection after that page goes on', async () => {
  const store = await storedWorkspace()
  const browsers = grants()
  const first = tab()
  const paused = subscribeBrowser({
    store,
    browsers,
    operation: logins,
    access,
    after: 0,
    peer: first.peer,
    budget: 1,
  })
  await paused.registered
  await paused.replayed
  browsers.publish([live])
  expect(pages(first.state.messages)).toEqual([
    { numbers: range(1, 32), through: 70, next: 32 },
  ])
  expect(first.state.closed).toBe(1)

  const second = tab()
  const resumed = subscribeBrowser({
    store,
    browsers,
    operation: logins,
    access,
    after: 32,
    peer: second.peer,
  })
  await resumed.replayed
  browsers.publish([live])
  expect(pages(second.state.messages)).toEqual([
    { numbers: range(33, 64), through: 70, next: 64 },
    { numbers: range(65, 70), through: 70, next: null },
    { live: 71 },
  ])
  expect(second.state.closed).toBe(0)
})

it('refuses a tab without a grant before its first history page', async () => {
  const store = await storedWorkspace()
  const refused = tab()
  const subscription = subscribeBrowser({
    store,
    browsers: grants(0),
    operation: logins,
    access,
    after: 0,
    peer: refused.peer,
  })
  const error = await subscription.registered.then(
    () => null,
    (reason: unknown) => reason,
  )
  await expect(subscription.replayed).rejects.toBe(error)
  expect(error).toBeInstanceOf(HttpError)
  expect(error).toMatchObject({ status: 404, code: 'workspace_not_found' })
  expect(refused.state).toEqual({ messages: [], closed: 1 })
})
