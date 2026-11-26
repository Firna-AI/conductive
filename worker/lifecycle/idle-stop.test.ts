import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { IdleStopTime, workspaceAutoStopSeconds } from './idle-stop'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterAll(async () => harness.dispose())

async function saveMinutes(minutes: number): Promise<void> {
  await harness.env.DB.prepare(
    'UPDATE idle_stop_settings SET minutes = ? WHERE id = 1',
  )
    .bind(minutes)
    .run()
}

/** A database whose every read fails. */
const brokenDb = {
  prepare: () => ({
    first: async () => {
      throw new Error('D1 is down')
    },
  }),
} as unknown as D1Database

it('gives the provider auto-stop the saved stop time plus a minute', async () => {
  const db = harness.env.DB
  expect(await workspaceAutoStopSeconds(db)).toBe(1_860)
  await saveMinutes(90)
  expect(await workspaceAutoStopSeconds(db)).toBe(5_460)
  await saveMinutes(7)
  expect(await workspaceAutoStopSeconds(db)).toBe(1_860)
  expect(await workspaceAutoStopSeconds(brokenDb)).toBe(7_260)
})

it('keeps a read stop time for a minute and keeps it when a read fails', async () => {
  let now = 0
  await saveMinutes(60)
  const time = new IdleStopTime(harness.env.DB, () => now)
  expect(await time.ms()).toBe(3_600_000)
  await saveMinutes(15)
  now = 59_999
  expect(await time.ms()).toBe(3_600_000)
  now = 60_000
  expect(await time.ms()).toBe(900_000)
  const fresh = new IdleStopTime(brokenDb, () => 0)
  expect(await fresh.ms()).toBe(1_800_000)
  let broken = false
  const switching = {
    prepare: (query: string) =>
      broken ? brokenDb.prepare(query) : harness.env.DB.prepare(query),
  } as unknown as D1Database
  const kept = new IdleStopTime(switching, () => now)
  expect(await kept.ms()).toBe(900_000)
  broken = true
  now = 200_000
  expect(await kept.ms()).toBe(900_000)
})
