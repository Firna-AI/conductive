import { expect, it } from 'vitest'
import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { workspaceEventsPath } from '../../src/shared/events'
import { FILE_EVENT_MAX_BYTES } from '../../src/shared/files'
import { TEST_ORIGIN } from '../test-support/harness'
import { createAdapterRuntime } from './adapter-runtime.test-support'
import { closeSockets, SocketInbox } from './adapter-sockets.test-support'
import {
  MACHINE_ORIGIN,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
} from './harness.test-support'
import { runnerControls } from './runner-native.test-support'

import { snapshot } from './runner-fixtures.test-support'
it('restores confirmed parts and complete reports larger than one SQLite value after eviction', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/runner-entry.test-support.ts',
  )
  const controls = runnerControls(runtime, headers)
  const parts = Array.from({ length: 12 }, (_, index) =>
    snapshot(
      1,
      index + 1,
      12,
      Array.from(
        { length: 100 },
        (_, entry) => `dir-${index}-${entry}/${'x'.repeat(950)}.ts`,
      ),
    ),
  )
  const expected = {
    type: 'files.snapshot',
    tree: { revision: 1, entries: parts.flatMap((part) => part.tree.entries) },
  }
  expect(
    new TextEncoder().encode(JSON.stringify(expected)).length,
  ).toBeGreaterThan(2000000)
  for (const part of parts)
    expect(
      new TextEncoder().encode(JSON.stringify(part)).length,
    ).toBeLessThanOrEqual(FILE_EVENT_MAX_BYTES)
  const runnerSocket = async () => {
    const response = await runtime.dispatchFetch(
      `${MACHINE_ORIGIN}${MACHINE_PATHS.runner}`,
      {
        headers: {
          Upgrade: 'websocket',
          Authorization: `Bearer ${WORKSPACE_TOKEN}`,
        },
      },
    )
    const socket = response.webSocket
    if (!socket) throw new Error('Missing runner socket')
    const inbox = new SocketInbox(socket)
    socket.accept()
    socket.send(
      JSON.stringify({
        type: 'hello',
        protocolVersion: 2,
        workspaceId: WORKSPACE_ID,
        streamId: 'large',
      }),
    )
    return { socket, inbox }
  }
  const openBrowser = async () => {
    const response = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${workspaceEventsPath('org', WORKSPACE_ID)}`,
      {
        headers: { ...headers, Upgrade: 'websocket' },
      },
    )
    const socket = response.webSocket
    if (!socket) throw new Error('Missing browser socket')
    const inbox = new SocketInbox(socket)
    socket.accept()
    return { socket, inbox }
  }
  try {
    const runner = await runnerSocket()
    expect(await runner.inbox.next()).toMatchObject({
      type: 'welcome',
      confirmedThrough: 0,
    })
    for (let index = 0; index < 6; index++) {
      runner.socket.send(
        JSON.stringify({
          type: 'event',
          streamId: 'large',
          eventNumber: index + 1,
          occurredAt: 25,
          event: parts[index],
        }),
      )
      expect(await runner.inbox.next()).toEqual({
        type: 'confirm',
        streamId: 'large',
        throughEventNumber: index + 1,
      })
    }
    let browser = await openBrowser()
    const pending = await browser.inbox.next()
    expect(pending).toEqual({
      type: 'history',
      history: { events: [], throughEventNumber: 0 },
    })
    await controls.hibernate()
    for (let index = 6; index < parts.length; index++) {
      runner.socket.send(
        JSON.stringify({
          type: 'event',
          streamId: 'large',
          eventNumber: index + 1,
          occurredAt: 25,
          event: parts[index],
        }),
      )
      expect(await runner.inbox.next()).toEqual({
        type: 'confirm',
        streamId: 'large',
        throughEventNumber: index + 1,
      })
    }
    const live = {
      workspaceId: WORKSPACE_ID,
      eventNumber: 1,
      occurredAt: 25,
      event: expected,
    }
    expect(await browser.inbox.next()).toEqual({
      type: 'event',
      envelope: live,
    })
    await closeSockets(runner.socket, browser.socket)
    await runtime.unsafeEvictDurableObject('chat-adapter-tests', 'Workspace', {
      name: WORKSPACE_ID,
    })
    browser = await openBrowser()
    expect(await browser.inbox.next()).toEqual({
      type: 'history',
      history: { events: [live], throughEventNumber: 1 },
    })
    await closeSockets(browser.socket)
  } finally {
    await runtime.dispose()
  }
})
