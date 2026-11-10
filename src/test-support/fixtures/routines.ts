import { routineRows } from '../../../docs/mockups/src/fixtures/routineRows'
import type { RunState } from '../../../docs/mockups/src/fixtures/routineRuns'
import {
  offAfterFailedRuns,
  routines as mockupRoutines,
  type Routine as MockupRoutine,
} from '../../../docs/mockups/src/fixtures/routines'
import type { MessageSender } from '../../shared/messages'
import type {
  Routine,
  RoutineInactiveReason,
  RoutineRun,
  RoutineRunTrigger,
  RoutinesResponse,
} from '../../shared/routines'
import { FAKE_IDS, FAKE_TIME, fakeUsers } from './core'
import { fakeAccount, storedTrigger } from './routine-triggers'

const day = 86_400_000

/** The units of the ages that the mockups write, such as "5m" or "2w". */
const units: Readonly<Record<string, number>> = {
  m: 60_000,
  h: 3_600_000,
  d: day,
  w: 7 * day,
}

/** The time of an age that the mockups write, such as "now" or "3d". */
function timeOf(when: string): number {
  if (when === 'now') return FAKE_TIME
  const match = /^(\d+)([mhdw])$/.exec(when)
  const unit = match ? units[match[2]] : undefined
  if (!match || unit === undefined) throw new Error(`Unknown age: ${when}`)
  return FAKE_TIME - Number(match[1]) * unit
}

function sender(routine: MockupRoutine): MessageSender {
  const user = fakeUsers.find((item) => item.id === routine.owner.key)
  if (!user) throw new Error(`Unknown owner: ${routine.owner.key}`)
  return {
    id: user.id,
    githubLogin: user.githubLogin,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

/** Why the app turned the routine off, or null for an active routine. */
function inactiveReason(routine: MockupRoutine): RoutineInactiveReason | null {
  if (routine.active) return null
  if (offAfterFailedRuns(routine)) return 'failed_runs'
  if (routine.movedFrom !== undefined) return 'owner_left'
  return null
}

/** What started a run: the first trigger of its routine. */
function runTrigger(routine: MockupRoutine, at: number): RoutineRunTrigger {
  const [first] = routine.triggers
  if (!first) return { kind: 'run-now' }
  if (first.kind !== 'pull-request') {
    return { kind: 'schedule', schedule: first.kind, scheduledAt: at }
  }
  const number = 482
  return {
    kind: 'pull-request',
    event: first.event,
    number,
    url: `https://github.com/acme/${routine.repository}/pull/${number}`,
    headBranch: 'cal/saved-carts',
    headSha: '4f2a9c1',
    baseBranch: 'main',
  }
}

/**
 * The last run of a row. A failed run has the cause of a missing agent
 * login and no workspace, as the mockups draw it.
 */
function lastRun(
  routine: MockupRoutine,
  run: { state: RunState; when: string },
  orgId: string,
): RoutineRun {
  const at = timeOf(run.when)
  const workspace = !['queued', 'failed', 'skipped'].includes(run.state)
  return {
    id: `${routine.key}-last`,
    routineId: routine.key,
    orgId,
    trigger: runTrigger(routine, at),
    state: run.state,
    workspaceId: workspace ? `${routine.key}-run` : null,
    error:
      run.state === 'failed'
        ? {
            code: 'agent_login_required',
            message: 'Connect Claude to run this routine.',
          }
        : null,
    createdAt: at,
    updatedAt: at,
  }
}

function record(routine: MockupRoutine, index: number, orgId: string): Routine {
  const createdAt = FAKE_TIME - (30 + index) * day
  const triggers = routine.triggers.map((item) =>
    storedTrigger(item, fakeAccount),
  )
  const scheduled = triggers.some((item) => item.kind !== 'pull-request')
  return {
    id: routine.key,
    orgId,
    owner: sender(routine),
    movedFrom: routine.movedFrom ?? null,
    name: routine.name,
    repositoryId: routine.repository,
    sectionId: routine.section,
    prompt: routine.prompt,
    choice: routine.choice,
    active: routine.active,
    inactiveReason: inactiveReason(routine),
    failedRunsInARow: routine.failedRunsInARow ?? 0,
    timeZone: routine.timeZone,
    triggers,
    nextRunAt: routine.active && scheduled ? FAKE_TIME + 3_600_000 : null,
    createdAt,
    updatedAt: createdAt,
  }
}

/**
 * The routines of Acme as the mockups list them, newest first, as the
 * Worker sorts them, with the last run of each. `list` is the reply of the
 * list route. `routines` and `runs` are the records that the dev fake
 * keeps. `created` is the reply of a create.
 */
export function routineFixtures(orgId: string = FAKE_IDS.org) {
  const routines: Routine[] = routineRows.map((row, index) =>
    record(row.routine, index, orgId),
  )
  const runs: RoutineRun[] = routineRows.flatMap((row) =>
    row.lastRun ? [lastRun(row.routine, row.lastRun, orgId)] : [],
  )
  const list: RoutinesResponse = {
    routines: routines.map((routine) => ({
      ...routine,
      lastRun: runs.find((run) => run.routineId === routine.id) ?? null,
    })),
  }
  // The routine that the flow "Create a routine" saves, as a create answers.
  const created: Routine = {
    ...record(mockupRoutines['morning-summary'], 0, orgId),
    createdAt: FAKE_TIME,
    updatedAt: FAKE_TIME,
  }
  return { list, routines, runs, created }
}
