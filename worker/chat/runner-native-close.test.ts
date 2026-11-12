import { expect, it } from 'vitest'

import { createAdapterRuntime } from './adapter-runtime.test-support'
import { BROWSER_TEST_NOW } from './browser-clock.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { record, string } from './inputs'
import { runnerControls, disposeRunners } from './runner-native.test-support'

it('retires runner authority and file ownership when close is the first wake event', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/runner-entry.test-support.ts',
  )
  const controls = runnerControls(runtime, headers)
  const runner = await controls.connect()
  try {
    runner.emit({ type: 'runner.ready' })
    expect(await runner.inbox.next()).toEqual({
      type: 'confirm',
      streamId: 'native-runner',
      throughEventNumber: 1,
    })
    const before = await controls.request('settled')
    const id = string(record(before.runner).id)
    expect(before.fileBinding).toBe(id)
    expect(before.fileDetached).toEqual([])
    expect(before.detached).toBe(0)
    expect(before.alarm).toBe(BROWSER_TEST_NOW + 15_000)
    // Model a disconnected socket omitted from the next constructor listing.
    await controls.request('prepare-close')
    await runtime.unsafeEvictDurableObject('chat-adapter-tests', 'Workspace', {
      name: WORKSPACE_ID,
      webSockets: 'hibernate',
    })
    expect(runner.socket.readyState).toBe(1)
    runner.socket.close(1000, 'Close the sleeping runner.')
    expect(await runner.closed).toMatchObject({ code: 1000 })
    const after = await controls.request('close-handled')
    expect(after.instance).not.toBe(before.instance)
    expect(after.closeEvent).toEqual({
      first: 'close',
      completed: 1,
      errors: 0,
      omitted: 1,
      omittedIds: [id],
    })
    expect(after.runner).toBeNull()
    expect(after.detached).toBe(1)
    expect(after.fileAttached).toEqual([id])
    expect(after.fileDetached).toEqual([id])
    expect(after.fileBinding).toBeNull()
    expect(after.alarm).toBeNull()
    expect(after.hello).toBe(1)
    expect(after.ready).toBe(1)
    expect(after.reads).toBe(before.reads)
    expect(after.now).toBe(BROWSER_TEST_NOW)
    expect(runner.received.map((value) => record(value).type)).toEqual([
      'welcome',
      'confirm',
    ])
    const again = await controls.request('close')
    expect(again.detached).toBe(1)
    expect(again.fileDetached).toEqual([id])
    expect(again.closeEvent).toEqual(after.closeEvent)
    expect(again.runner).toBeNull()
  } finally {
    await disposeRunners(runtime, [runner.socket])
  }
})
