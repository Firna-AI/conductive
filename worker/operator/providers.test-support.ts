import { afterAll, beforeAll, beforeEach } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'

export function setupProviderTests() {
  let harness: TestHarness
  beforeAll(async () => {
    harness = await createHarness()
  })
  beforeEach(async () => {
    await harness.reset()
    harness.env.OPERATOR_GITHUB_IDS = '7'
    harness.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
      e2b: {
        kind: 'e2b',
        apiKey: 'private-e2b-key',
        domain: 'eu.e2b.dev',
        templateId: 'private-template',
      },
    })
  })
  afterAll(async () => harness.dispose())
  return () => harness
}
