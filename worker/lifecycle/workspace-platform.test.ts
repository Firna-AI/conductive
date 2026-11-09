import { expect, it } from 'vitest'

import { MemoryWorkspaceStorage } from './platform-test-storage'
import { nativeWorkspacePlatform } from './workspace-platform'

it('rethrows a failed operation after the native blocking callback succeeds', async () => {
  const failure = new Error('The first message was refused')
  let rejectedCallbacks = 0
  let completedCallbacks = 0
  const platform = nativeWorkspacePlatform(
    {
      blockConcurrencyWhile: async (operation) => {
        try {
          return await operation()
        } catch (error) {
          rejectedCallbacks++
          throw error
        } finally {
          completedCallbacks++
        }
      },
      waitUntil: () => {},
    },
    async () => {},
    new MemoryWorkspaceStorage(),
  )
  expect(await platform.blockConcurrencyWhile(async () => 'admitted')).toBe(
    'admitted',
  )
  await expect(
    platform.blockConcurrencyWhile(async () => {
      throw failure
    }),
  ).rejects.toBe(failure)
  expect(completedCallbacks).toBe(2)
  expect(rejectedCallbacks).toBe(0)
})
