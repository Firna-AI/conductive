import { expect, it } from 'vitest'
import { databaseResources } from './resources.ts'
import { emptyDatabase, seedResources } from './d1.test-support.ts'
import { fakeContext } from './operations.test-support.ts'

it('collects every snapshot column and each build-derived name without duplicates', async () => {
  const { ctx } = fakeContext(async (db) => {
    await seedResources(db, 'build-snapshot')
    await db.batch([
      db.prepare(
        "INSERT INTO workspace_creation_attempts (workspace_id, org_id, sender_user_id, first_message_id, created_at) VALUES ('workspace-a', 'org-a', 'user-a', 'message-a', 0)",
      ),
      db.prepare(
        "INSERT INTO image_leases (workspace_id, org_id, snapshot_name) VALUES ('workspace-a', 'org-a', 'leased-snapshot')",
      ),
      db.prepare('CREATE TABLE image_claim_leases (snapshot_name TEXT)'),
      db.prepare("INSERT INTO image_claim_leases VALUES ('leased-snapshot')"),
      db.prepare(
        "INSERT INTO software_images (id, provider_account, version, software_json, snapshot_name, state, phase, token_digest, started_at) VALUES ('software-a', 'boat', 'v1', '[]', 'software-snapshot', 'ready', 'done', 'test-digest', 0)",
      ),
      db.prepare('CREATE TABLE z_future_images (snapshot_name TEXT)'),
      db.prepare(
        "INSERT INTO z_future_images VALUES ('future-snapshot'), (NULL)",
      ),
    ])
  })
  await expect(databaseResources(ctx, 'conductive-pr-123')).resolves.toEqual({
    orgIds: ['org-a'],
    snapshots: [
      'build-snapshot',
      'leased-snapshot',
      'software-snapshot',
      'future-snapshot',
      'image-me',
    ],
  })
})

it('can clean a database left before the application tables were created', async () => {
  const { ctx, database } = fakeContext(emptyDatabase)
  await database()
  await expect(databaseResources(ctx, 'conductive-pr-123')).resolves.toEqual({
    orgIds: [],
    snapshots: [],
  })
})
