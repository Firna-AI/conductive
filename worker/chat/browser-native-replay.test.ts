import type { WebSocket } from 'miniflare'
import { expect, it } from 'vitest'

import { createAdapterRuntime } from './adapter-runtime.test-support'
import { array } from './agent-events'
import {
  browserControls,
  disposeBrowsers,
  seedBrowserRuntime,
} from './browser-native.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { number, record } from './inputs'

it('answers the events socket and sends its first history page while a later page waits', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/browser-entry.test-support.ts',
  )
  const sockets: WebSocket[] = []
  const controls = browserControls(runtime, headers)
  let opening: ReturnType<typeof controls.open> | undefined
  try {
    await seedBrowserRuntime(runtime)
    for (let index = 0; index < 40; index++)
      await controls.request('publish', { workspaceId: WORKSPACE_ID })
    // A page reads 32 events, so the replay takes two pages. The second waits.
    await controls.request('history-hold', { list: 2 })
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
