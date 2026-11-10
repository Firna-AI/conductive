import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { beforeFirstListBatch } from '../app-api/shell-list.test-support'
import { importFixture, type ImportFixture } from './service.test-support'

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

it('refuses publication after chosen-repository removal and an overlapping org suspension without allocating a workspace number', async () => {
  await fixture.prepare('reservation', fixture.service)
  await fixture.verifyAll()
  await fixture.db
    .prepare("UPDATE repositories SET selected = 0 WHERE id = 'import-repo'")
    .run()
  await expect(
    fixture.control({ kind: 'complete', reservationId: 'reservation' }),
  ).rejects.toMatchObject({ code: 'import_unavailable' })
  await fixture.db
    .prepare("UPDATE repositories SET selected = 1 WHERE id = 'import-repo'")
    .run()
  const race = beforeFirstListBatch(fixture.db, async () => {
    await fixture.db
      .prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
      .bind(fixture.dependencies.now(), fixture.org.id)
      .run()
  })
  await expect(
    fixture.make('reservation', { DB: race.db }).control(fixture.actor, {
      kind: 'complete',
      reservationId: 'reservation',
    }),
  ).rejects.toMatchObject({ code: 'import_unavailable' })
  expect(
    await fixture.db
      .prepare('SELECT workspace_number_count FROM orgs WHERE id = ?')
      .bind(fixture.org.id)
      .first('workspace_number_count'),
  ).toBe(0)
  expect(
    await fixture.db
      .prepare(
        "SELECT COUNT(*) AS count FROM sections WHERE name = 'Import from Conductor'",
      )
      .first('count'),
  ).toBe(0)
})
