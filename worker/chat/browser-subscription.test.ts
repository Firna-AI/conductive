import { expect, it } from 'vitest'
import { HttpError } from '../http'
import { BrowserTabs } from './browser-tabs'
import { subscribeBrowser } from './browser-subscription'
import { seedLegacyHistory } from './history-memory.test-support'
import { nativeChatStore } from './native-store.test-support'
import { ChatStore } from './store'
import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from './workspace-events'

const access = {
  workspace: { id: 'workspace', orgId: 'org', archivedAt: null },
  context: { user: { id: 'user' }, sessionId: 'session' },
}

/**
 * Each event names 1,000 emoji. The first page reaches 4 MiB at event 1,022,
 * after 4,196,247 UTF-8 bytes. The final list contains three more events.
 */
async function storedWorkspace() {
  const { storage } = await nativeChatStore()
  const name = '🙂'.repeat(1_000)
  await seedLegacyHistory(
    storage,
    Array.from({ length: 1_025 }, (): WorkspaceEvent => ({
      type: 'workspace.title',
      name,
    })),
  )
  return new ChatStore(storage, () => 25)
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
  eventNumber: 1_026,
  occurredAt: 25,
  event: { type: 'workspace.title', name: 'live' },
}

const logins = { logins: { refresh: async () => undefined } }

const budgetCases = [
  {
    end: 'inside the short second page',
    // The first page leaves 3,753 bytes. Event 1,023 uses the rest.
    budget: 4_200_000,
    first: [
      { numbers: range(1, 1_022), through: 1_025, next: 1_022 },
      { numbers: [1_023], through: 1_025, next: 1_023 },
    ],
    rest: [{ numbers: [1_024, 1_025], through: 1_025, next: null }],
  },
  {
    end: 'at the last event of a full storage list',
    // Event 32 uses up the budget with 1,351 bytes over it. The page still
    // has more events after it, because its storage list was full.
    budget: 130_000,
    first: [{ numbers: range(1, 32), through: 1_025, next: 32 }],
    rest: [{ numbers: range(33, 1_025), through: 1_025, next: null }],
  },
]

it.each(budgetCases)(
  'ends a replay at its UTF-8 byte budget $end and closes the tab, and a tab after its last event gets the rest',
  async ({ budget, first, rest }) => {
    const store = await storedWorkspace()
    const browsers = grants()
    const ended = tab()
    await subscribeBrowser({
      store,
      browsers,
      operation: logins,
      access,
      after: 0,
      peer: ended.peer,
      budget,
    })
    browsers.publish([live])
    expect(pages(ended.state.messages)).toEqual(first)
    expect(ended.state.closed).toBe(1)

    const resumed = tab()
    await subscribeBrowser({
      store,
      browsers,
      operation: logins,
      access,
      after: first.at(-1)?.next ?? 0,
      peer: resumed.peer,
    })
    browsers.publish([live])
    expect(pages(resumed.state.messages)).toEqual([...rest, { live: 1_026 }])
    expect(resumed.state.closed).toBe(0)
  },
)

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
