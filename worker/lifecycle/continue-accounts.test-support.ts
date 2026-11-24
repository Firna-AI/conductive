import { WORKSPACE_ID } from '../chat/harness.test-support'
import type { TestHarness } from '../test-support/harness'
import { continueFixture } from './continue.test-support'

export async function storedAccountFixture(harness: TestHarness) {
  const f = await continueFixture(harness)
  f.boat.server.addAccount({ orgId: 'kept-org', apiKey: 'kept-key' })
  f.boat.server.addAccount({ orgId: 'new-default-org', apiKey: 'new-key' })
  f.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    kept: { kind: 'boat', orgId: 'kept-org', apiKey: 'kept-key' },
  })
  await f.env.DB.prepare(
    "UPDATE workspaces SET provider_account = 'kept' WHERE id = ?",
  )
    .bind(WORKSPACE_ID)
    .run()
  return f
}
