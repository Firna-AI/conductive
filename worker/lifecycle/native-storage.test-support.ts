import { afterAll, afterEach } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { heldOperation } from '../test-support/held-operation'
import type { NativeStorageHooks } from '../test-support/native-storage'
import { nativeWorkspaceStorage } from './platform-storage'

let harness: Promise<TestHarness> | undefined
let sequence = 0

afterEach(async () => {
  if (harness) await (await harness).reset()
})
afterAll(async () => {
  if (harness) await (await harness).dispose()
})

export async function nativeLifecycleStorage() {
  const shared = await (harness ??= createHarness())
  const actor = shared.native.actor(`native-lifecycle-storage-${++sequence}`)
  const hooks: NativeStorageHooks = {}
  await actor.configure({ hooks })
  return {
    native: actor.api.storage,
    storage: nativeWorkspaceStorage(actor.api.storage),
    holdTransaction: async () => {
      const gate = heldOperation()
      hooks.beforeTransaction = async () => {
        delete hooks.beforeTransaction
        await actor.configure({ hooks })
        await gate.wait()
      }
      await actor.configure({ hooks })
      return gate
    },
  }
}
