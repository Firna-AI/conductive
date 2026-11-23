/**
 * The migration job of the host connection, as the Providers tab of the
 * operator shows it in each state of its pages (own computer decision
 * 7 D). The job started on 23 Nov at 06:02, after the deploy. Its counts
 * are those of the Overview: every workspace runs on boat, and e2b holds
 * only Acme Labs, the test org of the operator, with no workspace. The
 * counts, the waits, and the times read only the facts of a page.
 */
import type {
  JobAccount,
  JobRow,
  JobRows,
  MigrationJob,
} from '../components/operator/migrationModel'
import { finishTime, pauseTime, type JobMoment } from './migrationMoments'
import { defaultPace, savedBoatPace } from './migrationPace'
import type { JobFacts, JobRecord } from './migrationRecord'
import { workspaceStates } from './operator'
import { orgPages } from './operatorPages'
import { account } from './orgs'

type RowCounts = Readonly<Record<JobRow, number>>

/** No machine of a kind, as before the first step. */
const none: RowCounts = {
  running: 0,
  stopped: 0,
  error: 0,
  archived: 0,
  images: 0,
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

const add = (a: number, b: number) => a + b

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

/** The machines that the job handled on boat by 24 Nov at 11:46. */
const boatLater: RowCounts = {
  running: 37,
  stopped: 562,
  error: 12,
  archived: 166,
  images: 148,
}

/**
 * What the job handled on boat once the 3 brief starts that run in the
 * later job ended.
 */
const boatDrained = rowWise(boatLater, { ...none, stopped: 3 }, add)

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

/**
 * What the job handled of Hexwave by 24 Nov at 11:46: its restarts, its
 * failed workspace, and 2 of its stopped ones. The limit to Hexwave takes
 * effect for new steps, so the 3 steps that run then are not of Hexwave.
 */
const hexwaveLater: RowCounts = {
  running: hexwaveCount.running,
  stopped: 2,
  error: hexwaveCount.error,
  archived: 0,
  images: 0,
}

/** The steps of Hexwave that are left in the later job. */
const hexwaveRest = rowWise(hexwaveCount, hexwaveLater, (a, b) => a - b)

/**
 * What the job handled on boat at each moment: the restarts just after
 * the count, the later job, the end of its 3 running steps, then the end
 * of the work of Hexwave under its limit, and the whole count at the end.
 */
const boatHandled: Readonly<Record<JobMoment, RowCounts>> = {
  counting: none,
  counted: { ...none, running: 9 },
  later: boatLater,
  drained: boatDrained,
  'hexwave-done': rowWise(boatDrained, hexwaveRest, add),
  done: boatCount,
}

/** What the job handled of Hexwave at each moment after the count. */
const hexwaveHandled: Readonly<Record<JobMoment, RowCounts>> = {
  counting: none,
  counted: { ...none, running: 1 },
  later: hexwaveLater,
  drained: hexwaveLater,
  'hexwave-done': hexwaveCount,
  done: hexwaveCount,
}

/** e2b holds Acme Labs only, with no workspace, so it has one org image. */
const e2bCount: RowCounts = { ...none, images: 1 }

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

/** The wait of boat after a refusal of its provider, while it holds. */
function waitOf(facts: JobFacts): JobAccount['wait'] {
  if (facts.wait === 'none') return undefined
  return { until: '11:52', reason: facts.wait }
}

/** e2b, which refreshes its one org image just after the count. */
function e2bOf(facts: JobFacts): JobAccount {
  const ended = facts.at !== 'counting' && facts.at !== 'counted'
  return {
    id: 'e2b',
    rows: rowsOf(e2bCount, ended ? e2bCount : none),
    running: facts.running.e2b,
    pace: defaultPace,
  }
}

/**
 * The limit to Hexwave on boat, with the rows of Hexwave once the job has
 * counted them.
 */
function limitOf(facts: JobFacts): MigrationJob['limit'] {
  const org = { org: hexwave.name, account: hexwave.account }
  if (facts.at === 'counting') return org
  return { ...org, rows: rowsOf(hexwaveCount, hexwaveHandled[facts.at]) }
}

/**
 * The job in a state of its page: its facts give the counts, the steps
 * that run, the wait, and the times, and its settings give the pause, the
 * limit, and the saved pace. While it counts, it has no account yet.
 */
export function migrationJob(record: JobRecord): MigrationJob {
  const { settings, facts } = record
  const counting = facts.at === 'counting'
  const boat: JobAccount = {
    id: 'boat',
    rows: rowsOf(boatCount, boatHandled[facts.at]),
    running: facts.running.boat,
    wait: waitOf(facts),
    pace: savedBoatPace(settings),
  }
  return {
    started: '23 Nov at 06:02',
    counting,
    pause:
      settings.pause === 'asked'
        ? { at: pauseTime(facts), by: account.login }
        : undefined,
    done: finishTime(facts),
    limit: settings.limit === 'hexwave' ? limitOf(facts) : undefined,
    accounts: counting ? [] : [boat, e2bOf(facts)],
  }
}
