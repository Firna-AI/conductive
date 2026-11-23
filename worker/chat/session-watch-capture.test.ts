import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { watchFixture, type WatchFixture } from './session-watch.test-support'
import { chatKey } from './storage-keys'

let harness: TestHarness
let f: WatchFixture
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
beforeEach(async () => {
  f = await watchFixture(harness)
})
afterAll(async () => {
  await harness.dispose()
})

it('captures the calling turn and Stop nonce in one queue turn while Stop waits', async () => {
  let enter: () => void = () => {}
  let release: () => void = () => {}
  const entered = new Promise<void>((resolve) => {
    enter = resolve
  })
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let intercepted = false
  await f.setStorageHooks({
    afterRead: async (key) => {
      if (!intercepted && key === chatKey('turn', f.calling.turnId)) {
        intercepted = true
        enter()
        await held
      }
    },
  })
  const capture = f.actor.rpc.callingWatchTurn(WORKSPACE_ID, f.calling.turnId)
  try {
    await entered
    const queued = await f.observeNextQueued()
    const stopping = f.stop()
    await queued.queued
    release()
    const caller = await capture
    expect(caller).toMatchObject({ turnId: f.calling.turnId, stopNonce: null })
    await stopping
    await queued.restore()
    await f.clearFaults()
    expect(
      await f.chat.store.read(WORKSPACE_ID, (view) =>
        view.watches.stopNonce(f.source.id),
      ),
    ).not.toBe(null)
    await f.finishTarget('finished')
    await f.fire()
    expect(await f.receipt()).toMatchObject({ state: 'suppressed' })
    expect(await f.notices()).toEqual([])
  } finally {
    release()
    await f.clearFaults()
  }
})
