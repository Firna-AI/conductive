import { afterAll, beforeAll } from 'vitest'

import { createHarness, type TestHarness } from '../../test-support/harness'
import { FakeE2b } from '../../test-support/fake-e2b'
import { E2bClient } from './client'

export function e2bFixture() {
  let harness: TestHarness
  beforeAll(async () => {
    harness = await createHarness()
  })
  afterAll(async () => {
    await harness.dispose()
  })
  return () => {
    const server = new FakeE2b()
    const options = {
      accountId: crypto.randomUUID(),
      apiKey: server.apiKey,
      domain: server.domain,
      templateId: 'base-template',
      db: harness.env.DB,
      encryptionKey: harness.env.BOAT_KEY_ENCRYPTION_KEY,
      fetch: server.fetch,
    }
    return {
      server,
      harness,
      options,
      db: harness.env.DB,
      client: new E2bClient(options),
    }
  }
}

export const createInput = {
  name: 'Workspace',
  ttlSeconds: 1800,
  idempotencyKey: 'request-one',
  env: { WORKSPACE_TOKEN: 'workspace-secret' },
  labels: { org: 'org-one' },
}
