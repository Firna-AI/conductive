import { expect, it, vi } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { keepWorkspaceDisk } from './disk-retention'
import { stoppedRetentionFixture } from './retention-dates-test-support'

const fixtureForTest = setupBackendTests()

it('does not restart an E2B disk at a retention deadline', async () => {
  const fixture = await stoppedRetentionFixture(fixtureForTest())
  const { runtime, org, id } = fixture
  runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    e2b: {
      kind: 'e2b',
      apiKey: 'e2b-test-key',
      domain: 'eu.e2b.dev',
      templateId: 'test-template',
    },
  })
  await runtime.env.DB.prepare(
    'UPDATE workspaces SET provider_account = ?, sandbox_id = ? WHERE id = ?',
  )
    .bind('e2b', 'e2b-retention-disk', id)
    .run()
  const fetch = vi.fn(async () =>
    Response.json({ sandboxID: 'e2b-retention-disk', state: 'running' }),
  )
  const command = {
    read: () => ({
      attempt: 'unused-retention',
      processId: null,
      stdoutOffset: 0,
      stderrOffset: 0,
    }),
    save: async () => {},
  }
  await expect(
    keepWorkspaceDisk(
      {
        env: runtime.env,
        dependencies: { ...runtime.dependencies, fetch },
        orgId: org.id,
        workspaceId: id,
      },
      TEST_TIME + 1_000,
      command,
      true,
    ),
  ).resolves.toEqual({
    done: true,
    error: null,
    stoppedAt: null,
    eligible: false,
  })
  expect(fetch.mock.calls).toEqual([])
})
