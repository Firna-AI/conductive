/**
 * The migration job of the host connection, as the Providers tab of the
 * operator shows it in each state of its pages (own computer decision
 * 7 D). The job started on 23 Nov at 06:02, after the deploy. Its counts
 * are those of the Overview: every workspace runs on boat, and e2b holds
 * only Acme Labs, the test org of the operator, with no workspace.
 */
import type {
  AccountStage,
  JobAccount,
  JobRow,
  JobRows,
  JobState,
  MigrationJob,
} from '../components/operator/migrationModel'
import { defaultPace, savedBoatPace } from './migrationPace'
import type { JobRecord } from './migrationRecord'
import { workspaceStates } from './operator'
import { orgPages } from './operatorPages'
import { account } from './orgs'

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

/** Just after the count: the restarts of the running machines run first. */
const boatAtCount: RowCounts = {
  running: 9,
  stopped: 0,
  error: 0,
  archived: 0,
  images: 0,
}

/** The machines that the job handled on boat by 24 Nov at 11:40. */
const boatLater: RowCounts = {
  running: 37,
  stopped: 562,
  error: 12,
  archived: 166,
  images: 148,
}

/** e2b holds Acme Labs only, with no workspace, so it has one org image. */
const e2bCount: RowCounts = {
  running: 0,
  stopped: 0,
  error: 0,
  archived: 0,
  images: 1,
}

/** e2b before its one refresh. */
const e2bBefore: RowCounts = { ...e2bCount, images: 0 }

/**
 * Hexwave, the org of the limit, by state and kind on boat: a restart for
 * each running workspace, a brief start for each stopped and failed one,
 * and a refresh of its org image.
 */
const hexwave = orgPages.active
const hexwaveCount: RowCounts = {
  running: hexwave.states.running,
  stopped: hexwave.states.stopped,
  error: hexwave.states.failed,
  archived: hexwave.states.archived,
  images: 1,
}

/** What the job handled of Hexwave just after the count: one restart. */
const hexwaveAtCount: RowCounts = {
  running: 1,
  stopped: 0,
  error: 0,
  archived: 0,
  images: 0,
}

/**
 * What the job handled of Hexwave by 24 Nov at 11:40: its restarts, its
 * failed workspace, and 2 of its stopped ones.
 */
const hexwaveLater: RowCounts = {
  running: hexwaveCount.running,
  stopped: 2,
  error: hexwaveCount.error,
  archived: 0,
  images: 0,
}

/** The org of the limit, as the question finds it by its ID. */
export const limitOrg = {
  id: hexwave.id,
  name: hexwave.name,
  account: hexwave.account,
  workspaces: Object.values(hexwave.states).reduce((sum, n) => sum + n, 0),
}

/** Each row of a count, with how many of it the job handled. */
function rowsOf(count: RowCounts, handled: RowCounts): JobRows {
  const row = (key: JobRow) => ({ count: count[key], handled: handled[key] })
  return {
    running: row('running'),
    stopped: row('stopped'),
    error: row('error'),
    archived: row('archived'),
    images: row('images'),
  }
}

/** Two counts combined row by row, such as a sum or a difference. */
function rowWise(
  first: RowCounts,
  second: RowCounts,
  combine: (a: number, b: number) => number,
): RowCounts {
  const row = (key: JobRow) => combine(first[key], second[key])
  return {
    running: row('running'),
    stopped: row('stopped'),
    error: row('error'),
    archived: row('archived'),
    images: row('images'),
  }
}

/** Whether the work of Hexwave ended, so each of its rows is whole. */
function hexwaveEnded(record: JobRecord): boolean {
  return record.limit === 'hexwave-done' || record.run === 'done'
}

/**
 * What the job handled on boat. When the work of Hexwave ended under the
 * limit, the rest of its steps add to the later job.
 */
function boatHandled(record: JobRecord): RowCounts {
  if (record.run === 'done') return boatCount
  if (record.progress !== 'later') return boatAtCount
  if (record.limit !== 'hexwave-done') return boatLater
  const rest = rowWise(
    hexwaveCount,
    hexwaveLater,
    (count, done) => count - done,
  )
  return rowWise(boatLater, rest, (done, more) => done + more)
}

/**
 * The limit to Hexwave, with its rows by state and kind once the job has
 * counted them. The question before a limit sets none yet.
 */
function limitOf(record: JobRecord): MigrationJob['limit'] {
  if (record.limit !== 'hexwave' && record.limit !== 'hexwave-done') {
    return undefined
  }
  if (record.progress === 'counting') return { org: hexwave.name }
  const handled = hexwaveEnded(record)
    ? hexwaveCount
    : record.progress === 'counted'
      ? hexwaveAtCount
      : hexwaveLater
  return { org: hexwave.name, rows: rowsOf(hexwaveCount, handled) }
}

/** The state of the whole job, from its run, its progress, and its limit. */
function stateOf(record: JobRecord): JobState {
  switch (record.run) {
    case 'done':
      return 'done'
    case 'paused':
      return 'paused'
    case 'refused':
    case 'capacity':
      return 'waiting'
    case 'running':
      if (record.progress === 'counting') return 'counting'
      return record.limit === 'hexwave-done' ? 'waiting' : 'running'
  }
}

/** Where the job stands on boat. */
function boatStage(record: JobRecord): AccountStage {
  switch (record.run) {
    case 'done':
      return { kind: 'done' }
    case 'paused':
      return { kind: 'paused' }
    case 'refused':
    case 'capacity': {
      const reason = record.run === 'refused' ? 'rate-limit' : 'capacity'
      return { kind: 'refused', until: '11:52', reason }
    }
    case 'running':
      return { kind: record.limit === 'hexwave-done' ? 'limited' : 'running' }
  }
}

/** e2b, which ends its one refresh after the count. */
function e2b(record: JobRecord): JobAccount {
  const ended = record.run === 'done' || record.progress === 'later'
  const stage: AccountStage = ended
    ? { kind: 'done' }
    : { kind: record.run === 'paused' ? 'paused' : 'running' }
  const handled = ended ? e2bCount : e2bBefore
  return {
    id: 'e2b',
    stage,
    rows: rowsOf(e2bCount, handled),
    pace: defaultPace,
  }
}

/**
 * The job in a state of its page, with the saved pace of each account.
 * While it counts, it has no account yet.
 */
export function migrationJob(record: JobRecord): MigrationJob {
  const counting = record.progress === 'counting' && record.run !== 'done'
  const boat: JobAccount = {
    id: 'boat',
    stage: boatStage(record),
    rows: rowsOf(boatCount, boatHandled(record)),
    pace: savedBoatPace(record),
  }
  return {
    state: stateOf(record),
    started: '23 Nov at 06:02',
    paused:
      record.run === 'paused'
        ? { at: '24 Nov at 11:42', by: account.login }
        : undefined,
    done: record.run === 'done' ? '26 Nov at 04:10' : undefined,
    limit: limitOf(record),
    accounts: counting ? [] : [boat, e2b(record)],
  }
}
