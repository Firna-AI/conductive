import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { conductorOldDocumentPath } from '../../src/shared/conductor-import.ts'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { cleanupExpiredImports, cleanupImportWork } from './cleanup'
import { importServiceName } from './runtime'
import { importFixture, type ImportFixture } from './service.test-support'
import { keysForScope } from './storage.test-support'
import { readImportCleanup } from './cleanup-data'

let harness: TestHarness
let fixture: ImportFixture
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  fixture = await importFixture(harness)
})
afterAll(async () => {
  await harness.dispose()
})

it('deletes only work after successful activation and keeps old documents through final target-expiry cleanup', async () => {
  await fixture.prepare('reservation', fixture.service)
  await fixture.verifyAll()
  await fixture.control({ kind: 'complete', reservationId: 'reservation' })
  await fixture.db
    .prepare(
      "UPDATE workspaces SET activation_completed_at = ?,state = 'stopped' WHERE id = 'reservation'",
    )
    .bind(TEST_TIME)
    .run()
  const name = importServiceName('reservation')
  await harness.native.actor(name).ready
  await cleanupImportWork(fixture.env, fixture.org.id, 'reservation')
  const bucket = fixture.env.CHAT_ATTACHMENTS
  if (!bucket) throw new Error('Missing local R2.')
  expect((await keysForScope(bucket, fixture.service.scope)).length).toBe(4)
  expect(await readImportCleanup(fixture.db, 'reservation')).toMatchObject({
    group: 'work',
    finishedAt: null,
    dueAt: TEST_TIME + 300_000,
  })
  await fixture.setTime(TEST_TIME + 300_000)
  await harness.native.advanceTo(TEST_TIME + 300_000, [name])
  expect(await readImportCleanup(fixture.db, 'reservation')).toMatchObject({
    group: 'work',
    finishedAt: TEST_TIME + 300_000,
  })
  const document = await fixture.request(
    conductorOldDocumentPath(fixture.org.id, 'reservation', 'old-session'),
  )
  expect(document.status).toBe(200)
  expect(await document.text()).toBe('first\nsecond\n')
  expect((await keysForScope(bucket, fixture.service.scope)).length).toBe(4)
  await fixture.db
    .prepare('DELETE FROM orgs WHERE id = ?')
    .bind(fixture.org.id)
    .run()
  expect(await cleanupExpiredImports(fixture.env, TEST_TIME + 300_000)).toEqual(
    { pending: [] },
  )
  expect(await keysForScope(bucket, fixture.service.scope)).toEqual([])
})
