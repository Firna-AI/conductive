import type { Miniflare } from 'miniflare'
import { expect } from 'vitest'

import { TEST_ORIGIN } from '../test-support/harness'
import {
  browserControls,
  closeBrowserPeers,
  seedBrowserRuntime,
} from './browser-native.test-support'
import { array } from './agent-events'
import { record, number } from './inputs'
import { WORKSPACE_ID } from './harness.test-support'

export async function verifyBrowserWake(
  runtime: Miniflare,
  headers: Record<string, string>,
): Promise<void> {
  await seedBrowserRuntime(runtime)
  const controls = browserControls(runtime, headers)
  const first = await controls.open()
  const local = await controls.open('http://127.0.0.1:5174')
  const before = await controls.request('inspect')
  const registrations = before.registrations
  const after = await controls.hibernate()
  expect(after.instance).not.toBe(before.instance)
  expect(array(after.sockets, record).map((value) => value.readyState)).toEqual(
    [1, 1],
  )
  expect(after.registrations).toEqual(registrations)
  expect(after.opened).toBe(before.opened)
  expect(after.closed).toBe(before.closed)
  expect(local.history).toEqual(first.history)
  const through = number(
    record(record(first.history).history).throughEventNumber,
  )
  for (const [offset, name] of [
    [1, 'First after wake'],
    [2, 'Second after wake'],
  ] as const) {
    const db = await runtime.getD1Database('DB')
    await db
      .prepare('UPDATE workspaces SET name = ? WHERE id = ?')
      .bind(name, WORKSPACE_ID)
      .run()
    await controls.request('publish', { workspaceId: WORKSPACE_ID })
    for (const [tab, origin] of [
      [first, TEST_ORIGIN],
      [local, 'http://127.0.0.1:5174'],
    ] as const) {
      expect(await tab.inbox.next()).toMatchObject({
        type: 'event',
        envelope: {
          eventNumber: through + offset,
          event: {
            type: 'workspace.updated',
            workspace: {
              name,
              number: 1,
              link: `${origin}/orgs/org/workspaces/${WORKSPACE_ID}`,
            },
          },
        },
      })
    }
  }
  first.socket.send('ignored client input')
  await controls.request('inspect')
  const stored = await controls.request('inspect')
  for (const tab of [first, local])
    expect(tab.inbox.received.map((message) => record(message).type)).toEqual([
      'history',
      'event',
      'event',
    ])
  const chatState = array(stored.state, (value) =>
    array(value, (item) => item),
  ).filter(([key]) => typeof key === 'string' && key.startsWith('chat:'))
  expect(JSON.stringify(chatState)).not.toContain('127.0.0.1:5174')
  expect(stored.opened).toBe(before.opened)
  expect(stored.closed).toBe(before.closed)
  await closeBrowserPeers(runtime, headers, first.socket, local.socket)
  await controls.request('settled')
  const closed = await controls.request('inspect')
  expect(closed.registrations).toEqual([])
  expect(closed.closed).toBe(number(before.closed) + 2)
}
