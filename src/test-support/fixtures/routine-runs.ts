import type {
  FailureCause,
  Run,
  SkipReason,
} from '../../../docs/mockups/src/fixtures/routineRuns'
import {
  runLists,
  type RunListKey,
} from '../../../docs/mockups/src/fixtures/runLists'
import type {
  Routine,
  RoutinePullRequestEvent,
  RoutineRun,
  RoutineRunsResponse,
  RoutineRunTrigger,
} from '../../shared/routines'
import { FAKE_TIME } from './core'

const day = 86_400_000

/** The units of the ages that the mockups write, such as "5m" or "2w". */
const units: Readonly<Record<string, number>> = {
  m: 60_000,
  h: 3_600_000,
  d: day,
  w: 7 * day,
}

/** The time of an age that the mockups write, such as "now" or "3d". */
export function timeOf(when: string): number {
  if (when === 'now') return FAKE_TIME
  const match = /^(\d+)([mhdw])$/.exec(when)
  const unit = match ? units[match[2]] : undefined
  if (!match || unit === undefined) throw new Error(`Unknown age: ${when}`)
  return FAKE_TIME - Number(match[1]) * unit
}

/** The trigger of a run that a pull request of the routine's repository started. */
export function pullRequestTrigger(
  repositoryId: string,
  event: RoutinePullRequestEvent,
  number: number,
): RoutineRunTrigger {
  return {
    kind: 'pull-request',
    event,
    number,
    url: `https://github.com/acme/${repositoryId}/pull/${number}`,
    headBranch: 'cal/saved-carts',
    headSha: '4f2a9c1',
    baseBranch: 'main',
  }
}

/** Each cause of a failed run, as the Worker stores it. */
const failures: Readonly<
  Record<FailureCause, { code: string; message: string }>
> = {
  'agent-login': {
    code: 'agent_login_required',
    message: 'Connect Claude to run this routine.',
  },
  'github-access': {
    code: 'github_reconnect_required',
    message: 'GitHub access expired. Sign in with GitHub again.',
  },
  start: {
    code: 'workspace_start_failed',
    message: 'The cloud computer could not start. Try again.',
  },
}

/** Each reason of a skipped run, as the Worker stores it. */
function skipOf(skip: SkipReason): { code: string; message: string } {
  switch (skip.who) {
    case 'author':
      return {
        code: 'author_not_allowed',
        message:
          'The pull request author is outside the org and is not in Author is.',
      }
    case 'sender':
      return {
        code: 'sender_not_allowed',
        message: 'The event sender is outside the org and is not in Author is.',
      }
    case 'org':
      return { code: 'org_suspended', message: 'The org is suspended.' }
  }
}

/**
 * A run of a mockup list, as the Worker gives it. A run in the state of a
 * workspace has one. A queued, failed, or skipped run has none. Each run
 * is a little older than the run before it, so the order of the list
 * holds when two runs have the same age.
 */
function apiRun(routine: Routine, run: Run, index: number): RoutineRun {
  const at = timeOf(run.when) - index
  const trigger: RoutineRunTrigger =
    run.trigger.kind === 'schedule'
      ? { kind: 'schedule', schedule: run.trigger.schedule, scheduledAt: at }
      : run.trigger.kind === 'run-now'
        ? { kind: 'run-now' }
        : pullRequestTrigger(
            routine.repositoryId,
            run.trigger.event,
            run.trigger.number,
          )
  const workspace = !['queued', 'failed', 'skipped'].includes(run.state)
  return {
    id: `run-${routine.id}-${run.key}`,
    routineId: routine.id,
    orgId: routine.orgId,
    trigger,
    state: run.state,
    workspaceId: workspace ? `${routine.id}-${run.key}` : null,
    error:
      run.state === 'failed'
        ? failures[run.cause]
        : run.state === 'skipped'
          ? skipOf(run.skip)
          : null,
    createdAt: at,
    updatedAt: at,
  }
}

/**
 * The runs of the review routine after its newest 50, which Show older
 * runs adds: an open and a push of each pull request below #453.
 */
const olderReviewRuns: readonly Run[] = Array.from(
  { length: 6 },
  (_, index): Run => {
    const number = 452 - Math.floor(index / 2)
    const event = index % 2 === 0 ? 'pushed' : 'opened'
    return {
      key: `${event}-${number}`,
      trigger: { kind: 'pull-request', event, number },
      state: 'archived',
      when: '3w',
    }
  },
)

/** The run lists that hold older runs than the newest 50. */
const olderRuns: Partial<Record<RunListKey, readonly Run[]>> = {
  review: olderReviewRuns,
  suspended: olderReviewRuns,
}

/** The run list of each routine of the mockups that draws one. */
export const runListOf: Readonly<Record<string, RunListKey>> = {
  'review-prs': 'review',
  'dependency-updates': 'weekly',
  'copy-review': 'owner-left',
  'error-triage': 'turned-off',
}

/** Every run of a routine from a run list of the mockups, newest first. */
export function listRuns(routine: Routine, list: RunListKey): RoutineRun[] {
  const runs = [...runLists[list], ...(olderRuns[list] ?? [])]
  return runs.map((run, index) => apiRun(routine, run, index))
}

/**
 * One page of runs, newest first, as the Worker gives it: the newest 50
 * after the run of `before`, and the cursor of the next older page.
 */
export function runsPage(
  runs: readonly RoutineRun[],
  before: string | null = null,
): RoutineRunsResponse {
  const start = before ? runs.findIndex((run) => run.id === before) + 1 : 0
  const page = runs.slice(start, start + 50)
  const more = runs.length > start + 50
  return { runs: page, nextCursor: more ? (page.at(-1)?.id ?? null) : null }
}
