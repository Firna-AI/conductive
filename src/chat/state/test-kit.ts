import { chatHistoryPath, type WorkspaceEvent } from '../../shared/events'
import { FakeApiServer, type FakeApiOptions } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import type { FetchLike } from '../api/client'
import type { StreamTimers } from '../stream/workspace-stream'
import { ChatController } from './controller'

/** Timers that run only when a test says so. */
export function manualTimers(): StreamTimers & { runAll(): void } {
  const waiting = new Map<number, () => void>()
  let next = 0
  return {
    set: (callback) => {
      next += 1
      waiting.set(next, callback)
      return setTimeout(() => {}, 0)
    },
    clear: () => {},
    runAll: () => {
      const callbacks = [...waiting.values()]
      waiting.clear()
      for (const callback of callbacks) callback()
    },
  }
}

/**
 * A chat on the fake API and its recorded events, with manual timers and
 * numbered client IDs. `after` lists where each stream subscription began.
 */
export function chatFor(
  options: FakeApiOptions & {
    workspaceId?: string
    /** Picks the requests that wait until the test lets them go. */
    hold?: (request: Request) => boolean
  } = {},
) {
  const server = new FakeApiServer(options)
  const held: (() => void)[] = []
  const fetch: FetchLike = async (input, init) => {
    const request = new Request(
      new URL(String(input), 'https://held.test'),
      init,
    )
    if (options.hold?.(request)) {
      await new Promise<void>((resolve) => held.push(resolve))
    }
    return server.fetch(input, init)
  }
  const after: number[] = []
  const timers = manualTimers()
  let ids = 0
  const controller = new ChatController({
    target: {
      orgId: FAKE_IDS.org,
      workspaceId: options.workspaceId ?? FAKE_IDS.workspace,
    },
    fetch,
    subscribe: (_target, from, listener) => {
      after.push(from)
      return server.events.subscribe(from, (message) =>
        listener.message(message),
      )
    },
    timers,
    newId: () => {
      ids += 1
      return `client-${ids}`
    },
  })
  const emit = (
    event: WorkspaceEvent,
    workspaceId: string = FAKE_IDS.workspace,
  ) => {
    const eventNumber = server.events.history().throughEventNumber + 1
    server.events.emit({
      workspaceId,
      eventNumber,
      occurredAt: FAKE_TIME,
      event,
    })
  }
  const requests = (method: string, path: string) =>
    server.requests.filter(
      (request) =>
        request.method === method && new URL(request.url).pathname === path,
    )
  const bodies = (method: string, path: string) =>
    Promise.all(
      requests(method, path).map(async (request): Promise<unknown> =>
        request.clone().json(),
      ),
    )
  /** The number of history requests for one session. */
  const histories = (sessionId: string) =>
    server.requests.filter((request) => {
      const url = new URL(request.url)
      return (
        request.method === 'GET' &&
        url.pathname === historyPathname &&
        url.searchParams.get('sessionId') === sessionId
      )
    }).length
  const historyPathname = new URL(
    chatHistoryPath(
      FAKE_IDS.org,
      options.workspaceId ?? FAKE_IDS.workspace,
      '',
    ),
    'https://held.test',
  ).pathname
  /** The draft of a session as the snapshot holds it. */
  const draftOf = (sessionId: string) =>
    controller.getSnapshot().sessionStates[sessionId]?.draft
  return {
    server,
    controller,
    after,
    timers,
    emit,
    requests,
    bodies,
    held,
    histories,
    draftOf,
  }
}

/** The kinds and texts of a session's transcript, in the order of the chat. */
export function shown(controller: ChatController, sessionId: string): string[] {
  const state = controller.getSnapshot().sessionStates[sessionId]
  return (state?.transcript.items ?? []).map((item) => {
    switch (item.kind) {
      case 'user':
        return `user: ${item.message.text}`
      case 'agent':
        return `agent: ${item.text}`
      case 'tool':
        return `tool: ${item.tool.target} ${item.tool.state}`
      case 'turn-end':
        return `end: ${item.durationMs}`
      case 'stopped':
        return 'stopped'
      case 'failed':
        return `failed: ${item.error.message}`
    }
  })
}
