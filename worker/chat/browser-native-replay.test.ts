import type { WebSocket } from 'miniflare'
import { expect, it } from 'vitest'

import { workspaceEventsPath } from '../../src/shared/events'
import { TEST_ORIGIN } from '../test-support/harness'
import { createAdapterRuntime } from './adapter-runtime.test-support'
import { array } from './agent-events'
import {
  browserControls,
  disposeBrowsers,
  seedBrowserRuntime,
} from './browser-native.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { BROWSER_TEST_NOW } from './browser-clock.test-support'
import { historyMemory } from './history-memory.test-support'
import { saveHistoryEvent } from './history-storage'
import { number, record } from './inputs'
import { completeReport } from './runner-grown-reports.test-support'
import { chatEventKey } from './storage-keys'

/** The file report at event 32 takes the replay to its page byte limit. */
async function replayRuntime() {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/browser-entry.test-support.ts',
  )
  const controls = browserControls(runtime, headers)
  await seedBrowserRuntime(runtime)
  for (let index = 0; index < 40; index++)
    await controls.request('publish', { workspaceId: WORKSPACE_ID })
  const { records, storage } = historyMemory()
  await saveHistoryEvent(storage, chatEventKey(32), {
    workspaceId: WORKSPACE_ID,
    eventNumber: 32,
    occurredAt: BROWSER_TEST_NOW,
    event: completeReport('tree'),
  })
  await controls.request('seed', { values: Object.fromEntries(records) })
  return { runtime, headers, controls }
}

it('answers the events socket and sends its first history page while a later page waits', async () => {
  const { runtime, controls } = await replayRuntime()
  const sockets: WebSocket[] = []
  let opening: ReturnType<typeof controls.open> | undefined
  try {
    // The first page reads eight batches. Hold the first list of page two.
    await controls.request('history-hold', { list: 9 })
    opening = controls.open()
    await controls.request('history-entered')
    expect((await controls.request('inspect')).answered).toBe(1)
    const tab = await opening
    sockets.push(tab.socket)
    expect(record(tab.history).history).toMatchObject({
      throughEventNumber: 40,
      hasMore: true,
      nextAfterEventNumber: 32,
    })
    await controls.request('history-release')
    const last = record(record(await tab.inbox.next()).history)
    expect(last).not.toHaveProperty('hasMore')
    expect(
      array(last.events, record).map((event) => number(event.eventNumber)),
    ).toEqual([33, 34, 35, 36, 37, 38, 39, 40])
  } finally {
    // A failed case can leave the upgrade waiting until the runtime ends.
    void opening?.catch(() => undefined)
    await disposeBrowsers(runtime, sockets)
  }
})

it('closes the events socket and logs one unexpected error when a later history page fails', async () => {
  const { runtime, controls } = await replayRuntime()
  const sockets: WebSocket[] = []
  try {
    await controls.request('capture-warnings')
    await controls.request('history-fail', { list: 9 })
    const tab = await controls.open()
    sockets.push(tab.socket)
    expect(record(tab.history).history).toMatchObject({
      hasMore: true,
      nextAfterEventNumber: 32,
    })
    await controls.request('closed', { count: 1 })
    await controls.request('settled')
    const state = await controls.request('inspect')
    expect(
      array(state.sockets, record).filter((socket) => socket.readyState === 1),
    ).toEqual([])
    expect(state.registrations).toEqual([])
    const warnings = array(state.warnings, (call) =>
      record(array(call, (value) => value)[0]),
    )
    expect(
      warnings.filter((warning) => warning.kind === 'unexpected_error'),
    ).toEqual([
      expect.objectContaining({
        errorName: 'Error',
        method: 'GET',
        route: '/api/orgs/*/workspaces/*/events',
      }),
    ])
  } finally {
    await disposeBrowsers(runtime, sockets)
  }
})

it('answers an events upgrade with an invalid cursor with 400 invalid_input', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/browser-entry.test-support.ts',
  )
  try {
    await seedBrowserRuntime(runtime)
    const response = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${workspaceEventsPath('org', WORKSPACE_ID, -1)}`,
      { headers: { ...headers, Upgrade: 'websocket' } },
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_input' },
    })
  } finally {
    await runtime.dispose()
  }
})
