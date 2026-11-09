import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import {
  memberFixture,
  membersClient,
  seedWorkspace,
} from './members-test-support'

export async function deletionFixture(harness: TestHarness) {
  const fixture = await memberFixture(harness)
  const { org, admin, member } = fixture
  await seedWorkspace(harness, org, member.user)
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      `INSERT INTO image_builds (id, org_id, kind, state, sandbox_id, snapshot_name,
       settings_revision, runner_protocol_version, started_by_user_id, started_at, provider_account)
       VALUES ('build-one', ?, 'build', 'running', 'build-sandbox', 'build-image', 1, 1, ?, ?, ?)`,
    ).bind(org.id, admin.user.id, TEST_TIME, DEFAULT_PROVIDER_ACCOUNT),
    harness.env.DB.prepare(
      "UPDATE settings SET org_image_name = 'org-image', image_build_id = 'build-one' WHERE org_id = ?",
    ).bind(org.id),
    harness.env.DB.prepare(
      `INSERT INTO preview_hostnames (id, hostname, org_id, workspace_id, port, created_at, expires_at, provider_account)
       VALUES ('preview-one', 'random.preview.test', ?, 'workspace-one', 3000, ?, ?, ?)`,
    ).bind(org.id, TEST_TIME, TEST_TIME + 86400000, DEFAULT_PROVIDER_ACCOUNT),
    harness.env.DB.prepare(
      "INSERT INTO workspace_tokens (workspace_id, token_hash, ciphertext, created_at) VALUES ('workspace-one', 'workspace-hash', 'encrypted-token', ?)",
    ).bind(TEST_TIME),
    harness.env.DB.prepare(
      `INSERT INTO terminal_credentials (workspace_id, ciphertext, updated_at, provider_account)
       VALUES ('workspace-one', 'encrypted-terminal', ?, ?)`,
    ).bind(TEST_TIME, DEFAULT_PROVIDER_ACCOUNT),
  ])
  harness.boat.requests = []
  return { ...fixture, client: membersClient(harness) }
}

export function providerRequests(harness: TestHarness) {
  return harness.boat.requests.map(
    (request) =>
      `${request.method} ${new URL(request.url).pathname.replace('/api/v1', '')}`,
  )
}
