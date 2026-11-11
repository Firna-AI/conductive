/**
 * The run lists with failed runs, newest first: a failed run for each
 * cause, and the failed runs that turned a routine off (decision 513 B).
 */

import { routines } from './routines'
import { pr, runsOf, turnError, type Run, type RunTrigger } from './routineRuns'

/**
 * A failed run for each cause of the routine that reviews pull requests.
 * The checks of the agent login and of the GitHub access fail a run before
 * it has a workspace. A failed first start and a failed first turn keep
 * their workspace. A run that did not fail comes between them, so no three
 * runs in a row failed, and the routine stays on. The oldest failed run
 * used Codex, before Cal moved the routine to Claude, so its row still
 * names Codex. The run of #485 finished its first turn, and its workspace
 * could not resume later, so it shows the state of that workspace.
 */
export const failedRuns: readonly Run[] = runsOf(routines['review-prs'], [
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
    state: 'ready',
    when: '2h',
  },
  {
    key: 'pushed-486',
    trigger: pr('pushed', 486),
    state: 'failed',
    cause: 'turn',
    message: turnError,
    when: '3h',
  },
  {
    key: 'opened-486',
    trigger: pr('opened', 486),
    state: 'failed',
    cause: 'start',
    when: '4h',
  },
  {
    key: 'opened-485',
    trigger: pr('opened', 485),
    state: 'error',
    when: '6h',
  },
  {
    key: 'pushed-484',
    trigger: pr('pushed', 484),
    state: 'failed',
    cause: 'agent-login',
    agent: 'codex',
    when: '2d',
  },
])

const hourly: RunTrigger = { kind: 'schedule', schedule: 'hourly' }

/**
 * An hourly routine whose last three runs failed, because the Claude login
 * of its owner is not connected, so it turned off. A check failed each of
 * them, so they have no workspace.
 */
export const turnedOffRuns: readonly Run[] = runsOf(routines['error-triage'], [
  {
    key: 'hourly-6',
    trigger: hourly,
    state: 'failed',
    cause: 'agent-login',
    when: '5m',
  },
  {
    key: 'hourly-5',
    trigger: hourly,
    state: 'failed',
    cause: 'agent-login',
    when: '1h',
  },
  {
    key: 'hourly-4',
    trigger: hourly,
    state: 'failed',
    cause: 'agent-login',
    when: '2h',
  },
  { key: 'hourly-3', trigger: hourly, state: 'ready', when: '3h' },
  { key: 'hourly-2', trigger: hourly, state: 'archived', when: '4h' },
  { key: 'hourly-1', trigger: hourly, state: 'archived', when: '5h' },
])
