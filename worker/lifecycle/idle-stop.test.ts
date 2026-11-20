import { expect, it, vi } from 'vitest'

import { IdleStopTime, workspaceAutoStopSeconds } from './idle-stop'

function fakeDb(read: () => Promise<{ minutes: number } | null>) {
  return {
    prepare: () => ({ first: read }),
  } as unknown as D1Database
}

it('gives the provider auto-stop the stop time plus a minute', async () => {
  expect(
    await workspaceAutoStopSeconds(fakeDb(async () => ({ minutes: 90 }))),
  ).toBe(5_460)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  expect(await workspaceAutoStopSeconds(fakeDb(async () => null))).toBe(1_860)
  expect(
    await workspaceAutoStopSeconds(
      fakeDb(async () => {
        throw new Error('D1 is down')
      }),
    ),
  ).toBe(7_260)
})

it('keeps a read stop time for a minute and keeps it when a read fails', async () => {
  let now = 0
  let minutes = 60
  let fail = false
  const read = vi.fn(async () => {
    if (fail) throw new Error('D1 is down')
    return { minutes }
  })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const time = new IdleStopTime(fakeDb(read), () => now)
  expect(await time.ms()).toBe(3_600_000)
  minutes = 15
  now = 59_999
  expect(await time.ms()).toBe(3_600_000)
  now = 60_000
  expect(await time.ms()).toBe(900_000)
  fail = true
  now = 120_000
  expect(await time.ms()).toBe(900_000)
  expect(read).toHaveBeenCalledTimes(3)
  expect(
    await new IdleStopTime(
      fakeDb(async () => {
        throw new Error('D1 is down')
      }),
      () => 0,
    ).ms(),
  ).toBe(1_800_000)
})
