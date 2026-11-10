import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

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
import { deletionFixture, providerRequests } from './deletion-test-support'

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
afterEach(() => vi.restoreAllMocks())

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

it('continues native deleted-org cleanup after one import sweep query fails and logs only a fixed warning', async () => {
  const { org, admin, client } = await deletionFixture(harness)
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
  let faults = 0
  const database = new Proxy(harness.env.DB, {
    get(target, key) {
      if (key === 'prepare')
        return (query: string) => {
          if (faults === 0 && query.includes('FROM conductor_import_cleanup')) {
            faults += 1
            return target.prepare(
              query.replace(
                'FROM conductor_import_cleanup',
                'FROM private_import_query_fault',
              ),
            )
          }
          return target.prepare(query)
        }
      const member: unknown = Reflect.get(target, key)
      return typeof member === 'function' ? member.bind(target) : member
    },
  })
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  await expect(
    cleanupDeletedOrgs(
      { ...harness.env, DB: database },
      client.dependencies,
      client.hooks,
    ),
  ).resolves.toEqual({ purged: [org.id], pending: [] })
  expect(faults).toBe(1)
  expect(
    await harness.env.DB.prepare('SELECT id FROM orgs WHERE id = ?')
      .bind(org.id)
      .first(),
  ).toBeNull()
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces WHERE org_id = ?',
    )
      .bind(org.id)
      .first('count'),
  ).toBe(0)
  expect(client.removedWorkspaceState).toEqual([`${org.id}/workspace-one`])
  expect(
    providerRequests(harness).filter((request) =>
      request.startsWith('DELETE '),
    ),
  ).toEqual([
    'DELETE /saved-snapshots/build-image',
    'DELETE /saved-snapshots/org-image',
    'DELETE /sandboxes/sandbox-workspace-one',
    'DELETE /sandboxes/build-sandbox',
  ])
  expect(warning.mock.calls).toEqual([
    [
      {
        kind: 'import_cleanup_retry',
        message: 'An import cleanup will retry.',
      },
    ],
  ])
})
