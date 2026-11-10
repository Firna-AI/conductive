import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { deleteOrgPath } from '../../src/shared/orgs'
import { readAttachment } from '../chat/attachment-data'
import { attachmentBucket } from '../chat/attachment-record'
import { storeAttachment } from '../chat/attachment-storage'
import { failedAttachmentDeletes } from '../test-support/attachment-r2'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { cleanupDeletedOrgs } from './cleanup'
import { memberFixture, membersClient, write } from './members-test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('keeps a deleted zero-workspace org pending until external draft-file purge succeeds', async () => {
  const { org, admin } = await memberFixture(harness)
  const client = membersClient(harness)
  const file = await storeAttachment(
    harness.env,
    {
      orgId: org.id,
      uploaderUserId: admin.user.id,
      target: { type: 'new-workspace', messageId: 'unsent-first-message' },
      name: 'draft.txt',
      kind: 'file',
      mediaType: 'text/plain',
    },
    new Uint8Array([65]),
    { now: () => TEST_TIME, newId: () => 'org-draft-file' },
  )
  expect(
    (
      await client.request(
        deleteOrgPath(org.id),
        admin.session,
        write({ name: org.name }),
      )
    ).status,
  ).toBe(200)
  client.setTime(TEST_TIME + 604_800_000)
  expect(
    await cleanupDeletedOrgs(
      failedAttachmentDeletes(harness.env),
      client.dependencies,
      client.hooks,
    ),
  ).toEqual({ purged: [], pending: [org.id] })
  expect(await readAttachment(harness.env.DB, file.id)).toMatchObject({
    state: 'deleting',
  })
  expect(
    await harness.env.DB.prepare('SELECT id FROM orgs WHERE id = ?')
      .bind(org.id)
      .first(),
  ).toEqual({ id: org.id })
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [org.id], pending: [] })
  expect(await readAttachment(harness.env.DB, file.id)).toBeNull()
  expect((await attachmentBucket(harness.env).list()).objects).toEqual([])
})
