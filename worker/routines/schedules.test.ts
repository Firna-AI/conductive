import { expect, it } from 'vitest'

import type { RoutineSchedule } from '../../src/shared/routines'
import { routineSchedule } from './schedules'

it('keeps local preset and custom times across the start and end of summer time', () => {
  const cases: {
    trigger: RoutineSchedule
    cron: string
    before: string
    after: string
  }[] = [
    {
      trigger: { kind: 'hourly', minute: 15 },
      cron: '15 * * * *',
      before: '2026-03-29T00:16:00Z',
      after: '2026-03-29T01:15:00Z',
    },
    {
      trigger: { kind: 'daily', time: { hour: 9, minute: 0 } },
      cron: '0 9 * * *',
      before: '2026-03-28T09:00:00Z',
      after: '2026-03-29T08:00:00Z',
    },
    {
      trigger: { kind: 'weekdays', time: { hour: 9, minute: 0 } },
      cron: '0 9 * * 1-5',
      before: '2026-03-27T09:00:00Z',
      after: '2026-03-30T08:00:00Z',
    },
    {
      trigger: { kind: 'weekly', day: 'monday', time: { hour: 9, minute: 0 } },
      cron: '0 9 * * 1',
      before: '2026-03-23T09:00:00Z',
      after: '2026-03-30T08:00:00Z',
    },
    {
      trigger: { kind: 'custom', cron: '30 9 * * *' },
      cron: '30 9 * * *',
      before: '2026-10-24T08:30:00Z',
      after: '2026-10-25T09:30:00Z',
    },
  ]
  for (const { trigger, cron, before, after } of cases) {
    const result = routineSchedule(
      [trigger],
      'Europe/London',
      true,
      Date.parse(before),
    )
    expect(result, trigger.kind).toEqual({
      triggers: [{ ...trigger, cron }],
      timeZone: 'Europe/London',
      nextRunAt: Date.parse(after),
    })
  }
})

it('chooses the earliest schedule and removes the next time for inactive and unscheduled routines', () => {
  const triggers = [
    { kind: 'daily', time: { hour: 9, minute: 0 } },
    { kind: 'hourly', minute: 15 },
  ]
  const now = Date.parse('2026-11-09T08:00:00Z')
  expect(routineSchedule(triggers, 'UTC', true, now).nextRunAt).toBe(
    Date.parse('2026-11-09T08:15:00Z'),
  )
  expect(routineSchedule(triggers, 'UTC', false, now).nextRunAt).toBeNull()
  expect(
    routineSchedule(
      [{ kind: 'pull-request', event: 'opened' }],
      'UTC',
      true,
      now,
    ),
  ).toEqual({
    triggers: [{ kind: 'pull-request', event: 'opened' }],
    timeZone: 'UTC',
    nextRunAt: null,
  })
  expect(routineSchedule([], 'UTC', true, now).nextRunAt).toBeNull()
})

it('refuses multiple cron minutes, extra fields, invalid schedules, and unknown time zones', () => {
  for (const cron of [
    '0,30 * * * *',
    '*/15 * * * *',
    '* * * * *',
    '0 0 * * * *',
    '0 25 * * *',
    '@hourly',
  ]) {
    expect(
      () => routineSchedule([{ kind: 'custom', cron }], 'UTC', true, 0),
      cron,
    ).toThrowError(
      expect.objectContaining({ status: 400, code: 'invalid_schedule' }),
    )
  }
  expect(() => routineSchedule([], 'Unknown/Zone', false, 0)).toThrowError(
    expect.objectContaining({ code: 'invalid_time_zone' }),
  )
  for (const trigger of [
    { kind: 'hourly', minute: 60 },
    { kind: 'daily', time: { hour: 24, minute: 0 } },
    { kind: 'weekly', day: 'someday', time: { hour: 9, minute: 0 } },
    { kind: 'webhook' },
  ]) {
    expect(() => routineSchedule([trigger], 'UTC', false, 0)).toThrowError(
      expect.objectContaining({ status: 400 }),
    )
  }
})
