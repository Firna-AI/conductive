import { afterAll, beforeAll, beforeEach } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'

export function setupProviderStopTests() {
  let harness: TestHarness
  beforeAll(async () => {
    harness = await createHarness()
  })
  beforeEach(async () => {
    await harness.reset()
  })
  afterAll(async () => {
    await harness.dispose()
  })
  return async () => {
    const fixture = await createChatFixture(harness)
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    return {
      ...fixture,
      harness,
      runner,
      stopForProvider: async () => {
        await fixture.chat.runLifecycle(() =>
          fixture.chat.stopWorkspace(WORKSPACE_ID, { providerStop: true }),
        )
        await fixture.drain()
      },
    }
  }
}
