import { Cron, CronPattern } from 'croner'

import { HttpError } from '../http'
import { invalidSchedule } from './errors'
import { parseRoutineTriggers, type ParsedRoutineTrigger } from './triggers'

export function routineSchedule(
  triggers: unknown,
  timeZone: unknown,
  active: boolean,
  now: number,
): {
  triggers: ParsedRoutineTrigger[]
  timeZone: string
  nextRunAt: number | null
} {
  if (typeof timeZone !== 'string' || !timeZone.trim()) throw invalidTimeZone()
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format(now)
  } catch {
    throw invalidTimeZone()
  }
  const parsed = parseRoutineTriggers(triggers)
  let nextRunAt: number | null = null
  for (const trigger of parsed) {
    if (trigger.kind === 'pull-request') continue
    const fields = trigger.cron.split(' ')
    if (fields.length !== 5) throw invalidSchedule()
    try {
      const pattern = new CronPattern(trigger.cron, timeZone, {
        mode: '5-part',
      })
      if (pattern.minute.filter((value) => value === 1).length !== 1)
        throw invalidSchedule()
      const cron = new Cron(trigger.cron, {
        timezone: timeZone,
        mode: '5-part',
      })
      const next = cron.nextRun(new Date(now))?.getTime() ?? null
      if (active && next !== null && (nextRunAt === null || next < nextRunAt))
        nextRunAt = next
    } catch {
      throw invalidSchedule()
    }
  }
  return { triggers: parsed, timeZone, nextRunAt }
}

function invalidTimeZone(): HttpError {
  return new HttpError(400, 'invalid_time_zone', 'Choose a valid time zone.')
}
