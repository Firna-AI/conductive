/**
 * The migration job of the host connection, as the Providers tab of the
 * operator shows it at each moment (own computer decision 7 D). The job
 * started on 23 Nov at 06:02, after the deploy. Its counts are those of
 * the Overview: every workspace runs on boat, and e2b holds only Acme Labs,
 * the test org of the operator, with no workspace.
 */
import type { PaceField } from '../components/operator/PaceFields'
import type {
  JobAccount,
  JobRow,
  MigrationJob,
  Pace,
  RowProgress,
} from '../components/operator/migrationModel'
import { workspaceStates } from './operator'
import { orgPages } from './operatorPages'
import { account } from './orgs'

/** The low default pace of each account, because the app knows no limit. */
export const defaultPace: Pace = { perHour: 30, atOnce: 3 }

/** The pace that the operator gives boat on the pace pages. */
const fasterPace: Pace = { perHour: 60, atOnce: 6 }

type RowCounts = Readonly<Record<JobRow, number>>

/**
 * The machines of boat by state and kind before the first start, from the
 * workspaces by state of the Overview. A removed workspace has no machine,
 * so the job counts none. Each org on boat with a good build, except the
 * deleted orgs, has one org image.
 */
const boatCount: RowCounts = {
  running: workspaceStates.running,
  stopped: workspaceStates.stopped,
  error: workspaceStates.failed,
  archived: workspaceStates.archived,
  images: 298,
}

/** e2b holds Acme Labs only, with no workspace, so it has one org image. */
const e2bCount: RowCounts = {
  running: 0,
  stopped: 0,
  error: 0,
  archived: 0,
  images: 1,
}

/** Just after the count: the restarts of the running machines run first. */
const atCount: RowCounts = {
  running: 9,
  stopped: 0,
  error: 0,
  archived: 0,
  images: 0,
}

/** The machines that the job handled on boat by 24 Nov at 11:40. */
const midway: RowCounts = {
  running: 37,
  stopped: 562,
  error: 12,
  archived: 166,
  images: 148,
}

/** Each row of a count, with how many of it the job handled. */
function rowsOf(count: RowCounts, handled: RowCounts) {
  const row = (key: JobRow): RowProgress => ({
    count: count[key],
    handled: handled[key],
  })
  return {
    running: row('running'),
    stopped: row('stopped'),
    error: row('error'),
    archived: row('archived'),
    images: row('images'),
  }
}

/** boat at a moment of the job, at its stage, with its saved pace. */
function boat(
  handled: RowCounts,
  stage: JobAccount['stage'],
  pace: Pace,
): JobAccount {
  return { id: 'boat', stage, rows: rowsOf(boatCount, handled), pace }
}

/** e2b before its one refresh. */
const e2bBefore: RowCounts = { ...e2bCount, images: 0 }

/** e2b before its one refresh, and after it. */
function e2b(done: boolean): JobAccount {
  const handled = done ? e2bCount : e2bBefore
  const stage: JobAccount['stage'] = { kind: done ? 'done' : 'running' }
  return {
    id: 'e2b',
    stage,
    rows: rowsOf(e2bCount, handled),
    pace: defaultPace,
  }
}

/**
 * The starts of Hexwave, the org of the limit: a brief start for each
 * stopped and failed workspace, and the refresh of its org image. Its 3
 * running workspaces had their restarts before the limit.
 */
const hexwave = orgPages.active
const hexwaveStarts =
  hexwave.states.stopped + hexwave.states.failed + hexwave.states.archived + 1

/** The org of the limit, as the question finds it by its ID. */
export const limitOrg = {
  id: hexwave.id,
  name: hexwave.name,
  account: hexwave.account,
  workspaces: Object.values(hexwave.states).reduce((sum, n) => sum + n, 0),
}

/** The moments of the job that the pages of the Providers tab show. */
export type JobMoment =
  | 'counting'
  | 'counted'
  | 'running'
  | 'paused'
  | 'refused'
  | 'capacity'
  | 'limited'
  | 'limited-done'
  | 'done'

const started = '23 Nov at 06:02'

/**
 * The job at a moment, with the saved pace: the default, or the faster
 * pace of boat after Save pace.
 */
export function migrationJob(moment: JobMoment, saved: boolean): MigrationJob {
  const pace = saved ? fasterPace : defaultPace
  const running = (stage: JobAccount['stage']): MigrationJob['accounts'] => [
    boat(midway, stage, pace),
    e2b(true),
  ]
  const until = '11:52'
  switch (moment) {
    case 'counting':
      return { state: 'counting', started, accounts: [] }
    case 'counted':
      return {
        state: 'running',
        started,
        accounts: [boat(atCount, { kind: 'running' }, pace), e2b(false)],
      }
    case 'running':
      return {
        state: 'running',
        started,
        accounts: running({ kind: 'running' }),
      }
    case 'paused':
      return {
        state: 'paused',
        started,
        paused: { at: '24 Nov at 11:42', by: account.login },
        accounts: running({ kind: 'paused' }),
      }
    case 'refused':
    case 'capacity':
      return {
        state: 'waiting',
        started,
        accounts: running({
          kind: 'refused',
          until,
          reason: moment === 'refused' ? 'rate-limit' : 'capacity',
        }),
      }
    case 'limited':
      return {
        state: 'running',
        started,
        limit: { org: hexwave.name, starts: hexwaveStarts, handled: 3 },
        accounts: running({ kind: 'running' }),
      }
    case 'limited-done':
      return {
        state: 'waiting',
        started,
        limit: {
          org: hexwave.name,
          starts: hexwaveStarts,
          handled: hexwaveStarts,
        },
        accounts: [
          boat(
            {
              ...midway,
              stopped: midway.stopped + 4,
              images: midway.images + 1,
            },
            { kind: 'limited' },
            pace,
          ),
          e2b(true),
        ],
      }
    case 'done':
      return {
        state: 'done',
        started,
        done: '26 Nov at 04:10',
        accounts: [boat(boatCount, { kind: 'done' }, pace), e2b(true)],
      }
  }
}

/**
 * The fields of the pace: the default on each account, or 60 starts in
 * each hour and 6 at once on boat, which the operator typed.
 */
export function paceFields(changed: boolean): readonly PaceField[] {
  const boatPace = changed ? fasterPace : defaultPace
  return [
    {
      id: 'boat',
      perHour: String(boatPace.perHour),
      atOnce: String(boatPace.atOnce),
    },
    {
      id: 'e2b',
      perHour: String(defaultPace.perHour),
      atOnce: String(defaultPace.atOnce),
    },
  ]
}

/** When the operator saved the faster pace of boat. */
export const paceSavedAt = '24 Nov at 11:46'
