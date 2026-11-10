import { afterAll, afterEach, beforeAll } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import type { NativeWorkspaceOptions } from '../test-support/native-workspace-api'
import type { NativeStorageHooks } from '../test-support/native-storage'

let harness: Promise<TestHarness> | undefined
let sequence = 0
beforeAll(async () => {
  await (harness ??= createHarness())
})

afterEach(async () => {
  if (harness) await (await harness).reset()
})
afterAll(async () => {
  if (harness) await (await harness).dispose()
})

export async function nativeChatStore(workspaceId = 'workspace', now = 25) {
  const shared = await (harness ??= createHarness())
  await shared.reset()
  const actor = shared.native.actor(workspaceId)
  const options: NativeWorkspaceOptions = {}
  await actor.configure(options)
  await actor.api.controls.setTime(now)
  const setStorageHooks = async (hooks: NativeStorageHooks) => {
    options.hooks = hooks
    await actor.configure(options)
  }
  return {
    harness: shared,
    actor,
    storage: actor.api.storage,
    store: actor.api.chat.store,
    snapshot: actor.api.controls.snapshot,
    setStorageHooks,
    clearFaults: () => setStorageHooks({}),
    failNextCommit: (boundary: 'before' | 'after', message: string) => {
      let failed = false
      return setStorageHooks({
        [boundary === 'before' ? 'beforeCommit' : 'afterCommit']: async () => {
          if (!failed) {
            failed = true
            throw new Error(message)
          }
        },
      })
    },
    nextId: () => `native-case-${++sequence}`,
    configure: async (next: NativeWorkspaceOptions) => {
      Object.assign(options, next)
      await actor.configure(options)
    },
  }
}
