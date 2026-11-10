import type {
  Routine,
  RoutineAuthorAccount,
  RoutineAuthorFilter,
  RoutineInactiveReason,
  RoutinePullRequestEvent,
  RoutineRun,
  RoutineRunTrigger,
  RoutineSchedule,
  RoutinesResponse,
  RoutineTrigger,
  RoutineWeekday,
} from '../../shared/routines'
import {
  choice,
  count,
  flag,
  items,
  maybeCount,
  maybeNested,
  maybeText,
  nested,
  record,
  text,
} from './parse'
import { readChoice, readSender } from './read-core'
import { WORKSPACE_STATES } from './read-workspaces'

/** A routine of the list of its org, with its newest run, or null. */
export type ListedRoutine = RoutinesResponse['routines'][number]

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const satisfies readonly RoutineWeekday[]
const SCHEDULES = [
  'hourly',
  'daily',
  'weekdays',
  'weekly',
  'custom',
] as const satisfies readonly RoutineSchedule['kind'][]
const EVENTS = [
  'opened',
  'pushed',
  'merged',
] as const satisfies readonly RoutinePullRequestEvent[]
const INACTIVE_REASONS = [
  'owner_left',
  'repository_removed',
  'failed_runs',
] as const satisfies readonly RoutineInactiveReason[]
const RUN_STATES = [
  ...WORKSPACE_STATES,
  'queued',
  'failed',
  'skipped',
] as const satisfies readonly RoutineRun['state'][]

function readClock(value: unknown): { hour: number; minute: number } {
  const time = record(value, 'time')
  return { hour: count(time, 'hour'), minute: count(time, 'minute') }
}

function readAccount(value: unknown): RoutineAuthorAccount {
  const account = record(value, 'account')
  return { githubId: count(account, 'githubId'), login: text(account, 'login') }
}

function readAuthors(value: unknown): RoutineAuthorFilter {
  const filter = record(value, 'authors')
  return {
    members: flag(filter, 'members'),
    is: items(filter, 'is', readAccount),
    isNot: items(filter, 'isNot', readAccount),
  }
}

function readTrigger(value: unknown): RoutineTrigger {
  const trigger = record(value, 'trigger')
  const kind = choice(trigger, 'kind', [...SCHEDULES, 'pull-request'])
  switch (kind) {
    case 'pull-request': {
      const authors = maybeNested(trigger, 'authors', readAuthors)
      return {
        kind,
        event: choice(trigger, 'event', EVENTS),
        ...(authors === null ? {} : { authors }),
      }
    }
    case 'hourly':
      return {
        kind,
        minute: count(trigger, 'minute'),
        cron: text(trigger, 'cron'),
      }
    case 'daily':
      return {
        kind,
        time: nested(trigger, 'time', readClock),
        cron: text(trigger, 'cron'),
      }
    case 'weekdays':
      return {
        kind,
        time: nested(trigger, 'time', readClock),
        cron: text(trigger, 'cron'),
      }
    case 'weekly':
      return {
        kind,
        day: choice(trigger, 'day', WEEKDAYS),
        time: nested(trigger, 'time', readClock),
        cron: text(trigger, 'cron'),
      }
    case 'custom':
      return { kind, cron: text(trigger, 'cron') }
  }
}

function readRunTrigger(value: unknown): RoutineRunTrigger {
  const trigger = record(value, 'run trigger')
  const kind = choice(trigger, 'kind', ['schedule', 'run-now', 'pull-request'])
  switch (kind) {
    case 'schedule':
      return {
        kind,
        schedule: choice(trigger, 'schedule', SCHEDULES),
        scheduledAt: count(trigger, 'scheduledAt'),
      }
    case 'run-now':
      return { kind }
    case 'pull-request':
      return {
        kind,
        event: choice(trigger, 'event', EVENTS),
        number: count(trigger, 'number'),
        url: text(trigger, 'url'),
        headBranch: text(trigger, 'headBranch'),
        headSha: text(trigger, 'headSha'),
        baseBranch: text(trigger, 'baseBranch'),
      }
  }
}

function readRun(value: unknown): RoutineRun {
  const run = record(value, 'run')
  return {
    id: text(run, 'id'),
    routineId: text(run, 'routineId'),
    orgId: text(run, 'orgId'),
    trigger: nested(run, 'trigger', readRunTrigger),
    state: choice(run, 'state', RUN_STATES),
    workspaceId: maybeText(run, 'workspaceId'),
    error: maybeNested(run, 'error', (item) => {
      const error = record(item, 'error')
      return { code: text(error, 'code'), message: text(error, 'message') }
    }),
    createdAt: count(run, 'createdAt'),
    updatedAt: count(run, 'updatedAt'),
  }
}

function readRoutine(value: unknown): Routine {
  const routine = record(value, 'routine')
  return {
    id: text(routine, 'id'),
    orgId: text(routine, 'orgId'),
    owner: nested(routine, 'owner', readSender),
    movedFrom: maybeText(routine, 'movedFrom'),
    name: text(routine, 'name'),
    repositoryId: text(routine, 'repositoryId'),
    sectionId: text(routine, 'sectionId'),
    prompt: text(routine, 'prompt'),
    choice: nested(routine, 'choice', readChoice),
    active: flag(routine, 'active'),
    inactiveReason: maybeNested(routine, 'inactiveReason', (reason) =>
      choice({ reason }, 'reason', INACTIVE_REASONS),
    ),
    failedRunsInARow: count(routine, 'failedRunsInARow'),
    timeZone: text(routine, 'timeZone'),
    triggers: items(routine, 'triggers', readTrigger),
    nextRunAt: maybeCount(routine, 'nextRunAt'),
    createdAt: count(routine, 'createdAt'),
    updatedAt: count(routine, 'updatedAt'),
  }
}

/** The routine of a read, a create, or an update. */
export function readRoutineResponse(value: unknown): Routine {
  return nested(record(value, 'routine response'), 'routine', readRoutine)
}

/** The routines of an org, each with its newest run, in the order of the reply. */
export function readRoutines(value: unknown): ListedRoutine[] {
  return items(record(value, 'routines'), 'routines', (item) => ({
    ...readRoutine(item),
    lastRun: maybeNested(record(item, 'routine'), 'lastRun', readRun),
  }))
}
