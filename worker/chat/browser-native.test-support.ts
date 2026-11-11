import type { Miniflare, WebSocket } from 'miniflare'

import { workspaceEventsPath } from '../../src/shared/events'
import { TEST_ORIGIN } from '../test-support/harness'
import { closeSockets, SocketInbox } from './adapter-sockets.test-support'
import { record } from './inputs'
import { WORKSPACE_ID } from './harness.test-support'

const closedBrowsers = new WeakSet<WebSocket>()

export function browserControls(
  runtime: Miniflare,
  headers: Record<string, string>,
) {
  const request = async (
    action: string,
    fields: Record<string, unknown> = {},
  ) => {
    const response = await runtime.dispatchFetch(
      `${TEST_ORIGIN}/__test/browser`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, ...fields }),
      },
    )
    if (response.status !== 200)
      throw new Error(
        `Browser control returned ${response.status}: ${await response.text()}`,
      )
    return record(await response.json())
  }
  return {
    request,
    hibernate: async (asleep?: () => Promise<void>) => {
      await runtime.unsafeEvictDurableObject(
        'chat-adapter-tests',
        'Workspace',
        {
          name: WORKSPACE_ID,
          webSockets: 'hibernate',
        },
      )
      await asleep?.()
      return request('inspect')
    },
    open: async (origin = TEST_ORIGIN) => {
      const response = await runtime.dispatchFetch(
        `${origin}${workspaceEventsPath('org', WORKSPACE_ID)}`,
        {
          headers: { ...headers, Origin: origin, Upgrade: 'websocket' },
        },
      )
      if (response.status !== 101 || !response.webSocket)
        throw new Error(`Browser upgrade returned ${response.status}`)
      const socket = response.webSocket
      const inbox = new SocketInbox(socket)
      const closed = new Promise<{ code: number; reason: string }>(
        (resolve) => {
          socket.addEventListener(
            'close',
            (event) => {
              closedBrowsers.add(socket)
              resolve({ code: event.code, reason: event.reason })
            },
            { once: true },
          )
        },
      )
      socket.accept()
      const history = await inbox.next()
      return { socket, inbox, history, closed }
    },
  }
}

export async function disposeBrowsers(
  runtime: Miniflare,
  sockets: WebSocket[],
): Promise<void> {
  await Promise.all([
    closeSockets(...sockets.filter((socket) => !closedBrowsers.has(socket))),
    runtime.dispose(),
  ])
}

export async function closeBrowserPeers(
  runtime: Miniflare,
  headers: Record<string, string>,
  ...sockets: WebSocket[]
): Promise<void> {
  const controls = browserControls(runtime, headers)
  const before = await controls.request('inspect')
  for (const socket of sockets) {
    closedBrowsers.add(socket)
    socket.close(1000, 'The browser test has finished.')
  }
  if (typeof before.closed !== 'number')
    throw new Error('The browser close count is missing.')
  await controls.request('closed', { count: before.closed + sockets.length })
  await controls.request('settled')
}

export async function seedBrowserRuntime(runtime: Miniflare): Promise<void> {
  const db = await runtime.getD1Database('DB')
  await db
    .prepare(
      `INSERT OR IGNORE INTO workspace_runtime
    (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
    VALUES (?, 'org', 'owner', 'native-session', 'native-turn', 'claude', 'test-claude', 'high', 'native-first')`,
    )
    .bind(WORKSPACE_ID)
    .run()
}
