import { expect, it } from 'vitest'

import { createAdapterRuntime } from './adapter-runtime.test-support'
import { BROWSER_TEST_NOW } from './browser-clock.test-support'
import { browserControls, disposeBrowsers } from './browser-native.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { array } from './agent-events'
import { record, string } from './inputs'

it('removes the browser registration when close is the first wake event', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/browser-entry.test-support.ts',
  )
  const controls = browserControls(runtime, headers)
  const tab = await controls.open()
  try {
    // Model a disconnected socket omitted from the next constructor listing.
    const before = await controls.request('prepare-close')
    expect(before.opened).toBe(1)
    expect(before.closed).toBe(0)
    expect(before.registrations).toHaveLength(1)
    expect(before.alarm).toBe(BROWSER_TEST_NOW + 15_000)
    const id = string(record(array(before.sockets, record)[0].attachment).id)
    await runtime.unsafeEvictDurableObject('chat-adapter-tests', 'Workspace', {
      name: WORKSPACE_ID,
      webSockets: 'hibernate',
    })
    expect(tab.socket.readyState).toBe(1)
    tab.socket.close(1000, 'Close the sleeping browser.')
    expect(await tab.closed).toEqual({
      code: 1000,
      reason: 'Connection closed.',
    })
    const after = await controls.request('close-handled')
    expect(after.instance).not.toBe(before.instance)
    expect(after.closeEvent).toEqual({
      first: 'close',
      completed: 1,
      errors: 0,
      omitted: 1,
      omittedIds: [id],
    })
    expect(after.registrations).toEqual([])
    expect(after.alarm).toBeNull()
    expect(after.closed).toBe(1)
    expect(after.opened).toBe(1)
    expect(after.reads).toBe(before.reads)
    expect(after.now).toBe(BROWSER_TEST_NOW)
    expect(tab.inbox.received).toEqual([tab.history])
    const again = await controls.request('settled')
    expect(again.closeEvent).toEqual(after.closeEvent)
    expect(again.closed).toBe(1)
    expect(again.registrations).toEqual([])
    expect(again.alarm).toBeNull()
  } finally {
    await disposeBrowsers(runtime, [tab.socket])
  }
})
