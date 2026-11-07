import { afterAll, beforeAll, beforeEach } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { backendFixture } from './backend-test-support'

/** Each file owns its database runtime. Each test gets reset rows and fresh fakes. */
export function setupBackendTests() {
  let harness: TestHarness
  let fixture: Awaited<ReturnType<typeof backendFixture>>
  beforeAll(async () => {
    harness = await createHarness()
  })
  beforeEach(async () => {
    await harness.reset()
    fixture = await backendFixture(harness)
  })
  afterAll(async () => {
    await harness.dispose()
  })
  return () => fixture
}
