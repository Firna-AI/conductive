/**
 * The runs of the routines. Each run opens a new workspace, so the state of
 * a run is the state of its workspace, once it has one. Before that, a run
 * is queued. A run that never got a workspace failed with its cause, or a
 * rule skipped it with its reason.
 */

import {
  changelog,
  errorTriage,
  routines,
  type PullRequestEvent,
  type Routine,
  type ScheduleTrigger,
} from './routines'
import type { ActivityStatus } from './workspaces'

/** The states of a run that has no workspace: before it, or in place of it. */
type RunOnlyState = 'queued' | 'failed' | 'skipped'

export type RunState = ActivityStatus | RunOnlyState

/** What started a run: a schedule, Run now, or a pull request event. */
export type RunTrigger =
  | { kind: 'schedule'; schedule: ScheduleTrigger['kind'] }
  | { kind: 'run-now' }
  | { kind: 'pull-request'; event: PullRequestEvent; number: number }

/**
 * Why a run failed before it had a workspace: the owner has no agent login
 * for the model, the GitHub access of the owner expired, or the cloud
 * computer did not start, so the app removed the new workspace.
 */
export type FailureCause = 'agent-login' | 'github-access' | 'start'

/**
 * Why a rule skipped a pull request event (decision 206 C): its author, or
 * the account that caused it, is not a member and is not in "is".
 */
export type SkipReason = { who: 'author' | 'sender'; login: string }

type RunBase = { key: string; trigger: RunTrigger; when: string }

export type Run =
  | (RunBase & { state: ActivityStatus })
  | (RunBase & { state: 'queued' })
  | (RunBase & { state: 'failed'; cause: FailureCause })
  | (RunBase & { state: 'skipped'; skip: SkipReason })

function pr(event: PullRequestEvent, number: number): RunTrigger {
  return { kind: 'pull-request', event, number }
}

const weekly: RunTrigger = { kind: 'schedule', schedule: 'weekly' }

/** The run lists that the Runs list can show, newest first. */
export const runListKeys = [
  'review',
  'failed',
  'skipped',
  'weekly',
  'owner-left',
  'none',
  'run-now',
] as const

export type RunListKey = (typeof runListKeys)[number]

export const runLists: Readonly<Record<RunListKey, readonly Run[]>> = {
  /** The runs of a pull request routine in each state of a workspace. */
  review: [
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
  ],
  /** A failed run for each cause, and a run whose cloud computer failed. */
  failed: [
    {
      key: 'opened-488',
      trigger: pr('opened', 488),
      state: 'failed',
      cause: 'agent-login',
      when: '2m',
    },
    {
      key: 'pushed-487',
      trigger: pr('pushed', 487),
      state: 'failed',
      cause: 'github-access',
      when: '1h',
    },
    {
      key: 'opened-487',
      trigger: pr('opened', 487),
      state: 'failed',
      cause: 'start',
      when: '3h',
    },
    {
      key: 'pushed-486',
      trigger: pr('pushed', 486),
      state: 'error',
      when: '5h',
    },
    {
      key: 'opened-486',
      trigger: pr('opened', 486),
      state: 'ready',
      when: '6h',
    },
  ],
  /** Events of accounts outside Acme, which start no run. */
  skipped: [
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
  ],
  weekly: [
    { key: 'weekly-3', trigger: weekly, state: 'ready', when: '3d' },
    { key: 'weekly-2', trigger: weekly, state: 'archived', when: '10d' },
    { key: 'weekly-1', trigger: weekly, state: 'archived', when: '17d' },
  ],
  'owner-left': [
    { key: 'weekly-copy-2', trigger: weekly, state: 'stopped', when: '2w' },
    { key: 'weekly-copy-1', trigger: weekly, state: 'archived', when: '3w' },
  ],
  none: [],
  'run-now': [
    {
      key: 'run-now',
      trigger: { kind: 'run-now' },
      state: 'starting',
      when: 'now',
    },
  ],
}

/** A routine in the list of the org, with the state of its last run. */
export type RoutineRow = {
  routine: Routine
  lastRun?: { state: RunState; when: string }
}

/** The routines of Acme, as its Routines page lists them. */
export const routineRows: readonly RoutineRow[] = [
  {
    routine: routines['review-prs'],
    lastRun: { state: 'working', when: 'now' },
  },
  { routine: errorTriage, lastRun: { state: 'unread', when: '32m' } },
  {
    routine: routines['dependency-updates'],
    lastRun: { state: 'ready', when: '3d' },
  },
  { routine: changelog, lastRun: { state: 'archived', when: '6d' } },
  {
    routine: routines['copy-review'],
    lastRun: { state: 'stopped', when: '2w' },
  },
]
