import { expect, it } from 'vitest'

import { createHarness } from '../test-support/harness'
import { applyMigrations } from '../test-support/migrations'
import { readWorkspaceCapabilities } from './capabilities-data'

const migration = '202611171200_mac_access_off.sql'

it('turns Mac access off in each existing workspace', async () => {
  const harness = await createHarness({ migrationsBefore: migration })
  const db = harness.env.DB
  try {
    await db.batch([
      db.prepare(
        "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('owner', 1, 'owner', 1, 1)",
      ),
      db.prepare(
        "INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES ('org', 'Org', 'owner', 1)",
      ),
      db.prepare(
        "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES ('org', 'owner', 'admin', 1)",
      ),
      db.prepare(
        "INSERT INTO sections (id, org_id, name, is_default, position, created_at) VALUES ('section', 'org', 'General', 1, 0, 1)",
      ),
      db.prepare(
        "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('repo', 'org', 1, 'owner/repo', 'main')",
      ),
      db.prepare(
        `INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, mac_access, created_at, updated_at)
         VALUES ('on', 'org', 'repo', 'owner', 'section', 'On', 'owner/on', 'working', 1, 1, 1),
                ('off', 'org', 'repo', 'owner', 'section', 'Off', 'owner/off', 'working', 0, 1, 1)`,
      ),
    ])

    await applyMigrations(db, { from: migration })

    const access = await Promise.all(
      ['on', 'off'].map((id) => readWorkspaceCapabilities(db, 'org', id)),
    )
    expect(access.map(({ macAccess }) => macAccess)).toEqual([false, false])
  } finally {
    await harness.dispose()
  }
})
