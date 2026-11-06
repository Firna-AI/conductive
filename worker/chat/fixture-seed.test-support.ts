import { encrypt, hash } from '../security/crypto'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { agentLoginContext } from './queries'

export async function seedChatFixture(
  harness: TestHarness,
  workspaceId: string,
  workspaceToken: string,
) {
  const ownerCookie = await harness.login()
  const org = await harness.createOrg(ownerCookie)
  const owner = await harness.env.DB.prepare(
    'SELECT id FROM users WHERE github_id = 7',
  ).first<{ id: string }>()
  if (!owner) throw new Error('The owner is missing.')
  harness.github.profile = {
    id: 8,
    login: 'teammate',
    name: 'Teammate',
    avatar_url: null,
  }
  const memberCookie = await harness.login()
  const member = await harness.env.DB.prepare(
    'SELECT id FROM users WHERE github_id = 8',
  ).first<{ id: string }>()
  if (!member) throw new Error('The member is missing.')
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      'INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
    ).bind(org.id, member.id, 'member', TEST_TIME),
    harness.env.DB.prepare(
      'INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES (?, ?, ?, ?, ?)',
    ).bind('repo', org.id, 10, 'example/repo', 'main'),
    harness.env.DB.prepare(
      'INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      workspaceId,
      org.id,
      'repo',
      owner.id,
      'Test',
      'octocat/test',
      TEST_TIME,
      TEST_TIME,
    ),
  ])
  await harness.env.DB.prepare(
    'INSERT INTO workspace_tokens (workspace_id, token_hash, ciphertext, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(
      workspaceId,
      await hash(workspaceToken),
      'unused-token-ciphertext',
      TEST_TIME,
    )
    .run()
  for (const user of [owner, member]) {
    for (const agent of ['claude', 'codex'] as const) {
      await harness.env.DB.prepare(
        'INSERT INTO agent_logins (user_id, agent, kind, ciphertext, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(
          user.id,
          agent,
          'api-key',
          await encrypt(
            `secret-${user.id}-${agent}`,
            agentLoginContext(user.id, agent),
            harness.env.BOAT_KEY_ENCRYPTION_KEY,
          ),
          TEST_TIME,
          TEST_TIME,
        )
        .run()
    }
  }
  return { org, owner, member, ownerCookie, memberCookie }
}
