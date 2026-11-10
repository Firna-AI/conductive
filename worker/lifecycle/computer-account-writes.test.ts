import { expect, it } from 'vitest'

import { seedWorkspace } from '../members/members-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { computerRecords } from './computer-ledger.test-support'

const fixtureForTest = setupBackendTests()

const writers = [
  {
    table: 'workspaces',
    key: 'id',
    prefix: 'writer-',
    column: 'sandbox_id',
    insert: `INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id,
      name, branch, sandbox_id, provider_account, state, created_at, updated_at)
      SELECT 'writer-' || ?1, org_id, repository_id, owner_user_id, section_id,
      'Lisbon', 'ledger/writer', ?2, ?3, 'working', 0, 0 FROM workspaces WHERE id = 'parent-' || ?1`,
  },
  {
    table: 'image_builds',
    key: 'id',
    prefix: 'writer-',
    column: 'sandbox_id',
    insert: `INSERT INTO image_builds (id, org_id, kind, state, sandbox_id, provider_account,
      settings_revision, runner_protocol_version, started_by_user_id, started_at)
      SELECT 'writer-' || ?1, org_id, 'build', 'succeeded', ?2, ?3, 1, 1, owner_user_id, 0
      FROM workspaces WHERE id = 'parent-' || ?1`,
  },
  {
    table: 'lifecycle_sandbox_cleanup',
    key: 'workspace_id',
    prefix: 'writer-',
    column: 'sandbox_id',
    insert: `INSERT INTO lifecycle_sandbox_cleanup (workspace_id, org_id, sandbox_id, provider_account)
      SELECT 'writer-' || ?1, org_id, ?2, ?3 FROM workspaces WHERE id = 'parent-' || ?1`,
  },
  {
    table: 'preview_hostnames',
    key: 'id',
    prefix: 'writer-',
    column: 'listener_sandbox_id',
    insert: `INSERT INTO preview_hostnames (id, hostname, org_id, workspace_id, port,
      created_at, expires_at, listener_sandbox_id, provider_account)
      SELECT 'writer-' || ?1, 'writer-' || ?1 || '.test', org_id, id, 3000, 0, 1, ?2, ?3
      FROM workspaces WHERE id = 'parent-' || ?1`,
  },
  {
    table: 'terminal_credentials',
    key: 'workspace_id',
    prefix: 'parent-',
    column: 'sandbox_id',
    insert: `INSERT INTO terminal_credentials (workspace_id, ciphertext, updated_at, sandbox_id, provider_account)
      SELECT id, 'ciphertext', 0, ?2, ?3 FROM workspaces WHERE id = 'parent-' || ?1`,
  },
  {
    table: 'image_source_jobs',
    key: 'build_id',
    prefix: 'writer-',
    column: 'sandbox_id',
    insert: `INSERT INTO image_source_jobs (build_id, org_id, sandbox_id, provider_account, phase)
      SELECT 'writer-' || ?1, org_id, ?2, ?3, 'ready' FROM workspaces WHERE id = 'parent-' || ?1`,
  },
  {
    table: 'org_deletion_resources',
    key: 'resource_id',
    prefix: '',
    column: 'resource_id',
    insert: `INSERT INTO org_deletion_resources (org_id, kind, resource_id, provider_account)
      SELECT org_id, 'sandbox', ?2, ?3 FROM workspaces WHERE id = 'parent-' || ?1`,
  },
] as const

it.each(writers)(
  'retains account and ID history from $table writes',
  async (writer) => {
    const { runtime, harness, org, user, repositoryId } = fixtureForTest()
    const db = runtime.env.DB
    for (const id of ['parent-0', 'parent-1'])
      await seedWorkspace(harness, org, user, id, repositoryId, null)
    await db
      .prepare('INSERT INTO org_deletions (org_id) VALUES (?)')
      .bind(org.id)
      .run()
    for (const [index, account] of ['boat', 'boat-second'].entries())
      await db
        .prepare(writer.insert)
        .bind(String(index), 'shared-computer', account)
        .run()
    const identities = async () =>
      (await computerRecords(db)).map((row) => ({
        sandboxId: row.sandboxId,
        providerAccount: row.providerAccount,
      }))
    expect(await identities()).toEqual([
      { sandboxId: 'shared-computer', providerAccount: 'boat' },
      { sandboxId: 'shared-computer', providerAccount: 'boat-second' },
    ])
    const key =
      writer.table === 'org_deletion_resources'
        ? 'shared-computer'
        : `${writer.prefix}0`
    await db
      .prepare(
        `UPDATE ${writer.table} SET provider_account = 'boat-third'
    WHERE ${writer.key} = ? AND provider_account = 'boat'`,
      )
      .bind(key)
      .run()
    expect(await identities()).toEqual([
      { sandboxId: 'shared-computer', providerAccount: 'boat' },
      { sandboxId: 'shared-computer', providerAccount: 'boat-second' },
      { sandboxId: 'shared-computer', providerAccount: 'boat-third' },
    ])
    await db
      .prepare(
        `UPDATE ${writer.table} SET ${writer.column} = 'replacement-computer'
    WHERE ${writer.key} = ? AND provider_account = 'boat-third'`,
      )
      .bind(key)
      .run()
    expect(await identities()).toEqual([
      { sandboxId: 'shared-computer', providerAccount: 'boat' },
      { sandboxId: 'shared-computer', providerAccount: 'boat-second' },
      { sandboxId: 'shared-computer', providerAccount: 'boat-third' },
      { sandboxId: 'replacement-computer', providerAccount: 'boat-third' },
    ])
  },
)
