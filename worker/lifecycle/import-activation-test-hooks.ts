import { beforeAll, beforeEach, afterAll } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { activationFixture } from './import-activation.test-support'

export function setupActivationTests(largeCode = false) {
  let harness: TestHarness
  let fixture: Awaited<ReturnType<typeof activationFixture>>
  beforeAll(async () => {
    harness = await createHarness()
  })
  beforeEach(async () => {
    await harness.reset()
    fixture = await activationFixture(harness, largeCode)
  })
  afterAll(async () => {
    await harness.dispose()
  })
  return () => fixture
}
