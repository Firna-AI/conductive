/**
 * The run lists that the Runs list of a routine can show, newest first.
 * A list holds at most the newest 50 runs, and offers older runs at its
 * end when they exist. Each run has the agent and the owner of its
 * routine, unless it names its own.
 */

import { failedRuns, turnedOffRuns } from './failedRunLists'
import { lena, routines, type PullRequestEvent } from './routines'
import {
  pr,
  runsOf,
  workspaceAfterSuspension,
  type ListedRun,
  type Run,
  type RunTrigger,
} from './routineRuns'

const weekly: RunTrigger = { kind: 'schedule', schedule: 'weekly' }

const review = routines['review-prs']

/**
 * The newest runs of the routine that reviews pull requests, in each state
 * of a workspace.
 */
const newestReviewRuns: readonly ListedRun[] = [
  {
    key: 'pushed-485',
    trigger: pr('pushed', 485),
    state: 'queued',
    when: 'now',
  },
  {
    key: 'opened-485',
    trigger: pr('opened', 485),
    state: 'starting',
    when: '1m',
  },
  {
    key: 'opened-482',
    trigger: pr('opened', 482),
    state: 'working',
    when: '4m',
  },
  {
    key: 'pushed-481',
    trigger: pr('pushed', 481),
    state: 'input',
    when: '26m',
  },
  {
    key: 'opened-481',
    trigger: pr('opened', 481),
    state: 'unread',
    when: '1h',
  },
  {
    key: 'pushed-479',
    trigger: pr('pushed', 479),
    state: 'ready',
    when: '3h',
  },
  {
    key: 'opened-478',
    trigger: pr('opened', 478),
    state: 'stopped',
    when: '1d',
  },
  {
    key: 'opened-474',
    trigger: pr('opened', 474),
    state: 'archived',
    when: '4d',
  },
]

/** The time of a run some days ago, as the lists show it, such as "5d". */
function daysAgo(days: number): string {
  return days < 14 ? `${days}d` : `${Math.floor(days / 7)}w`
}

/**
 * The older runs of the same routine: a push and an open for each pull
 * request, from #473 down, so that the list holds the newest 50 runs.
 */
const olderReviewRuns: readonly ListedRun[] = Array.from(
  { length: 42 },
  (_, index): ListedRun => {
    const number = 473 - Math.floor(index / 2)
    const event: PullRequestEvent = index % 2 === 0 ? 'pushed' : 'opened'
    return {
      key: `${event}-${number}`,
      trigger: pr(event, number),
      state: index % 7 === 3 ? 'stopped' : 'archived',
      when: daysAgo(4 + Math.floor(index / 3)),
    }
  },
)

const reviewRuns: readonly Run[] = runsOf(review, [
  ...newestReviewRuns,
  ...olderReviewRuns,
])

/** A run of an org that the operator suspended a minute ago. */
function afterSuspension(run: Run): Run {
  const when = run.when === 'now' ? '1m' : run.when
  switch (run.state) {
    case 'queued':
      return { ...run, state: 'skipped', skip: { who: 'org' }, when }
    case 'failed':
    case 'skipped':
      return { ...run, when }
    default:
      return { ...run, state: workspaceAfterSuspension(run.state), when }
  }
}

/** The run lists that show Show older runs at their end. */
const withOlderRuns: ReadonlySet<RunListKey> = new Set(['review', 'suspended'])

/**
 * The list holds the newest 50 runs, and older runs exist, so the end of
 * the list offers them.
 */
export function hasOlderRuns(list: RunListKey): boolean {
  return withOlderRuns.has(list)
}

/** The run lists that the Runs list can show, newest first. */
export const runListKeys = [
  'review',
  'failed',
  'skipped',
  'weekly',
  'owner-left',
  'none',
  'run-now',
  'suspended',
  'turned-off',
] as const

export type RunListKey = (typeof runListKeys)[number]

export const runLists: Readonly<Record<RunListKey, readonly Run[]>> = {
  /** The newest 50 runs of a pull request routine, which has older ones. */
  review: reviewRuns,
  /**
   * A failed run for each cause. A failed start and a failed first turn
   * keep their workspace, and a run that a check failed has none.
   */
  failed: failedRuns,
  /** Events of accounts outside Acme, which start no run. */
  skipped: runsOf(review, [
    {
      key: 'opened-490',
      trigger: pr('opened', 490),
      state: 'working',
      when: '2m',
    },
    {
      key: 'opened-489',
      trigger: pr('opened', 489),
      state: 'skipped',
      skip: { who: 'author', login: 'rui-silva' },
      when: '12m',
    },
    {
      key: 'pushed-483',
      trigger: pr('pushed', 483),
      state: 'skipped',
      skip: { who: 'sender', login: 'github-actions[bot]' },
      when: '40m',
    },
    {
      key: 'opened-483',
      trigger: pr('opened', 483),
      state: 'ready',
      when: '2h',
    },
  ]),
  weekly: runsOf(routines['dependency-updates'], [
    { key: 'weekly-3', trigger: weekly, state: 'ready', when: '3d' },
    { key: 'weekly-2', trigger: weekly, state: 'archived', when: '10d' },
    { key: 'weekly-1', trigger: weekly, state: 'archived', when: '17d' },
  ]),
  /**
   * The runs of the routine that moved to Cal when Lena left Acme. They ran
   * as Lena, so they keep her as their owner.
   */
  'owner-left': runsOf(routines['copy-review'], [
    {
      key: 'weekly-copy-2',
      trigger: weekly,
      state: 'stopped',
      owner: lena,
      when: '2w',
    },
    {
      key: 'weekly-copy-1',
      trigger: weekly,
      state: 'archived',
      owner: lena,
      when: '3w',
    },
  ]),
  none: [],
  'run-now': runsOf(routines['morning-summary'], [
    {
      key: 'run-now',
      trigger: { kind: 'run-now' },
      state: 'starting',
      when: 'now',
    },
  ]),
  /** The runs of the review routine after the suspension of Acme. */
  suspended: reviewRuns.map(afterSuspension),
  /** The failed runs that turned an hourly routine off. */
  'turned-off': turnedOffRuns,
}
