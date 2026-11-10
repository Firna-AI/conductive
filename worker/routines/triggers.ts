import type {
  RoutineAuthorFilterInput,
  RoutineSchedule,
  RoutinePullRequestEvent,
  RoutineTriggerInput,
  RoutineWeekday,
} from '../../src/shared/routines'
import { isRecord } from '../http'
import { invalidRoutineInput, invalidSchedule } from './errors'

export type ParsedRoutineTrigger =
  | (RoutineSchedule & { cron: string })
  | Extract<RoutineTriggerInput, { kind: 'pull-request' }>

const weekdays: readonly RoutineWeekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]
const pullRequestEvents: readonly RoutinePullRequestEvent[] = [
  'opened',
  'pushed',
  'merged',
]

function clock(value: unknown, max: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > max
  )
    throw invalidSchedule()
  return value
}

function logins(value: unknown): string[] {
  if (!Array.isArray(value)) throw invalidRoutineInput()
  return value.map((entry: unknown) => {
    if (typeof entry !== 'string' || !entry.trim()) throw invalidRoutineInput()
    return entry.trim()
  })
}

function authors(value: unknown): RoutineAuthorFilterInput | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value) || typeof value.members !== 'boolean')
    throw invalidRoutineInput()
  return {
    members: value.members,
    is: logins(value.is),
    isNot: logins(value.isNot),
  }
}

export function parseRoutineTriggers(value: unknown): ParsedRoutineTrigger[] {
  if (!Array.isArray(value)) throw invalidRoutineInput()
  return value.map((entry: unknown): ParsedRoutineTrigger => {
    if (!isRecord(entry)) throw invalidRoutineInput()
    if (entry.kind === 'pull-request') {
      const event = pullRequestEvents.find((event) => event === entry.event)
      if (!event) throw invalidRoutineInput()
      const filter = authors(entry.authors)
      return {
        kind: 'pull-request',
        event,
        ...(filter ? { authors: filter } : {}),
      }
    }
    if (entry.kind === 'custom') {
      if (typeof entry.cron !== 'string') throw invalidSchedule()
      return { kind: 'custom', cron: entry.cron.trim().replace(/\s+/g, ' ') }
    }
    if (entry.kind === 'hourly') {
      const minute = clock(entry.minute, 59)
      return { kind: 'hourly', minute, cron: `${minute} * * * *` }
    }
    if (!isRecord(entry.time)) throw invalidSchedule()
    const time = {
      hour: clock(entry.time.hour, 23),
      minute: clock(entry.time.minute, 59),
    }
    const prefix = `${time.minute} ${time.hour} * *`
    if (entry.kind === 'daily')
      return { kind: 'daily', time, cron: `${prefix} *` }
    if (entry.kind === 'weekdays')
      return { kind: 'weekdays', time, cron: `${prefix} 1-5` }
    if (entry.kind === 'weekly') {
      const day = weekdays.find((day) => day === entry.day)
      if (!day) throw invalidSchedule()
      return {
        kind: 'weekly',
        day,
        time,
        cron: `${prefix} ${weekdays.indexOf(day)}`,
      }
    }
    throw invalidSchedule()
  })
}
