import { expect, it } from 'vitest'

import { createAdapterRuntime } from './adapter-runtime.test-support'
import { BROWSER_TEST_NOW } from './browser-clock.test-support'
import { runnerControls, disposeRunners } from './runner-native.test-support'

it('keeps the watch window of a runner connection across a wake, to its original end', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/runner-entry.test-support.ts',
  )
  const controls = runnerControls(runtime, headers)
  const streamId = '12345678-1234-4234-8234-123456789abc'
  const runner = await controls.connect(streamId)
  try {
    runner.emit({ type: 'runner.ready' })
    expect(await runner.inbox.next()).toEqual({
      type: 'confirm',
      streamId,
      throughEventNumber: 1,
    })
    // The hello, the flush after it, and the event with its commit stage.
    expect((await controls.request('settled')).marks).toBe(4)
    await controls.request('clock', { now: BROWSER_TEST_NOW + 10_000 })
    await controls.hibernate()
    runner.emit({ type: 'runner.ready' })
    expect(await runner.inbox.next()).toEqual({
      type: 'confirm',
      streamId,
      throughEventNumber: 2,
    })
    expect((await controls.request('settled')).marks).toBe(6)
    await controls.request('clock', { now: BROWSER_TEST_NOW + 30_000 })
    await controls.hibernate()
    runner.emit({ type: 'runner.ready' })
    expect(await runner.inbox.next()).toEqual({
      type: 'confirm',
      streamId,
      throughEventNumber: 3,
    })
    expect((await controls.request('settled')).marks).toBe(6)
  } finally {
    await disposeRunners(runtime, [runner.socket])
  }
})
