import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { importFixture, type ImportFixture } from './service.test-support'
import { ENTRIES, SNAPSHOT } from './manifest.test-support'

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

it('keeps an inconsistent ordered object inventory private and refuses targets before its manifest is complete', async () => {
  await fixture.control({ kind: 'reserve', row: fixture.source })
  await fixture.control({
    kind: 'snapshot',
    reservationId: 'reservation',
    snapshot: SNAPSHOT,
  })
  const entries = ENTRIES.map((entry) =>
    entry.kind === 'part' && entry.part.id === 'second'
      ? { ...entry, index: 3 }
      : entry,
  )
  await fixture.control({
    kind: 'manifest',
    reservationId: 'reservation',
    offset: 0,
    entries,
  })
  await expect(
    fixture.control({ kind: 'manifest.end', reservationId: 'reservation' }),
  ).rejects.toMatchObject({ code: 'import_unavailable' })
  await expect(
    fixture.control({
      kind: 'target',
      reservationId: 'reservation',
      partId: 'first',
    }),
  ).rejects.toMatchObject({ code: 'import_unavailable' })
  expect(
    await fixture.db
      .prepare(
        "SELECT manifest_closed FROM conductor_import_reservations WHERE id = 'reservation'",
      )
      .first('manifest_closed'),
  ).toBe(0)
  expect(
    await fixture.db
      .prepare('SELECT COUNT(*) AS count FROM workspaces')
      .first('count'),
  ).toBe(0)
})
